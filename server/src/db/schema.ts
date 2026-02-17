import { pgTable, uuid, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tenants (Business Organizations)
export const tenants = pgTable('tenants', {
    id: uuid('id').defaultRandom().primaryKey(),
    businessName: text('business_name').notNull(),
    wabaId: text('waba_id').notNull().unique(), // Main WABA ID for the business
    accessToken: text('access_token').notNull(), // System User Token
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Users (Agents / Admins)
export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id), // Nullable for superadmins or pending invites? Let's keep simple: Not Null
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'), // Nullable if Google Auth only
    googleId: text('google_id'),
    name: text('name').notNull(),
    role: text('role').default('agent').notNull(), // 'admin', 'agent'
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Phone Numbers (Channels)
export const phoneNumbers = pgTable('phone_numbers', {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
    phoneNumberId: text('phone_number_id').notNull().unique(), // Meta Graph API ID
    telNumber: text('tel_number').notNull(), // Actual phone number e.g. "15550001"
    name: text('name').notNull(), // Internal name e.g. "Sales Team"
    autoResponseConfig: jsonb('auto_response_config'), // Specific chatbot config for this number
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const conversations = pgTable('conversations', {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
    phoneNumberId: uuid('phone_number_id').references(() => phoneNumbers.id), // Which number received this? (Nullable for migration, but should be filled)
    contactName: text('contact_name'),
    contactPhone: text('contact_phone').notNull(),
    lastMessage: text('last_message'),
    unreadCount: integer('unread_count').default(0),
    status: text('status').default('active').notNull(), // active, requesting, intervened
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
    content: text('content').notNull(),
    type: text('type').default('text').notNull(), // text, image, video, audio, document, interactive
    direction: text('direction').notNull(), // inbound, outbound
    status: text('status').default('sent'), // sent, delivered, read, failed
    mediaUrl: text('media_url'), // URL for media messages
    interactiveData: jsonb('interactive_data'), // JSON data for interactive buttons
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notes = pgTable('notes', {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
    content: text('content').notNull(),
    createdBy: text('created_by'), // User who created the note
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tags = pgTable('tags', {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
    name: text('name').notNull(),
    color: text('color').default('blue'), // Color for UI display
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
    users: many(users),
    phoneNumbers: many(phoneNumbers),
    conversations: many(conversations),
}));

export const usersRelations = relations(users, ({ one }) => ({
    tenant: one(tenants, {
        fields: [users.tenantId],
        references: [tenants.id],
    }),
}));

export const phoneNumbersRelations = relations(phoneNumbers, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [phoneNumbers.tenantId],
        references: [tenants.id],
    }),
    conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [conversations.tenantId],
        references: [tenants.id],
    }),
    phoneNumber: one(phoneNumbers, {
        fields: [conversations.phoneNumberId],
        references: [phoneNumbers.id],
    }),
    messages: many(messages),
    notes: many(notes),
    tags: many(tags),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
    conversation: one(conversations, {
        fields: [messages.conversationId],
        references: [conversations.id],
    }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
    conversation: one(conversations, {
        fields: [notes.conversationId],
        references: [conversations.id],
    }),
}));

export const tagsRelations = relations(tags, ({ one }) => ({
    conversation: one(conversations, {
        fields: [tags.conversationId],
        references: [conversations.id],
    }),
}));

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export type NewPhoneNumber = typeof phoneNumbers.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

// Marketing Schema

export const templates = pgTable('templates', {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
    name: text('name').notNull(),
    language: text('language').notNull(),
    status: text('status').notNull(), // APPROVED, REJECTED, PENDING
    category: text('category').notNull(), // MARKETING, UTILITY, AUTH
    components: jsonb('components').notNull(),
    rawBody: jsonb('raw_body'), // Full Meta response
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const campaigns = pgTable('campaigns', {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
    name: text('name').notNull(),
    templateId: uuid('template_id').references(() => templates.id).notNull(),
    scheduledAt: timestamp('scheduled_at'),
    status: text('status').default('draft'), // draft, scheduled, processing, completed, failed
    stats: jsonb('stats').default({ sent: 0, delivered: 0, read: 0, failed: 0 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const campaignAudiences = pgTable('campaign_audiences', {
    id: uuid('id').defaultRandom().primaryKey(),
    campaignId: uuid('campaign_id').references(() => campaigns.id).notNull(),
    contactPhone: text('contact_phone').notNull(),
    contactName: text('contact_name'),
    variableValues: jsonb('variable_values'), // For template variables
    status: text('status').default('pending'), // pending, sent, failed
    messageId: text('message_id'), // WAMID
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Marketing Relations

export const templatesRelations = relations(templates, ({ one }) => ({
    tenant: one(tenants, { fields: [templates.tenantId], references: [tenants.id] }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
    tenant: one(tenants, { fields: [campaigns.tenantId], references: [tenants.id] }),
    template: one(templates, { fields: [campaigns.templateId], references: [templates.id] }),
    audiences: many(campaignAudiences),
}));

export const campaignAudiencesRelations = relations(campaignAudiences, ({ one }) => ({
    campaign: one(campaigns, { fields: [campaignAudiences.campaignId], references: [campaigns.id] }),
}));

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type CampaignAudience = typeof campaignAudiences.$inferSelect;
export type NewCampaignAudience = typeof campaignAudiences.$inferInsert;
