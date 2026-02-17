import express from 'express';
import http from 'http';
import { initWebSocket } from './websocket';
import cors from 'cors';
import metaRoutes from './routes/meta';
import userAuthRoutes from './routes/userAuth';
import webhookRoutes from './routes/webhooks';
import messageRoutes from './routes/messages';
import conversationRoutes from './routes/conversations';
import templatesRoutes from './routes/templates';
import campaignsRoutes from './routes/campaigns';
import settingsRoutes from './routes/settings';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({
    verify: (req: any, res, buf) => {
        req.rawBody = buf;
    }
}));

// Routes
app.use('/api/auth', userAuthRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/settings', settingsRoutes);

// Start Worker
import './jobs/broadcastQueue';

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
