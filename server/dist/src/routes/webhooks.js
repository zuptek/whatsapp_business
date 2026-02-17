"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const websocket_1 = require("../websocket");
const router = express_1.default.Router();
// Meta Webhook Verification
router.get('/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'upgreat_webhook_verify_token';
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook Verification Successful');
        res.status(200).send(challenge);
    }
    else {
        res.sendStatus(403);
    }
});
// Meta Webhook Event Handling
router.post('/whatsapp', async (req, res) => {
    const body = req.body;
    // Check if this is an event from a page subscription
    if (body.object === 'whatsapp_business_account') {
        try {
            for (const entry of body.entry || []) {
                for (const change of entry.changes || []) {
                    if (change.value.messages) {
                        const incomingMessages = change.value.messages;
                        const metadata = change.value.metadata;
                        // Find tenant by phone_number_id
                        const [tenant] = await db_1.db
                            .select()
                            .from(schema_1.tenants)
                            .where((0, drizzle_orm_1.eq)(schema_1.tenants.phoneNumberId, metadata.phone_number_id))
                            .limit(1);
                        if (!tenant) {
                            console.error('Tenant not found for phone_number_id:', metadata.phone_number_id);
                            continue;
                        }
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
                            }
                            else if (message.type === 'image') {
                                messageContent = message.image?.caption || 'Image';
                                mediaUrl = message.image?.id; // Store media ID, can be downloaded later
                                messageType = 'image';
                            }
                            else if (message.type === 'video') {
                                messageContent = message.video?.caption || 'Video';
                                mediaUrl = message.video?.id;
                                messageType = 'video';
                            }
                            else if (message.type === 'audio') {
                                messageContent = 'Audio message';
                                mediaUrl = message.audio?.id;
                                messageType = 'audio';
                            }
                            else if (message.type === 'document') {
                                messageContent = message.document?.filename || 'Document';
                                mediaUrl = message.document?.id;
                                messageType = 'document';
                            }
                            else if (message.type === 'interactive') {
                                // Handle button responses
                                messageContent = message.interactive?.button_reply?.title ||
                                    message.interactive?.list_reply?.title ||
                                    'Interactive response';
                                interactiveData = message.interactive;
                                messageType = 'interactive';
                            }
                            else {
                                messageContent = 'Unsupported message type';
                            }
                            // Find or create conversation
                            let [conversation] = await db_1.db
                                .select()
                                .from(schema_1.conversations)
                                .where((0, drizzle_orm_1.eq)(schema_1.conversations.contactPhone, from))
                                .limit(1);
                            if (!conversation) {
                                [conversation] = await db_1.db.insert(schema_1.conversations).values({
                                    tenantId: tenant.id,
                                    contactPhone: from,
                                    contactName: change.value.contacts?.[0]?.profile?.name || from,
                                    lastMessage: messageContent,
                                    unreadCount: 1,
                                }).returning();
                            }
                            else {
                                // Update conversation
                                await db_1.db.update(schema_1.conversations)
                                    .set({
                                    lastMessage: messageContent,
                                    unreadCount: (conversation.unreadCount || 0) + 1,
                                    updatedAt: new Date(),
                                })
                                    .where((0, drizzle_orm_1.eq)(schema_1.conversations.id, conversation.id));
                            }
                            // Insert message into database
                            const [newMessage] = await db_1.db.insert(schema_1.messages).values({
                                conversationId: conversation.id,
                                content: messageContent,
                                type: messageType,
                                direction: 'inbound',
                                status: 'received',
                                mediaUrl,
                                interactiveData,
                            }).returning();
                            // Broadcast to tenant room via Socket.io
                            (0, websocket_1.broadcastToTenant)(tenant.id, 'new_message', {
                                ...newMessage,
                                conversationId: conversation.id,
                            });
                            // Also broadcast conversation update
                            (0, websocket_1.broadcastToTenant)(tenant.id, 'conversation_updated', {
                                ...conversation,
                                lastMessage: messageContent,
                                unreadCount: (conversation.unreadCount || 0) + 1,
                                updatedAt: new Date(),
                            });
                        }
                    }
                }
            }
            res.sendStatus(200);
        }
        catch (error) {
            console.error('Webhook Processing Error:', error.message);
            res.sendStatus(500);
        }
    }
    else {
        res.sendStatus(404);
    }
});
exports.default = router;
