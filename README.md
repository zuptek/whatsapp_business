# Upgreat - Multi-tenant WhatsApp CRM

Upgreat is a modern, high-performance CRM for WhatsApp Business, featuring multi-tenancy, real-time messaging, and a premium UI.

## 🚀 Technology Stack

- **Frontend**: React.js (Vite), TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, TypeScript, WebSocket (ws)
- **Database**: PostgreSQL, Drizzle ORM
- **Infrastructure**: Docker, Docker Compose

## 🛠️ Prerequisites

- Docker & Docker Compose
- Node.js v18+ (for local dev without Docker)

## 🏁 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd whatsapp_business
   ```

2. **Start the application**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the application**
   - **Frontend**: [http://localhost:8080](http://localhost:8080)
   - **Backend API**: [http://localhost:3000](http://localhost:3000)
   - **Database**: Port 5432

## 📦 Project Structure

```
├── client/                 # React Frontend
│   ├── src/components/     # UI Components (ChatInterface, LoginButton)
│   ├── Dockerfile          # Frontend Container Config
├── server/                 # Node.js Backend
│   ├── src/routes/         # API Routes (Auth, Webhooks)
│   ├── src/db/             # Database Schema & Config
│   ├── Dockerfile          # Backend Container Config
├── docker-compose.yml      # Orchestration
```

## 🔑 Environment Variables

### Client (`client/.env.local`)
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_META_APP_ID` | Meta App ID for Embedded Signup | `1234567890` |

### Server (`server/.env`)
| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL Connection String | `postgres://...` |
| `JWT_SECRET` | Secret for Session Tokens | `supersecretjwtkey` |
| `META_VERIFY_TOKEN` | Webhook Verification Token | `upgreat_webhook_verify_token` |

## 🧪 Testing Webhooks

1. Use `ngrok` to expose port 3000: `ngrok http 3000`
2. Configure Meta Webhook URL: `https://<ngrok-url>/api/webhooks/whatsapp`
3. Verify Token: `upgreat_webhook_verify_token`

## 📜 License

ISC
