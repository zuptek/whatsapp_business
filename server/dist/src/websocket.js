"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastAll = exports.broadcastToTenant = exports.initWebSocket = void 0;
const ws_1 = require("ws");
let wss;
const initWebSocket = (server) => {
    wss = new ws_1.WebSocketServer({ server });
    wss.on('connection', (ws, req) => {
        ws.isAlive = true;
        console.log('New WebSocket connection');
        ws.on('pong', () => {
            ws.isAlive = true;
        });
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                if (message.type === 'authenticate') {
                    // TODO: Validate token and set tenantId
                    // const { token } = message;
                    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    // ws.tenantId = decoded.id;
                    console.log('Client authenticated');
                }
            }
            catch (e) {
                console.error('WebSocket message error:', e);
            }
        });
        ws.send(JSON.stringify({ type: 'WELCOME', message: 'Connected to Upgreat WebSocket' }));
    });
    // Heartbeat
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false)
                return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);
    wss.on('close', () => {
        clearInterval(interval);
    });
};
exports.initWebSocket = initWebSocket;
const broadcastToTenant = (tenantId, data) => {
    if (!wss)
        return;
    wss.clients.forEach((client) => {
        // For MVP, if no tenantId logic is strict yet, we might broadcast to all or check if client.tenantId matches
        if (client.readyState === ws_1.WebSocket.OPEN) {
            // if (client.tenantId === tenantId) { 
            client.send(JSON.stringify(data));
            // }
        }
    });
};
exports.broadcastToTenant = broadcastToTenant;
const broadcastAll = (data) => {
    if (!wss)
        return;
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};
exports.broadcastAll = broadcastAll;
