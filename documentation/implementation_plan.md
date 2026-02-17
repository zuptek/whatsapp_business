# AISensy-Style Chat Enhancement - Implementation Plan

## Overview

Transform your existing WhatsApp Business CRM into a feature-rich platform similar to AISensy, with enhanced conversation management, template messaging, interactive features, and a premium UI/UX.

## Current State Analysis

Your existing application has:
- ✅ Three-pane layout (Conversations, Chat, Contact Details)
- ✅ Real-time messaging with WebSocket
- ✅ Basic conversation list with search
- ✅ Message history display
- ✅ Notes and tags functionality
- ✅ Multi-tenant architecture
- ✅ WhatsApp Business API integration

## Key AISensy Features to Implement

Based on the exploration, AISensy has these standout features:

1. **Conversation Tabs** - Active, Requesting, Intervened filters
2. **Template Messaging** - Pre-approved message templates with variables
3. **Interactive Messages** - Quick reply buttons, CTAs, lists
4. **Flow Builder** - Visual chatbot automation
5. **Enhanced Contact Profiles** - Custom attributes, campaign history
6. **Media Management** - Link generation, gallery view
7. **Agent Assignment** - Multi-agent support with intervention
8. **Message Status** - Detailed delivery tracking

---

## Proposed Changes

### Phase 1: Template Messaging System (MVP Priority)

This phase is critical for business-initiated conversations and forms the backbone of the "AISensy-style" experience.

#### [NEW] [schema.ts additions](file:///home/chandan/Documents/whatsapp_business_api/whatsapp_business/server/src/db/schema.ts)

**New Tables:**

```typescript
// Templates table
export const templates = pgTable('templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  category: text('category').notNull(), // 'MARKETING', 'UTILITY', 'AUTHENTICATION'
  language: text('language').default('en'),
  status: text('status').default('PENDING'), // 'PENDING', 'APPROVED', 'REJECTED'
  headerType: text('header_type'), // 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'
  headerContent: text('header_content'),
  bodyText: text('body_text').notNull(),
  footerText: text('footer_text'),
  buttons: jsonb('buttons'), // Quick reply or CTA buttons
  variables: jsonb('variables'), // List of variable names
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

#### [NEW] [templates.ts](file:///home/chandan/Documents/whatsapp_business_api/whatsapp_business/server/src/routes/templates.ts)

**Endpoints:**
- `GET /api/templates` - Sync from WhatsApp API and List all templates for tenant
- `POST /api/templates` - Create new template (optional for MVP if sync works)

#### [NEW] [TemplateManager.tsx](file:///home/chandan/Documents/whatsapp_business_api/whatsapp_business/client/src/pages/TemplateManager.tsx)

**Purpose:** Interface to view available templates.
**Features:**
- List templates fetched from backend
- Sync button to refresh from Meta

#### [NEW] [TemplateSendModal.tsx](file:///home/chandan/Documents/whatsapp_business_api/whatsapp_business/client/src/components/TemplateSendModal.tsx)

**Purpose:** Modal for selecting and sending templates in chat
**Features:**
- Template search
- Variable input form (e.g., "Enter {{1}}")
- Preview
- Send action

#### [MODIFY] [ChatInterface.tsx](file:///home/chandan/Documents/whatsapp_business_api/whatsapp_business/client/src/components/ChatInterface.tsx)

**Changes:**
- Add "Send Template" button next to attachment icon.
- Handle "template" message type in `MessageBubble` (if distinct styling needed).

---

### Phase 2: Conversation Management Enhancement

#### [MODIFY] [ChatInterface.tsx](file:///home/chandan/Documents/whatsapp_business_api/whatsapp_business/client/src/components/ChatInterface.tsx)

**Changes:**
- Add conversation status tabs (Active, Requesting, Intervened, All)
- Implement conversation status filtering
- Add agent assignment dropdown
- Create empty state component with illustrations
- Add conversation archiving functionality

**New State Variables:**
```typescript
const [activeTab, setActiveTab] = useState<'active' | 'requesting' | 'intervened' | 'all'>('active');
const [conversationStatus, setConversationStatus] = useState<Map<string, string>>(new Map());
```

#### [NEW] [ConversationTabs.tsx](file:///home/chandan/Documents/whatsapp_business_api/whatsapp_business/client/src/components/ConversationTabs.tsx)

**Purpose:** Reusable tab component for conversation filtering

---

### Phase 3: Interactive Messages

#### [NEW] [InteractiveMessageBuilder.tsx](file:///home/chandan/Documents/whatsapp_business_api/whatsapp_business/client/src/components/InteractiveMessageBuilder.tsx)

**Purpose:** Build interactive messages with buttons, lists, and CTAs

---

### Phase 4: Enhanced Media Handling

#### [NEW] [MediaUploader.tsx](file:///home/chandan/Documents/whatsapp_business_api/whatsapp_business/client/src/components/MediaUploader.tsx)

**Purpose:** Advanced media upload with preview and management

---

### Phase 5: Flow Builder (Advanced)

> [!IMPORTANT]
> This is an advanced feature that requires significant development effort. Consider implementing in a later phase.

#### [NEW] [FlowBuilder.tsx](file:///home/chandan/Documents/whatsapp_business_api/whatsapp_business/client/src/pages/FlowBuilder.tsx)

**Purpose:** Visual drag-and-drop chatbot flow builder

---

### Phase 6: Backend Enhancements

#### [NEW] [schema.ts additions](file:///home/chandan/Documents/whatsapp_business_api/whatsapp_business/server/src/db/schema.ts)

**New Tables:**

```typescript
// Flows table
export const flows = pgTable('flows', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  description: text('description'),
  trigger: text('trigger'), // 'KEYWORD', 'WELCOME', 'AWAY'
  triggerValue: text('trigger_value'),
  flowData: jsonb('flow_data').notNull(), // Node and edge data
  isActive: boolean('is_active').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Conversation status tracking
ALTER TABLE conversations ADD COLUMN status text DEFAULT 'active';
ALTER TABLE conversations ADD COLUMN assignedTo uuid REFERENCES users(id);
ALTER TABLE conversations ADD COLUMN priority integer DEFAULT 0;
ALTER TABLE conversations ADD COLUMN archived boolean DEFAULT false;
```

---

## Verification Plan

### Automated Tests

```bash
# Backend tests
cd server
npm run test

# Frontend tests
cd client
npm run test
```

### Manual Verification (Phase 1 MVP)

1. **Template Syncing**
   - [ ] Click "Sync Templates" in Template Manager.
   - [ ] Verify templates from Meta account appear in list.

2. **Template Sending**
   - [ ] Open a chat (or start new one).
   - [ ] Click "Send Template".
   - [ ] Select a template with variables.
   - [ ] Fill variables.
   - [ ] Click Send.
   - [ ] Verify message appears in chat history.
   - [ ] Verify message is delivered to phone.

---

## Implementation Timeline

**Phase 1 (MVP):** 2-3 days (Template Messaging)
**Phase 2:** 2 days (Conversation UI)
**Phase 3-4:** 3-4 days (Interactive & Media)
**Phase 5:** 3-4 days (Flow builder - optional)

**Total Estimated Time:** 10-15 days (excluding Flow Builder)

---

## Next Steps

1. Review this updated implementation plan
2. Confirm priority of Template Messaging
3. Begin Phase 1 Implementation

---

## Screenshots Reference

Here are the AISensy interface screenshots for reference:

![AISensy Main Layout](/home/chandan/.gemini/antigravity/brain/01094051-4a2c-4f09-8ba2-c699afe64e6b/aisensy_main_layout_1771174946114.png)

![AISensy Templates](/home/chandan/.gemini/antigravity/brain/01094051-4a2c-4f09-8ba2-c699afe64e6b/aisensy_template_explore_1771175092479.png)
