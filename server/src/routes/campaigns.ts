import express from 'express';
import { db } from '../db';
import { tenants, campaigns, campaignAudiences } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { broadcastQueue } from '../jobs/broadcastQueue';

const router = express.Router();

// Create Campaign & Dispatch Jobs
router.post('/', async (req, res) => {
    const { tenantId, name, templateId, templateName, components, language, contacts } = req.body;
    // contacts array: [{ phone, name }]

    if (!tenantId || !templateId || !contacts || !Array.isArray(contacts)) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // 1. Create Campaign
        const [campaign] = await db.insert(campaigns).values({
            tenantId,
            name,
            templateId,
            status: 'processing'
        }).returning();

        // 2. Insert Audiences
        // We'll insert in chunks if large, but for now simple map
        const audienceRecords = contacts.map((c: any) => ({
            campaignId: campaign.id,
            contactPhone: c.phone,
            contactName: c.name,
            status: 'pending'
        }));

        const audiences = await db.insert(campaignAudiences).values(audienceRecords).returning();

        // 3. Dispatch Jobs
        const jobs = audiences.map(aud => ({
            name: 'send_template',
            data: {
                campaignId: campaign.id,
                audienceId: aud.id,
                tenantId,
                templateName,
                components,
                language
            }
        }));

        await broadcastQueue.addBulk(jobs);

        res.json({ success: true, campaignId: campaign.id, count: jobs.length });

    } catch (error: any) {
        console.error('Campaign Creation Error:', error.message);
        res.status(500).json({ error: 'Failed to create campaign' });
    }
});

// List Campaigns
router.get('/', async (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenantId' });

    try {
        const results = await db.select().from(campaigns)
            .where(eq(campaigns.tenantId, tenantId as string))
            .orderBy(desc(campaigns.createdAt));

        res.json(results);
    } catch (error: any) {
        console.error('Campaign List Error:', error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});

export default router;
