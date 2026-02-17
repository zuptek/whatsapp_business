import express from 'express';
import axios from 'axios';
import { db } from '../db';
import { tenants, messages, conversations, phoneNumbers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '../utils/encryption';
import { broadcastToTenant } from '../websocket';

const router = express.Router();

router.post('/send', async (req, res) => {
    const { tenantId, to, text, type = 'text', mediaUrl, interactiveButtons, template } = req.body;
    // In a real app, tenantId should come from the authenticated user's session/token

    if (!tenantId || !to) {
        return res.status(400).json({ error: 'Missing tenantId or to' });
    }

    if (!text && !mediaUrl && !interactiveButtons && !template) {
        return res.status(400).json({ error: 'Missing message content' });
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

        // 1.5 Get Phone Number (Default to first one for now)
        const [funcNumber] = await db
            .select()
            .from(phoneNumbers)
            .where(eq(phoneNumbers.tenantId, tenant.id))
            .limit(1);

        if (!funcNumber) {
            return res.status(400).json({ error: 'No phone number connected' });
        }

        // 2. Decrypt Access Token
        const accessToken = decrypt(JSON.parse(tenant.accessToken));

        // 3. Prepare message payload based on type
        let messagePayload: any = {
            messaging_product: 'whatsapp',
            to: to,
        };

        let messageContent = text || '';
        let messageType = type;

        if (type === 'text' && text) {
            messagePayload.type = 'text';
            messagePayload.text = { body: text };
            messageContent = text;
        } else if (type === 'image' && mediaUrl) {
            messagePayload.type = 'image';
            messagePayload.image = {
                link: mediaUrl,
                caption: text || '',
            };
            messageContent = text || 'Image';
        } else if (type === 'template' && template) {
            messagePayload.type = 'template';
            messagePayload.template = {
                name: template.name,
                language: { code: template.language || 'en_US' },
                components: template.components || []
            };
            messageContent = `Template: ${template.name}`;
            messageType = 'template';
        } else if (type === 'interactive' && interactiveButtons) {
            messagePayload.type = 'interactive';
            messagePayload.interactive = {
                type: 'button',
                body: {
                    text: text || 'Please select an option',
                },
                action: {
                    buttons: interactiveButtons.map((btn: any, idx: number) => ({
                        type: 'reply',
                        reply: {
                            id: btn.id || `btn_${idx}`,
                            title: btn.title,
                        },
                    })),
                },
            };
            messageContent = text || 'Interactive message';
            messageType = 'interactive';
        } else {
            return res.status(400).json({ error: 'Invalid message type or missing required fields' });
        }

        // 4. Send to Meta
        let whatsappMessageId = 'mock_wamid_' + Date.now(); // Default mock ID

        // Check if this is a Dev Tenant
        const isDevTenant = tenant.wabaId && tenant.wabaId.startsWith('DEV_');

        if (!isDevTenant) {
            try {
                const metaResponse = await axios.post(
                    `https://graph.facebook.com/v18.0/${funcNumber.phoneNumberId}/messages`,
                    messagePayload,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );
                whatsappMessageId = metaResponse.data.messages[0].id;
            } catch (apiError: any) {
                console.error('Meta API Error:', apiError.response?.data || apiError.message);
                throw new Error('Failed to send message to WhatsApp API');
            }
        } else {
            console.log('Dev Mode: Simulating message send to', to);
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 5. Persist to DB
        // a. Find or Create Conversation
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
                lastMessage: messageContent,
                unreadCount: 0,
            }).returning();
        } else {
            await db.update(conversations)
                .set({
                    lastMessage: messageContent,
                    updatedAt: new Date()
                })
                .where(eq(conversations.id, conversation.id));
        }

        // b. Insert Message
        const [newMessage] = await db.insert(messages).values({
            conversationId: conversation.id,
            content: messageContent,
            type: messageType,
            direction: 'outbound',
            status: 'sent',
            mediaUrl: mediaUrl || null,
            interactiveData: interactiveButtons ? { buttons: interactiveButtons } : null,
        }).returning();

        // 6. Broadcast to tenant room via Socket.io
        broadcastToTenant(tenant.id, 'new_message', {
            ...newMessage,
            conversationId: conversation.id,
        });

        // Also broadcast conversation update
        broadcastToTenant(tenant.id, 'conversation_updated', {
            ...conversation,
            lastMessage: messageContent,
            updatedAt: new Date(),
        });

        res.json({ success: true, messageId: whatsappMessageId, dbMessage: newMessage });

    } catch (error: any) {
        console.error('Send Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

export default router;

