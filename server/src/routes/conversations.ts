import express from 'express';
import { db } from '../db';
import { conversations, messages, notes, tags } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

const router = express.Router();

// GET /api/conversations - Fetch all conversations for a tenant, sorted by updatedAt DESC
router.get('/', async (req, res) => {
    const { tenantId, status } = req.query;

    if (!tenantId) {
        return res.status(400).json({ error: 'Missing tenantId' });
    }

    try {
        let conditions = [eq(conversations.tenantId, tenantId as string)];

        if (status && status !== 'all') {
            conditions.push(eq(conversations.status, status as string));
        }

        const allConversations = await db
            .select()
            .from(conversations)
            .where(and(...conditions))
            .orderBy(desc(conversations.updatedAt));

        res.json({ conversations: allConversations });
    } catch (error: any) {
        console.error('Fetch Conversations Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// PATCH /api/conversations/:id/status - Update conversation status
router.patch('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Missing status' });
    }

    try {
        const [updatedConversation] = await db
            .update(conversations)
            .set({
                status,
                updatedAt: new Date()
            })
            .where(eq(conversations.id, id))
            .returning();

        res.json({ conversation: updatedConversation });
    } catch (error: any) {
        console.error('Update Status Error:', error.message);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// GET /api/conversations/:id/messages - Fetch message history for a specific conversation
router.get('/:id/messages', async (req, res) => {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    try {
        const messageHistory = await db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, id))
            .orderBy(desc(messages.createdAt))
            .limit(Number(limit))
            .offset(Number(offset));

        res.json({ messages: messageHistory.reverse() }); // Reverse to show oldest first
    } catch (error: any) {
        console.error('Fetch Messages Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// GET /api/conversations/:id/notes - Fetch notes for a conversation
router.get('/:id/notes', async (req, res) => {
    const { id } = req.params;

    try {
        const conversationNotes = await db
            .select()
            .from(notes)
            .where(eq(notes.conversationId, id))
            .orderBy(desc(notes.createdAt));

        res.json({ notes: conversationNotes });
    } catch (error: any) {
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
        const [newNote] = await db.insert(notes).values({
            conversationId: id,
            content,
            createdBy: createdBy || 'System',
        }).returning();

        res.json({ note: newNote });
    } catch (error: any) {
        console.error('Create Note Error:', error.message);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

// GET /api/conversations/:id/tags - Fetch tags for a conversation
router.get('/:id/tags', async (req, res) => {
    const { id } = req.params;

    try {
        const conversationTags = await db
            .select()
            .from(tags)
            .where(eq(tags.conversationId, id));

        res.json({ tags: conversationTags });
    } catch (error: any) {
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
        const [newTag] = await db.insert(tags).values({
            conversationId: id,
            name,
            color: color || 'blue',
        }).returning();

        res.json({ tag: newTag });
    } catch (error: any) {
        console.error('Create Tag Error:', error.message);
        res.status(500).json({ error: 'Failed to create tag' });
    }
});

// DELETE /api/conversations/:id/tags/:tagId - Remove a tag
router.delete('/:id/tags/:tagId', async (req, res) => {
    const { tagId } = req.params;

    try {
        await db.delete(tags).where(eq(tags.id, tagId));
        res.json({ success: true });
    } catch (error: any) {
        console.error('Delete Tag Error:', error.message);
        res.status(500).json({ error: 'Failed to delete tag' });
    }
});

export default router;
