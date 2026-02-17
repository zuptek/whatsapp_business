# WhatsApp Business API Setup Guide

This guide will help you connect your WhatsApp number to the application for real-time message testing.

## 📋 Prerequisites

1. **WhatsApp Business Account** (not personal WhatsApp)
2. **Meta Business Account** (Facebook Business Manager)
3. **Phone number** that's not registered with WhatsApp

## 🚀 Step-by-Step Setup

### Step 1: Create Meta Business Account

1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Click **Create Account**
3. Enter your business details
4. Verify your business email

### Step 2: Set Up WhatsApp Business API

1. Navigate to [Meta for Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Business** as app type
4. Fill in app details:
   - **App Name**: Your CRM Name
   - **Contact Email**: Your email
   - **Business Account**: Select your business

### Step 3: Add WhatsApp Product

1. In your app dashboard, find **WhatsApp** product
2. Click **Set Up**
3. Select your **Business Portfolio**
4. Click **Continue**

### Step 4: Get Your Credentials

You'll need these values for the `.env` file:

#### A. WhatsApp Business Account ID (WABA ID)
- Found in: **WhatsApp** → **Getting Started**
- Copy the **Phone Number ID** (this is your WABA ID)

#### B. Access Token
1. Go to **WhatsApp** → **Getting Started**
2. Click **Generate Token**
3. Select permissions: `whatsapp_business_messaging`, `whatsapp_business_management`
4. Copy the **Temporary Access Token**

> ⚠️ **Important**: Temporary tokens expire in 24 hours. For production, create a **System User Token**:
> - Go to **Business Settings** → **System Users**
> - Create a new system user
> - Assign WhatsApp permissions
> - Generate a permanent token

#### C. Phone Number
1. In **WhatsApp** → **Getting Started**
2. You'll see a test number provided by Meta
3. Or click **Add Phone Number** to add your own

#### D. App Credentials
- **App ID**: Found in **Settings** → **Basic**
- **App Secret**: Found in **Settings** → **Basic** (click Show)

### Step 5: Configure Webhooks

Webhooks allow WhatsApp to send incoming messages to your app.

#### Option A: Using ngrok (for local testing)

1. **Install ngrok**:
   ```bash
   # Download from https://ngrok.com/download
   # Or install via snap
   sudo snap install ngrok
   ```

2. **Start ngrok**:
   ```bash
   ngrok http 3000
   ```

3. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

4. **Configure in Meta**:
   - Go to **WhatsApp** → **Configuration**
   - Click **Edit** next to Webhook
   - **Callback URL**: `https://abc123.ngrok.io/api/webhooks/whatsapp`
   - **Verify Token**: `upgreat_webhook_verify_token` (from your `.env`)
   - Click **Verify and Save**

5. **Subscribe to webhook fields**:
   - Check: `messages`
   - Click **Subscribe**

#### Option B: Using a deployed server

If you have a public server:
- **Callback URL**: `https://yourdomain.com/api/webhooks/whatsapp`
- **Verify Token**: Same as in `.env`

### Step 6: Update Your `.env` File

Update `/server/.env` with your credentials:

```env
DATABASE_URL=postgres://postgres:mysecretpassword@localhost:5432/upgreat
PORT=3000

# WhatsApp Business API Credentials
META_APP_ID=YOUR_APP_ID
META_APP_SECRET=YOUR_APP_SECRET
META_VERIFY_TOKEN=upgreat_webhook_verify_token

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ENCRYPTION_KEY=32-char-encryption-key-change-me
```

### Step 7: Register Your Tenant in Database

You need to add your WhatsApp credentials to the database:

```sql
-- Connect to your database
psql -h localhost -U postgres -d upgreat

-- Insert your tenant (or update existing)
UPDATE tenants 
SET 
    waba_id = 'YOUR_PHONE_NUMBER_ID',
    access_token = 'YOUR_ACCESS_TOKEN'
WHERE id = 'YOUR_TENANT_ID';

-- Or insert a new tenant
INSERT INTO tenants (id, name, waba_id, access_token, created_at)
VALUES (
    gen_random_uuid(),
    'My Business',
    'YOUR_PHONE_NUMBER_ID',
    'YOUR_ACCESS_TOKEN',
    NOW()
);
```

### Step 8: Restart Your Backend

```bash
docker restart upgreat-backend
# Or if running locally:
cd server && npm run dev
```

### Step 9: Test the Connection

1. **Send a test message**:
   - Go to **WhatsApp** → **API Setup** in Meta dashboard
   - Use the **Send Message** tool
   - Send to your personal WhatsApp number

2. **Receive a message**:
   - Send a WhatsApp message to your business number
   - Check your app's conversation page
   - The message should appear in real-time!

## 🧪 Testing Checklist

- [ ] Webhook verified successfully
- [ ] Can send messages from the app
- [ ] Can receive messages in the app
- [ ] Messages appear in real-time (Socket.io working)
- [ ] Conversation status can be changed
- [ ] Templates load successfully

## 🐛 Troubleshooting

### "Template Sync Error"
- **Fixed!** The JSON parse error has been resolved
- If templates still don't load, verify your access token has the right permissions

### Messages not appearing
1. Check webhook is subscribed to `messages` field
2. Verify ngrok is running (if using local testing)
3. Check backend logs: `docker logs upgreat-backend`
4. Ensure Socket.io is connected (check browser console)

### "Invalid access token"
- Token might have expired (temporary tokens last 24 hours)
- Generate a new token or create a permanent System User token

### Webhook verification fails
- Ensure `META_VERIFY_TOKEN` in `.env` matches the one in Meta dashboard
- Check that your backend is accessible from the internet (ngrok URL)

## 📚 Additional Resources

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Meta Business Help Center](https://www.facebook.com/business/help)
- [ngrok Documentation](https://ngrok.com/docs)

## 🎯 Next Steps

Once connected, you can:
1. Test conversation status management (Active, Requesting, Intervened)
2. Send template messages
3. Receive and respond to customer messages in real-time
4. Assign conversations to team members (coming soon)
