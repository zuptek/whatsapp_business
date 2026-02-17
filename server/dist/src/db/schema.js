"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagsRelations = exports.notesRelations = exports.messagesRelations = exports.conversationsRelations = exports.tenantsRelations = exports.tags = exports.notes = exports.messages = exports.conversations = exports.tenants = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.tenants = (0, pg_core_1.pgTable)('tenants', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    businessName: (0, pg_core_1.text)('business_name').notNull(),
    wabaId: (0, pg_core_1.text)('waba_id').notNull().unique(),
    phoneNumberId: (0, pg_core_1.text)('phone_number_id').notNull().unique(),
    accessToken: (0, pg_core_1.text)('access_token').notNull(), // This should be encrypted app-side before storage
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.conversations = (0, pg_core_1.pgTable)('conversations', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').references(() => exports.tenants.id).notNull(),
    contactName: (0, pg_core_1.text)('contact_name'),
    contactPhone: (0, pg_core_1.text)('contact_phone').notNull(),
    lastMessage: (0, pg_core_1.text)('last_message'),
    unreadCount: (0, pg_core_1.integer)('unread_count').default(0),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
exports.messages = (0, pg_core_1.pgTable)('messages', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    conversationId: (0, pg_core_1.uuid)('conversation_id').references(() => exports.conversations.id).notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
    type: (0, pg_core_1.text)('type').default('text').notNull(), // text, image, video, audio, document, interactive
    direction: (0, pg_core_1.text)('direction').notNull(), // inbound, outbound
    status: (0, pg_core_1.text)('status').default('sent'), // sent, delivered, read, failed
    mediaUrl: (0, pg_core_1.text)('media_url'), // URL for media messages
    interactiveData: (0, pg_core_1.jsonb)('interactive_data'), // JSON data for interactive buttons
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.notes = (0, pg_core_1.pgTable)('notes', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    conversationId: (0, pg_core_1.uuid)('conversation_id').references(() => exports.conversations.id).notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
    createdBy: (0, pg_core_1.text)('created_by'), // User who created the note
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
exports.tags = (0, pg_core_1.pgTable)('tags', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    conversationId: (0, pg_core_1.uuid)('conversation_id').references(() => exports.conversations.id).notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    color: (0, pg_core_1.text)('color').default('blue'), // Color for UI display
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// Relations
exports.tenantsRelations = (0, drizzle_orm_1.relations)(exports.tenants, ({ many }) => ({
    conversations: many(exports.conversations),
}));
exports.conversationsRelations = (0, drizzle_orm_1.relations)(exports.conversations, ({ one, many }) => ({
    tenant: one(exports.tenants, {
        fields: [exports.conversations.tenantId],
        references: [exports.tenants.id],
    }),
    messages: many(exports.messages),
    notes: many(exports.notes),
    tags: many(exports.tags),
}));
exports.messagesRelations = (0, drizzle_orm_1.relations)(exports.messages, ({ one }) => ({
    conversation: one(exports.conversations, {
        fields: [exports.messages.conversationId],
        references: [exports.conversations.id],
    }),
}));
exports.notesRelations = (0, drizzle_orm_1.relations)(exports.notes, ({ one }) => ({
    conversation: one(exports.conversations, {
        fields: [exports.notes.conversationId],
        references: [exports.conversations.id],
    }),
}));
exports.tagsRelations = (0, drizzle_orm_1.relations)(exports.tags, ({ one }) => ({
    conversation: one(exports.conversations, {
        fields: [exports.tags.conversationId],
        references: [exports.conversations.id],
    }),
}));
