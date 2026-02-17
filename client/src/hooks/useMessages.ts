import { useState, useEffect } from 'react';
import axios from 'axios';
import { Socket } from 'socket.io-client';

export interface Message {
    id: string;
    conversationId: string;
    content: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'interactive' | 'template';
    direction: 'inbound' | 'outbound';
    status: 'sent' | 'delivered' | 'read' | 'failed';
    mediaUrl?: string | null;
    interactiveData?: any;
    createdAt: Date;
}

interface UseMessagesProps {
    conversationId: string | null;
    socket: Socket | null;
}

export const useMessages = ({ conversationId, socket }: UseMessagesProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch messages from API
    const fetchMessages = async () => {
        if (!conversationId) return;

        try {
            setLoading(true);
            const response = await axios.get(`/api/conversations/${conversationId}/messages`);
            setMessages(response.data.messages);
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch messages:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (conversationId) {
            fetchMessages();
        } else {
            setMessages([]);
        }
    }, [conversationId]);

    // Listen for real-time new messages via Socket.io
    useEffect(() => {
        if (!socket) return;

        socket.on('new_message', (newMessage: Message) => {
            // Only add message if it belongs to the current conversation
            if (newMessage.conversationId === conversationId) {
                setMessages((prev) => [...prev, newMessage]);
            }
        });

        return () => {
            socket.off('new_message');
        };
    }, [socket, conversationId]);

    return {
        messages,
        loading,
        error,
        refetch: fetchMessages,
    };
};
