import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const tenants = pgTable('tenants', {
    id: uuid('id').defaultRandom().primaryKey(),
    businessName: text('business_name').notNull(),
    wabaId: text('waba_id').notNull().unique(),
    phoneNumberId: text('phone_number_id').notNull().unique(),
    accessToken: text('access_token').notNull(), // This should be encrypted app-side before storage
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const conversations = pgTable('conversations', {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
    contactName: text('contact_name'),
    contactPhone: text('contact_phone').notNull(),
    lastMessage: text('last_message'),
    unreadCount: integer('unread_count').default(0),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
    content: text('content').notNull(),
    type: text('type').default('text').notNull(), // text, image, template
    direction: text('direction').notNull(), // inbound, outbound
    status: text('status').default('sent'), // sent, delivered, read
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
    conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [conversations.tenantId],
        references: [tenants.id],
    }),
    messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
    conversation: one(conversations, {
        fields: [messages.conversationId],
        references: [conversations.id],
    }),
}));

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
