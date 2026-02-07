"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
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
router.post('/whatsapp', (req, res) => {
    const body = req.body;
    // Check if this is an event from a page subscription
    if (body.object === 'whatsapp_business_account') {
        body.entry?.forEach((entry) => {
            entry.changes?.forEach((change) => {
                if (change.value.messages) {
                    const messages = change.value.messages;
                    messages.forEach((message) => {
                        console.log('Received message:', JSON.stringify(message, null, 2));
                        // Broadcast to connected clients
                        (0, websocket_1.broadcastAll)({ type: 'NEW_MESSAGE', payload: message });
                    });
                }
            });
        });
        res.sendStatus(200);
    }
    else {
        res.sendStatus(404);
    }
});
exports.default = router;
