"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastToTenant = exports.broadcastNewMessage = exports.broadcastAll = exports.initWebSocket = void 0;
const socket_io_1 = require("socket.io");
let io;
const initWebSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: '*', // Allow all origins for MVP, restrict in production
            methods: ['GET', 'POST']
        }
    });
    io.on('connection', (socket) => {
        console.log('New Socket.io connection:', socket.id);
        // Authentication (Optional for MVP, but good practice)
        const token = socket.handshake.auth.token;
        if (token) {
            try {
                // const decoded = jwt.verify(token, process.env.JWT_SECRET!);
                // socket.data.user = decoded;
                // console.log('User authenticated:', decoded);
            }
            catch (err) {
                console.error('Auth failed');
            }
        }
        // Join Tenant Room (Simulated for MVP)
        socket.on('join_tenant', (tenantId) => {
            socket.join(tenantId);
            console.log(`Socket ${socket.id} joined tenant ${tenantId}`);
        });
        socket.on('disconnect', () => {
            console.log('Socket disconnected:', socket.id);
        });
    });
};
exports.initWebSocket = initWebSocket;
const broadcastAll = (data) => {
    if (!io)
        return;
    io.emit('message', data); // Broadcast to everyone (legacy behavior)
};
exports.broadcastAll = broadcastAll;
const broadcastNewMessage = (message) => {
    if (!io)
        return;
    io.emit('new_message', message);
};
exports.broadcastNewMessage = broadcastNewMessage;
const broadcastToTenant = (tenantId, event, data) => {
    if (!io)
        return;
    io.to(tenantId).emit(event, data);
};
exports.broadcastToTenant = broadcastToTenant;
