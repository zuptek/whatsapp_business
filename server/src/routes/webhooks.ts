import express from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { tenants, conversations, messages, phoneNumbers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { broadcastToTenant } from '../websocket';
import axios from 'axios';
import { decrypt } from '../utils/encryption';

const router = express.Router();

// Helper: Check if this is the first message from a contact
async function isFirstMessage(conversationId: string): Promise<boolean> {
    const messageCount = await db.select().from(messages).where(eq(messages.conversationId, conversationId));
    return messageCount.length <= 1; // Only the message we just inserted
}

// Helper: Check if current time is outside business hours
function isOutsideBusinessHours(config: any): boolean {
    if (!config?.businessHours) return false;

    const now = new Date();
    const timezone = config.businessHours.timezone || 'Asia/Kolkata';
    const currentTime = now.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
    const currentDay = now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'short' });

    const start = config.businessHours.start || '09:00';
    const end = config.businessHours.end || '18:00';
    const workDays = config.businessHours.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    if (!workDays.includes(currentDay)) return true;
    if (currentTime < start || currentTime > end) return true;

    return false;
}

// Helper: Send auto-response message
async function sendAutoResponse(tenant: any, to: string, message: string) {
    try {
        // Decrypt access token
        const encryptedToken = JSON.parse(tenant.accessToken);
        const accessToken = decrypt(encryptedToken);

        // Check if dev mode
        const isDevTenant = tenant.wabaId.startsWith('DEV_');

        if (isDevTenant) {
            console.log(`[DEV MODE] Auto-response to ${to}: ${message}`);
            return; // Don't actually send in dev mode
        }

        // Send via Meta API
        const response = await axios.post(
            `https://graph.facebook.com/v18.0/${tenant.phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                type: 'text',
                text: { body: message }
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`Auto-response sent to ${to}:`, response.data);
    } catch (error: any) {
        console.error('Auto-response send error:', error.response?.data || error.message);
    }
}


// Meta Webhook Verification
router.get('/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'upgreat_webhook_verify_token';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook Verification Successful');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Meta Webhook Event Handling
router.post('/whatsapp', async (req: any, res) => {
    const body = req.body;
    const signature = req.headers['x-hub-signature-256'];
    const appSecret = process.env.META_APP_SECRET;

    // 1. Verify X-Hub-Signature
    if (appSecret) {
        if (!signature) {
            console.warn('Missing X-Hub-Signature-256 header');
            // Depending on strictness, return 401 or just log
            return res.sendStatus(401);
        }

        const hmac = crypto.createHmac('sha256', appSecret);
        const digest = Buffer.from('sha256=' + hmac.update(req.rawBody).digest('hex'), 'utf8');
        const checksum = Buffer.from(signature as string, 'utf8');

        if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
            console.error('Invalid X-Hub-Signature');
            return res.sendStatus(401);
        }
    } else {
        console.warn('META_APP_SECRET not set, skipping signature verification');
    }

    // Check if this is an event from a page subscription
    if (body.object === 'whatsapp_business_account') {
        try {
            for (const entry of body.entry || []) {
                // 2. Parse WABA_ID to identify tenant
                const wabaId = entry.id;

                const [tenant] = await db
                    .select()
                    .from(tenants)
                    .where(eq(tenants.wabaId, wabaId))
                    .limit(1);

                if (!tenant) {
                    console.error('Tenant not found for WABA_ID:', wabaId);
                    continue;
                }

                for (const change of entry.changes || []) {
                    if (change.value.messages) {
                        const incomingMessages = change.value.messages;

                        for (const message of incomingMessages) {
                            console.log('Received message:', JSON.stringify(message, null, 2));

                            const from = message.from;
                            let messageContent = '';
                            let messageType = 'text';
                            let mediaUrl = null;
                            let interactiveData = null;

                            // Extract message content based on type
                            if (message.type === 'text') {
                                messageContent = message.text?.body || '';
                                messageType = 'text';
                            } else if (message.type === 'image') {
                                messageContent = message.image?.caption || 'Image';
                                mediaUrl = message.image?.id;
                                messageType = 'image';
                            } else if (message.type === 'video') {
                                messageContent = message.video?.caption || 'Video';
                                mediaUrl = message.video?.id;
                                messageType = 'video';
                            } else if (message.type === 'audio') {
                                messageContent = 'Audio message';
                                mediaUrl = message.audio?.id;
                                messageType = 'audio';
                            } else if (message.type === 'document') {
                                messageContent = message.document?.filename || 'Document';
                                mediaUrl = message.document?.id;
                                messageType = 'document';
                            } else if (message.type === 'interactive') {
                                messageContent = message.interactive?.button_reply?.title ||
                                    message.interactive?.list_reply?.title ||
                                    'Interactive response';
                                interactiveData = message.interactive;
                                messageType = 'interactive';
                            } else {
                                messageContent = 'Unsupported message type';
                            }

                            // 3. Save message to conversations/messages tables
                            let [conversation] = await db
                                .select()
                                .from(conversations)
                                .where(eq(conversations.contactPhone, from))
                                .limit(1);

                            if (!conversation) {
                                [conversation] = await db.insert(conversations).values({
                                    tenantId: tenant.id,
                                    contactPhone: from,
                                    contactName: change.value.contacts?.[0]?.profile?.name || from,
                                    lastMessage: messageContent,
                                    unreadCount: 1,
                                }).returning();
                            } else {
                                await db.update(conversations)
                                    .set({
                                        lastMessage: messageContent,
                                        unreadCount: (conversation.unreadCount || 0) + 1,
                                        updatedAt: new Date(),
                                    })
                                    .where(eq(conversations.id, conversation.id));
                            }

                            const [newMessage] = await db.insert(messages).values({
                                conversationId: conversation.id,
                                content: messageContent,
                                type: messageType,
                                direction: 'inbound',
                                status: 'received',
                                mediaUrl,
                                interactiveData,
                            }).returning();

                            // 4. Broadcast via Socket.io to specific tenant room
                            broadcastToTenant(tenant.id, 'new_message', {
                                ...newMessage,
                                conversationId: conversation.id,
                            });

                            broadcastToTenant(tenant.id, 'conversation_updated', {
                                ...conversation,
                                lastMessage: messageContent,
                                unreadCount: (conversation.unreadCount || 0) + 1,
                                updatedAt: new Date(),
                            });

                            // 5. Check for auto-responses
                            // Find the specific phone number config
                            const waPhoneId = change.value.metadata?.phone_number_id;
                            if (waPhoneId) {
                                const [phoneNumber] = await db.select()
                                    .from(phoneNumbers)
                                    .where(eq(phoneNumbers.phoneNumberId, waPhoneId))
                                    .limit(1);

                                if (phoneNumber) {
                                    const config: any = phoneNumber.autoResponseConfig;

                                    if (config) {
                                        const firstMessage = await isFirstMessage(conversation.id);

                                        // Send Welcome message if enabled and this is first contact
                                        if (config.welcomeEnabled && firstMessage) {
                                            await sendAutoResponse(tenant, from, config.welcomeMessage);
                                            console.log(`[AUTO-RESPONSE] Welcome message sent to ${from}`);
                                        }

                                        // Send Away message if enabled and outside business hours
                                        if (config.awayEnabled && isOutsideBusinessHours(config)) {
                                            await sendAutoResponse(tenant, from, config.awayMessage);
                                            console.log(`[AUTO-RESPONSE] Away message sent to ${from}`);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            res.sendStatus(200);
        } catch (error: any) {
            console.error('Webhook Processing Error:', error.message);
            res.sendStatus(500);
        }
    } else {
        res.sendStatus(404);
    }
});

// SIMULATION ENDPOINT (Dev only)
router.post('/simulate', async (req, res) => {
    try {
        const { text, from, tenantId } = req.body;

        let tenant;
        if (tenantId) {
            [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
        } else {
            // Fallback to dev tenant
            const wabaId = 'DEV_WABA_ID_123';
            [tenant] = await db.select().from(tenants).where(eq(tenants.wabaId, wabaId)).limit(1);
        }

        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        // Get a phone number for this tenant to link conversation (optional but good for future)
        // const [phone] = await db.select().from(phoneNumbers).where(eq(phoneNumbers.tenantId, tenant.id)).limit(1);

        // 2. Create/Find Conversation
        const contactPhone = from || '15551234567';
        let [conversation] = await db.select().from(conversations).where(eq(conversations.contactPhone, contactPhone)).limit(1);

        if (!conversation) {
            [conversation] = await db.insert(conversations).values({
                tenantId: tenant.id,
                contactPhone,
                contactName: 'Test User',
                lastMessage: text,
                unreadCount: 1,
            }).returning();
        } else {
            await db.update(conversations).set({
                lastMessage: text,
                unreadCount: (conversation.unreadCount || 0) + 1,
                updatedAt: new Date()
            }).where(eq(conversations.id, conversation.id));
        }

        // 3. Insert Message
        const [newMessage] = await db.insert(messages).values({
            conversationId: conversation.id,
            content: text || 'Hello world!',
            type: 'text',
            direction: 'inbound',
            status: 'received',
        }).returning();

        // 4. Broadcast
        broadcastToTenant(tenant.id, 'new_message', {
            ...newMessage,
            conversationId: conversation.id,
        });

        broadcastToTenant(tenant.id, 'conversation_updated', {
            ...conversation,
            lastMessage: text,
            unreadCount: (conversation.unreadCount || 0) + 1,
            updatedAt: new Date(),
        });

        res.json({ success: true, message: newMessage });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
