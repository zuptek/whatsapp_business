"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const router = express_1.default.Router();
// GET /api/conversations - Fetch all conversations for a tenant, sorted by updatedAt DESC
router.get('/', async (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId) {
        return res.status(400).json({ error: 'Missing tenantId' });
    }
    try {
        const allConversations = await db_1.db
            .select()
            .from(schema_1.conversations)
            .where((0, drizzle_orm_1.eq)(schema_1.conversations.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.conversations.updatedAt));
        res.json({ conversations: allConversations });
    }
    catch (error) {
        console.error('Fetch Conversations Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});
// GET /api/conversations/:id/messages - Fetch message history for a specific conversation
router.get('/:id/messages', async (req, res) => {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    try {
        const messageHistory = await db_1.db
            .select()
            .from(schema_1.messages)
            .where((0, drizzle_orm_1.eq)(schema_1.messages.conversationId, id))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.messages.createdAt))
            .limit(Number(limit))
            .offset(Number(offset));
        res.json({ messages: messageHistory.reverse() }); // Reverse to show oldest first
    }
    catch (error) {
        console.error('Fetch Messages Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});
// GET /api/conversations/:id/notes - Fetch notes for a conversation
router.get('/:id/notes', async (req, res) => {
    const { id } = req.params;
    try {
        const conversationNotes = await db_1.db
            .select()
            .from(schema_1.notes)
            .where((0, drizzle_orm_1.eq)(schema_1.notes.conversationId, id))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.notes.createdAt));
        res.json({ notes: conversationNotes });
    }
    catch (error) {
        console.error('Fetch Notes Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});
// POST /api/conversations/:id/notes - Add or update internal notes
router.post('/:id/notes', async (req, res) => {
    const { id } = req.params;
    const { content, createdBy } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'Missing content' });
    }
    try {
        const [newNote] = await db_1.db.insert(schema_1.notes).values({
            conversationId: id,
            content,
            createdBy: createdBy || 'System',
        }).returning();
        res.json({ note: newNote });
    }
    catch (error) {
        console.error('Create Note Error:', error.message);
        res.status(500).json({ error: 'Failed to create note' });
    }
});
// GET /api/conversations/:id/tags - Fetch tags for a conversation
router.get('/:id/tags', async (req, res) => {
    const { id } = req.params;
    try {
        const conversationTags = await db_1.db
            .select()
            .from(schema_1.tags)
            .where((0, drizzle_orm_1.eq)(schema_1.tags.conversationId, id));
        res.json({ tags: conversationTags });
    }
    catch (error) {
        console.error('Fetch Tags Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch tags' });
    }
});
// POST /api/conversations/:id/tags - Add a tag
router.post('/:id/tags', async (req, res) => {
    const { id } = req.params;
    const { name, color } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Missing tag name' });
    }
    try {
        const [newTag] = await db_1.db.insert(schema_1.tags).values({
            conversationId: id,
            name,
            color: color || 'blue',
        }).returning();
        res.json({ tag: newTag });
    }
    catch (error) {
        console.error('Create Tag Error:', error.message);
        res.status(500).json({ error: 'Failed to create tag' });
    }
});
// DELETE /api/conversations/:id/tags/:tagId - Remove a tag
router.delete('/:id/tags/:tagId', async (req, res) => {
    const { tagId } = req.params;
    try {
        await db_1.db.delete(schema_1.tags).where((0, drizzle_orm_1.eq)(schema_1.tags.id, tagId));
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete Tag Error:', error.message);
        res.status(500).json({ error: 'Failed to delete tag' });
    }
});
exports.default = router;
