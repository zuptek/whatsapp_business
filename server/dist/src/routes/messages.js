"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const encryption_1 = require("../utils/encryption");
const websocket_1 = require("../websocket");
const router = express_1.default.Router();
router.post('/send', async (req, res) => {
    const { tenantId, to, text, type = 'text', mediaUrl, interactiveButtons } = req.body;
    // In a real app, tenantId should come from the authenticated user's session/token
    if (!tenantId || !to) {
        return res.status(400).json({ error: 'Missing tenantId or to' });
    }
    if (!text && !mediaUrl && !interactiveButtons) {
        return res.status(400).json({ error: 'Missing message content' });
    }
    try {
        // 1. Get Tenant Details
        const [tenant] = await db_1.db
            .select()
            .from(schema_1.tenants)
            .where((0, drizzle_orm_1.eq)(schema_1.tenants.id, tenantId))
            .limit(1);
        if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found' });
        }
        // 2. Decrypt Access Token
        const accessToken = (0, encryption_1.decrypt)(JSON.parse(tenant.accessToken));
        // 3. Prepare message payload based on type
        let messagePayload = {
            messaging_product: 'whatsapp',
            to: to,
        };
        let messageContent = text || '';
        let messageType = type;
        if (type === 'text' && text) {
            messagePayload.text = { body: text };
            messageContent = text;
        }
        else if (type === 'image' && mediaUrl) {
            messagePayload.type = 'image';
            messagePayload.image = {
                link: mediaUrl,
                caption: text || '',
            };
            messageContent = text || 'Image';
        }
        else if (type === 'interactive' && interactiveButtons) {
            messagePayload.type = 'interactive';
            messagePayload.interactive = {
                type: 'button',
                body: {
                    text: text || 'Please select an option',
                },
                action: {
                    buttons: interactiveButtons.map((btn, idx) => ({
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
        }
        else {
            return res.status(400).json({ error: 'Invalid message type or missing required fields' });
        }
        // 4. Send to Meta
        const metaResponse = await axios_1.default.post(`https://graph.facebook.com/v18.0/${tenant.phoneNumberId}/messages`, messagePayload, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        const whatsappMessageId = metaResponse.data.messages[0].id;
        // 5. Persist to DB
        // a. Find or Create Conversation
        let [conversation] = await db_1.db
            .select()
            .from(schema_1.conversations)
            .where((0, drizzle_orm_1.eq)(schema_1.conversations.contactPhone, to))
            .limit(1);
        if (!conversation) {
            [conversation] = await db_1.db.insert(schema_1.conversations).values({
                tenantId: tenant.id,
                contactPhone: to,
                contactName: to, // Default to phone if no name
                lastMessage: messageContent,
                unreadCount: 0,
            }).returning();
        }
        else {
            await db_1.db.update(schema_1.conversations)
                .set({
                lastMessage: messageContent,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.eq)(schema_1.conversations.id, conversation.id));
        }
        // b. Insert Message
        const [newMessage] = await db_1.db.insert(schema_1.messages).values({
            conversationId: conversation.id,
            content: messageContent,
            type: messageType,
            direction: 'outbound',
            status: 'sent',
            mediaUrl: mediaUrl || null,
            interactiveData: interactiveButtons ? { buttons: interactiveButtons } : null,
        }).returning();
        // 6. Broadcast to tenant room via Socket.io
        (0, websocket_1.broadcastToTenant)(tenant.id, 'new_message', {
            ...newMessage,
            conversationId: conversation.id,
        });
        // Also broadcast conversation update
        (0, websocket_1.broadcastToTenant)(tenant.id, 'conversation_updated', {
            ...conversation,
            lastMessage: messageContent,
            updatedAt: new Date(),
        });
        res.json({ success: true, messageId: whatsappMessageId, dbMessage: newMessage });
    }
    catch (error) {
        console.error('Send Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to send message' });
    }
});
exports.default = router;
