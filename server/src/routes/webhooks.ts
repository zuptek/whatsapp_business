import express from 'express';

import { broadcastNewMessage } from '../websocket';

const router = express.Router();

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
router.post('/whatsapp', (req, res) => {
    const body = req.body;

    // Check if this is an event from a page subscription
    if (body.object === 'whatsapp_business_account') {
        body.entry?.forEach((entry: any) => {
            entry.changes?.forEach((change: any) => {
                if (change.value.messages) {
                    const messages = change.value.messages;
                    messages.forEach((message: any) => {
                        console.log('Received message:', JSON.stringify(message, null, 2));

                        // Persist to DB
                        const from = message.from;
                        const text = message.text?.body || 'Media message';
                        // In real app, find tenant ID from WABA ID in payload
                        // For MVP, if we only have one tenant or strict mapping, we can try to find tenant by waba_id.
                        // But for now, let's assume we find the tenant. 
                        // Simplified: Let's just broadcast and assume client handles display for now OR do basic DB insert if we can find tenant.

                        // Broadcast to connected clients
                        broadcastNewMessage(message);
                    });
                }
            });
        });

        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

export default router;
