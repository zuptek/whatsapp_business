"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const encryption_1 = require("../utils/encryption");
const router = express_1.default.Router();
const META_API_VERSION = 'v18.0';
const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';
router.post('/meta-callback', async (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
    }
    try {
        // 1. Exchange code for access token
        const tokenResponse = await axios_1.default.get(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`, {
            params: {
                client_id: APP_ID,
                client_secret: APP_SECRET,
                code: code,
                // redirect_uri: 'http://localhost:5173', // Adjust as per Meta App settings
            },
        });
        const { access_token } = tokenResponse.data;
        // 2. Get Business Details (WABA ID, Phone Number ID)
        // This part depends on how the permissions are set up. 
        // Usually we query /me?fields=id,name,accounts...
        // For now, let's assume we get the debug token to find the WABA
        const debugTokenResponse = await axios_1.default.get(`https://graph.facebook.com/${META_API_VERSION}/debug_token`, {
            params: {
                input_token: access_token,
                access_token: `${APP_ID}|${APP_SECRET}`
            }
        });
        const wabaId = debugTokenResponse.data.data.granular_scopes[0].target_ids[0]; // Simplified extraction
        // We might need another call to get the Phone Number ID associated with this WABA
        // mocking for MVP
        const phoneNumberId = 'PHONE_NUMBER_ID_PLACEHOLDER';
        const businessName = 'Business Name Placeholder';
        // 3. Encrypt Access Token
        const encryptedToken = JSON.stringify((0, encryption_1.encrypt)(access_token));
        // 4. Upsert Tenant
        const [tenant] = await db_1.db
            .insert(schema_1.tenants)
            .values({
            businessName,
            wabaId,
            phoneNumberId,
            accessToken: encryptedToken,
        })
            .onConflictDoUpdate({
            target: schema_1.tenants.wabaId,
            set: { accessToken: encryptedToken },
        })
            .returning();
        // 5. Generate Session Token
        const sessionToken = jsonwebtoken_1.default.sign({ id: tenant.id, wabaId: tenant.wabaId }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token: sessionToken, tenant });
    }
    catch (error) {
        console.error('Meta Auth Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to authenticate with Meta' });
    }
});
exports.default = router;
