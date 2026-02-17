import express from 'express';
import { db } from '../db';
import { tenants, phoneNumbers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// Get settings (Tenant Info + Phone Numbers)
// PROTECTED
router.get('/', authenticateUser, async (req: any, res) => {
    const { tenantId } = req.user;

    try {
        const [tenant] = await db.select()
            .from(tenants)
            .where(eq(tenants.id, tenantId))
            .limit(1);

        if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        const numbers = await db.select()
            .from(phoneNumbers)
            .where(eq(phoneNumbers.tenantId, tenantId));

        res.json({
            tenant: {
                id: tenant.id,
                businessName: tenant.businessName,
                wabaId: tenant.wabaId
            },
            phoneNumbers: numbers.map(n => ({
                id: n.id,
                phoneNumberId: n.phoneNumberId,
                telNumber: n.telNumber,
                name: n.name,
                autoResponseConfig: n.autoResponseConfig
            }))
        });

    } catch (error: any) {
        console.error('Settings fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update Phone Number Config
router.put('/phone/:phoneNumberId', authenticateUser, async (req: any, res) => {
    const { tenantId } = req.user;
    const { phoneNumberId } = req.params; // This is the DB ID (uuid), not Meta ID, or maybe Meta ID?
    // references `phoneNumbers.id` (uuid)
    const config = req.body;

    try {
        // Verify ownership
        const [funcNumber] = await db.select()
            .from(phoneNumbers)
            .where(eq(phoneNumbers.id, phoneNumberId))
            .limit(1);

        if (!funcNumber || funcNumber.tenantId !== tenantId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const [updated] = await db.update(phoneNumbers)
            .set({ autoResponseConfig: config })
            .where(eq(phoneNumbers.id, phoneNumberId))
            .returning();

        res.json({ success: true, config: updated.autoResponseConfig });
    } catch (error: any) {
        console.error('Settings update error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

export default router;
