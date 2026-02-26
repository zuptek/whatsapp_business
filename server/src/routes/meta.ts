import express from 'express';
import axios from 'axios';
import { db } from '../db';
import { tenants, phoneNumbers } from '../db/schema';
import { encrypt } from '../utils/encryption';
import { eq } from 'drizzle-orm';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

const META_API_VERSION = 'v18.0';
const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;

// PROTECTED: Connect WhatsApp Account
router.post('/callback', authenticateUser, async (req: AuthenticatedRequest, res) => {
    const { code, redirect_uri } = req.body;
    const { tenantId } = req.user!;

    if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
    }

    try {
        // 1. Exchange code for access token
        const tokenResponse = await axios.get(
            `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`,
            {
                params: {
                    client_id: APP_ID,
                    client_secret: APP_SECRET,
                    code: code,
                    redirect_uri: redirect_uri || `${req.get('origin')}/whatsapp-callback`
                },
            }
        );

        const { access_token } = tokenResponse.data;

        // 2. Get Debug Token to find WABA ID
        const debugTokenResponse = await axios.get(
            `https://graph.facebook.com/${META_API_VERSION}/debug_token`, {
            params: {
                input_token: access_token,
                access_token: `${APP_ID}|${APP_SECRET}`
            }
        }
        );

        const wabaId = debugTokenResponse.data.data.granular_scopes[0].target_ids[0]; // Simplified

        // 3. Get Phone Numbers associated with WABA
        // We need to fetch the phone numbers from WABA
        // GET /<waba_id>/phone_numbers?access_token=<token>
        const phoneNumbersResponse = await axios.get(
            `https://graph.facebook.com/${META_API_VERSION}/${wabaId}/phone_numbers`,
            {
                params: { access_token }
            }
        );

        const numbers = phoneNumbersResponse.data.data;
        // Array of { id, verified_name, display_phone_number, quality_rating, ... }

        if (!numbers || numbers.length === 0) {
            return res.status(400).json({ error: 'No phone numbers found for this WhatsApp Business Account' });
        }

        // 4. Update Tenant with WABA ID and Access Token (System User Token preferred, but using this for MVP)
        const encryptedToken = JSON.stringify(encrypt(access_token));

        await db.update(tenants)
            .set({
                wabaId,
                accessToken: encryptedToken
            })
            .where(eq(tenants.id, tenantId));

        // 5. Insert Phone Numbers
        const insertedNumbers = [];
        for (const num of numbers) {
            const [inserted] = await db.insert(phoneNumbers)
                .values({
                    tenantId,
                    phoneNumberId: num.id,
                    telNumber: num.display_phone_number,
                    name: num.verified_name || num.display_phone_number,
                })
                .onConflictDoUpdate({
                    target: phoneNumbers.phoneNumberId,
                    set: {
                        name: num.verified_name || num.display_phone_number,
                        telNumber: num.display_phone_number
                    }
                })
                .returning();
            insertedNumbers.push(inserted);
        }

        res.json({ message: 'WhatsApp Account Connected', phoneNumbers: insertedNumbers });

    } catch (error: any) {
        console.error('Meta Auth Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to connect WhatsApp account' });
    }
});

export default router;
