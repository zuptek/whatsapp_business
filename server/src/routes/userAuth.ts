import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, tenants } from '../db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, comparePassword } from '../utils/password';
import { OAuth2Client } from 'google-auth-library';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// 1. Invite User (Create Tenant + First Admin User)
// Ideally this should be protected or behind a super-admin key.
// For now, we'll allow open registration for the first user or make it an "onboarding" endpoint.
router.post('/register', async (req, res) => {
    const { email, password, name, businessName } = req.body;

    if (!email || !password || !name || !businessName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Check if user already exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email)
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Create Tenant
        const [tenant] = await db.insert(tenants).values({
            businessName,
            wabaId: `temp_${Date.now()}`, // Placeholder, updated later
            accessToken: '', // Placeholder
        }).returning();

        // Hash Password
        const passwordHash = await hashPassword(password);

        // Create User
        const [user] = await db.insert(users).values({
            tenantId: tenant.id,
            email,
            passwordHash,
            name,
            role: 'admin'
        }).returning();

        // Generate Token
        const token = jwt.sign(
            { userId: user.id, tenantId: tenant.id, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: tenant.id } });

    } catch (error: any) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// 2. Login (Email/Password)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.email, email)
        });

        if (!user || !user.passwordHash) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = await comparePassword(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, tenantId: user.tenantId, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId } });

    } catch (error: any) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// 3. Google Login
router.post('/google', async (req, res) => {
    const { credential } = req.body; // ID Token from frontend

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            return res.status(400).json({ error: 'Invalid Google Token' });
        }

        const { email, name, sub: googleId } = payload;

        // Check if user exists
        let user = await db.query.users.findFirst({
            where: eq(users.email, email)
        });

        if (!user) {
            // Check if we should allow auto-registration or require invite?
            // For now, let's say "Invite Only" means they must be invited.
            // But for the FIRST user (Business Owner), they probably register via Google?
            // The constraint says "Invite Only".
            // So if user doesn't exist, we reject?
            // Or maybe we treat "Google Login" as registration if passing business details?
            // Let's assume for now if user doesn't exist, we reject, UNLESS it's a specific "Signup with Google" flow which includes business name.
            // Simplified: If user exists, log them in. If not, error "User not found. Please sign up first."
            return res.status(404).json({ error: 'User not found. Please contact your admin for an invite.' });
        }

        // Update Google ID if not set
        if (!user.googleId) {
            await db.update(users).set({ googleId }).where(eq(users.id, user.id));
        }

        const token = jwt.sign(
            { userId: user.id, tenantId: user.tenantId, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId } });

    } catch (error: any) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ error: 'Google authentication failed' });
    }
});

// 4. Invite Agent (Admin Only)
router.post('/invite', async (req, res) => {
    // Requires Auth Middleware (to be extracted)
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can invite users' });
        }

        const { email, name } = req.body;
        const tempPassword = Math.random().toString(36).slice(-8); // Generate temp password
        const passwordHash = await hashPassword(tempPassword);

        // Check if user exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email)
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const [newUser] = await db.insert(users).values({
            tenantId: decoded.tenantId,
            email,
            name,
            passwordHash,
            role: 'agent'
        }).returning();

        // In a real app, send email with temp password
        // For now, return it
        res.json({ message: 'User invited', tempPassword, user: newUser });

    } catch (error) {
        res.status(500).json({ error: 'Invite failed' });
    }
});

export default router;
