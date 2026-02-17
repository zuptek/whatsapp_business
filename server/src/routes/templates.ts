import express from 'express';
import axios from 'axios';
import { db } from '../db';
import { tenants, templates } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '../utils/encryption';

const router = express.Router();

// Get Templates (Sync & Fetch)
router.get('/', async (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenantId' });

    try {
        const [tenant] = await db.select()
            .from(tenants)
            .where(eq(tenants.id, tenantId as string))
            .limit(1);

        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        // Fetch from Meta or Mock
        let metaTemplates: any[] = [];
        if (tenant.wabaId.startsWith('DEV_')) {
            metaTemplates = [
                {
                    name: 'hello_world',
                    language: 'en_US',
                    status: 'APPROVED',
                    category: 'UTILITY',
                    components: [{ type: 'BODY', text: 'Hello World' }]
                },
                {
                    name: 'shipping_update',
                    language: 'en_US',
                    status: 'APPROVED',
                    category: 'UTILITY',
                    components: [{ type: 'BODY', text: 'Your package is on the way!' }]
                },
                {
                    name: 'seasonal_promo',
                    language: 'en_US',
                    status: 'APPROVED',
                    category: 'MARKETING',
                    components: [{ type: 'BODY', text: 'Enjoy {{1}}% off regarding our summer sale!' }]
                }
            ];
        } else {
            // Handle accessToken - it might be stored as plain text or JSON string
            let accessToken: string;
            try {
                // Try to parse if it's a JSON string
                if (tenant.accessToken.startsWith('{') || tenant.accessToken.startsWith('"')) {
                    accessToken = decrypt(JSON.parse(tenant.accessToken));
                } else {
                    // It's already a plain string
                    accessToken = tenant.accessToken;
                }
            } catch (parseError) {
                console.error('Access token parse error:', parseError);
                // Fall back to using it as-is
                accessToken = tenant.accessToken;
            }

            try {
                const response = await axios.get(
                    `https://graph.facebook.com/v18.0/${tenant.wabaId}/message_templates`,
                    {
                        headers: { Authorization: `Bearer ${accessToken}` },
                        params: { limit: 100 }
                    }
                );
                metaTemplates = response.data.data;
            } catch (error: any) {
                console.error('Meta API Error:', error.response?.data || error.message);
                // If meta fetch fails, we still return DB templates but warn
            }
        }

        // Sync to DB
        // We use a loop for now, but batch upsert would be better if we had a dedicated composite key constraint
        for (const t of metaTemplates) {
            const [existing] = await db.select()
                .from(templates)
                .where(and(
                    eq(templates.tenantId, tenant.id),
                    eq(templates.name, t.name),
                    eq(templates.language, t.language)
                ))
                .limit(1);

            if (existing) {
                // Update if status changed
                if (existing.status !== t.status) {
                    await db.update(templates)
                        .set({
                            status: t.status,
                            components: t.components || [],
                            rawBody: t,
                            updatedAt: new Date()
                        })
                        .where(eq(templates.id, existing.id));
                }
            } else {
                // Insert new
                await db.insert(templates).values({
                    tenantId: tenant.id,
                    name: t.name,
                    language: t.language || 'en_US',
                    status: t.status,
                    category: t.category,
                    components: t.components || [],
                    rawBody: t
                });
            }
        }

        // Return all templates from DB
        const allTemplates = await db.select()
            .from(templates)
            .where(eq(templates.tenantId, tenant.id));

        res.json({ templates: allTemplates });
    } catch (error: any) {
        console.error('Template Sync Error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });

        // Return cached templates even if sync fails
        try {
            const cachedTemplates = await db.select()
                .from(templates)
                .where(eq(templates.tenantId, tenantId as string));

            res.json({
                templates: cachedTemplates,
                warning: 'Using cached templates - sync failed'
            });
        } catch (dbError) {
            res.status(500).json({ error: 'Failed to sync templates and no cache available' });
        }
    }
});

export default router;
