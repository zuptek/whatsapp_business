import express from 'express';
import axios from 'axios';
import { db } from '../db';
import { tenants, messages, conversations } from '../db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '../utils/encryption';

const router = express.Router();

router.post('/send', async (req, res) => {
    const { tenantId, to, text } = req.body;
    // In a real app, tenantId should come from the authenticated user's session/token

    if (!tenantId || !to || !text) {
        return res.status(400).json({ error: 'Missing tenantId, to, or text' });
    }

    try {
        // 1. Get Tenant Details
        const [tenant] = await db
            .select()
            .from(tenants)
            .where(eq(tenants.id, tenantId))
            .limit(1);

        if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        // 2. Decrypt Access Token
        const accessToken = decrypt(JSON.parse(tenant.accessToken));

        // 3. Send to Meta
        const metaResponse = await axios.post(
            `https://graph.facebook.com/v18.0/${tenant.phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                text: { body: text },
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const whatsappMessageId = metaResponse.data.messages[0].id;

        // 4. Persist to DB
        // a. Find or Create Conversation
        // For MVP, simplistic look up by contactPhone. 
        // Ideally we match complex criteria or Upsert.
        let [conversation] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.contactPhone, to))
            .limit(1);

        if (!conversation) {
            [conversation] = await db.insert(conversations).values({
                tenantId: tenant.id,
                contactPhone: to,
                contactName: to, // Default to phone if no name
                lastMessage: text,
                unreadCount: 0,
            }).returning();
        } else {
            await db.update(conversations)
                .set({
                    lastMessage: text,
                    updatedAt: new Date()
                })
                .where(eq(conversations.id, conversation.id));
        }

        // b. Insert Message
        const [newMessage] = await db.insert(messages).values({
            conversationId: conversation.id,
            content: text,
            type: 'text',
            direction: 'outbound',
            status: 'sent',
        }).returning();

        res.json({ success: true, messageId: whatsappMessageId, dbMessage: newMessage });

    } catch (error: any) {
        console.error('Send Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

export default router;
