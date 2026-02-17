import { useState, useEffect } from 'react';
import axios from 'axios';
import { Socket } from 'socket.io-client';

export interface Conversation {
    id: string;
    tenantId: string;
    contactName: string | null;
    contactPhone: string;
    lastMessage: string | null;
    unreadCount: number;
    status: string;
    updatedAt: Date;
}

interface UseConversationsProps {
    tenantId: string;
    status?: string;
    socket: Socket | null;
}

export const useConversations = ({ tenantId, status, socket }: UseConversationsProps) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch conversations from API
    const fetchConversations = async () => {
        try {
            setLoading(true);
            const statusQuery = status && status !== 'all' ? `&status=${status}` : '';
            const response = await axios.get(`/api/conversations?tenantId=${tenantId}${statusQuery}`);
            setConversations(response.data.conversations);
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch conversations:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tenantId) {
            fetchConversations();
        }
    }, [tenantId, status]);

    // Listen for real-time conversation updates via Socket.io
    useEffect(() => {
        if (!socket) return;

        socket.on('conversation_updated', (updatedConversation: Conversation) => {
            setConversations((prev) => {
                const index = prev.findIndex((c) => c.id === updatedConversation.id);
                if (index !== -1) {
                    // Update existing conversation
                    const updated = [...prev];
                    updated[index] = { ...updated[index], ...updatedConversation };
                    // Re-sort by updatedAt
                    return updated.sort((a, b) =>
                        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                    );
                } else {
                    // Add new conversation
                    return [updatedConversation, ...prev];
                }
            });
        });

        return () => {
            socket.off('conversation_updated');
        };
    }, [socket]);

    return {
        conversations,
        loading,
        error,
        refetch: fetchConversations,
    };
};
