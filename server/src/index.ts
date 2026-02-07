import express from 'express';
import http from 'http';
import { initWebSocket } from './websocket';
import authRoutes from './routes/auth';
import webhookRoutes from './routes/webhooks';
import messageRoutes from './routes/messages';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/messages', messageRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket
initWebSocket(server);

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
