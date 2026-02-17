import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import axios from 'axios';
import { db } from '../db';
import { tenants, campaigns, campaignAudiences, messages, conversations, phoneNumbers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '../utils/encryption';

const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
});

export const broadcastQueue = new Queue('broadcast-queue', { connection });

const worker = new Worker('broadcast-queue', async (job) => {
    const { campaignId, audienceId, tenantId, templateName, components, language } = job.data;

    try {
        // 1. Get Audience & Tenant
        const [audience] = await db.select().from(campaignAudiences).where(eq(campaignAudiences.id, audienceId)).limit(1);
        const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
        const [funcNumber] = await db.select().from(phoneNumbers).where(eq(phoneNumbers.tenantId, tenantId)).limit(1);

        if (!audience || !tenant || !funcNumber) {
            throw new Error('Invalid job data');
        }

        // 2. Prepare Payload
        const messagePayload = {
            messaging_product: 'whatsapp',
            to: audience.contactPhone,
            type: 'template',
            template: {
                name: templateName,
                language: { code: language },
                components: components // Should be processed to replace variables
            }
        };

        let wamid = 'mock_wamid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const isDevTenant = tenant.wabaId.startsWith('DEV_');

        if (!isDevTenant) {
            const accessToken = decrypt(JSON.parse(tenant.accessToken));
            const response = await axios.post(
                `https://graph.facebook.com/v18.0/${funcNumber.phoneNumberId}/messages`,
                messagePayload,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            wamid = response.data.messages[0].id;
        } else {
            await new Promise(r => setTimeout(r, 200)); // Mock delay
        }

        // 3. Update Audience Status
        await db.update(campaignAudiences)
            .set({ status: 'sent', messageId: wamid })
            .where(eq(campaignAudiences.id, audienceId));

        // 4. Create internal message record
        // Find/Create conversation first to ensure history exists
        let [conversation] = await db.select().from(conversations).where(eq(conversations.contactPhone, audience.contactPhone)).limit(1);
        if (!conversation) {
            [conversation] = await db.insert(conversations).values({
                tenantId: tenant.id,
                contactPhone: audience.contactPhone,
                contactName: audience.contactName || audience.contactPhone,
                lastMessage: `Template: ${templateName}`,
                unreadCount: 0,
            }).returning();
        } else {
            await db.update(conversations).set({
                lastMessage: `Template: ${templateName}`,
                updatedAt: new Date()
            }).where(eq(conversations.id, conversation.id));
        }

        await db.insert(messages).values({
            conversationId: conversation.id,
            content: `Template: ${templateName}`,
            type: 'template',
            direction: 'outbound',
            status: 'sent',
        });

    } catch (error: any) {
        console.error('Job failed:', error.message);
        await db.update(campaignAudiences)
            .set({ status: 'failed' })
            .where(eq(campaignAudiences.id, audienceId));
        // Don't rethrow, just mark as failed
    }

}, { connection });

worker.on('completed', job => {
    console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
    console.log(`Job ${job?.id} failed with ${err.message}`);
});
