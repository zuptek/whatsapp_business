import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: Server;

export const initWebSocket = (server: HttpServer) => {
    io = new Server(server, {
        cors: {
            origin: '*', // Allow all origins for MVP, restrict in production
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket: Socket) => {
        console.log('New Socket.io connection:', socket.id);

        // Authentication (Optional for MVP, but good practice)
        const token = socket.handshake.auth.token;
        if (token) {
            try {
                // const decoded = jwt.verify(token, process.env.JWT_SECRET!);
                // socket.data.user = decoded;
                // console.log('User authenticated:', decoded);
            } catch (err) {
                console.error('Auth failed');
            }
        }

        // Join Tenant Room (Simulated for MVP)
        socket.on('join_tenant', (tenantId: string) => {
            socket.join(tenantId);
            console.log(`Socket ${socket.id} joined tenant ${tenantId}`);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected:', socket.id);
        });
    });
};

export const broadcastAll = (data: any) => {
    if (!io) return;
    io.emit('message', data); // Broadcast to everyone (legacy behavior)
};

export const broadcastNewMessage = (message: any) => {
    if (!io) return;
    io.emit('new_message', message);
};

export const broadcastToTenant = (tenantId: string, event: string, data: any) => {
    if (!io) return;
    io.to(tenantId).emit(event, data);
};
