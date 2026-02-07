"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const websocket_1 = require("./websocket");
const auth_1 = __importDefault(require("./routes/auth"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Middleware
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/webhooks', webhooks_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});
// Create HTTP server
const server = http_1.default.createServer(app);
// Initialize WebSocket
(0, websocket_1.initWebSocket)(server);
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
