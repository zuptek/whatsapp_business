import { useState, useEffect, useRef } from 'react';
import { TemplateSendModal } from './TemplateSendModal';
import { ConversationTabs } from './ConversationTabs';
import { Send, Phone, Video, MoreVertical, Search, Paperclip, Smile, User, Clock, MessageSquarePlus, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { useConversations } from '../hooks/useConversations';
import { useMessages } from '../hooks/useMessages';
import { MessageBubble } from './MessageBubble';

interface ChatInterfaceProps {
    token: string;
}

export const ChatInterface = ({ token }: ChatInterfaceProps) => {
    const [inputValue, setInputValue] = useState('');
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [tenantId, setTenantId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [notes, setNotes] = useState<any[]>([]);
    const [tags, setTags] = useState<any[]>([]);
    const [newNote, setNewNote] = useState('');
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('active');

    const socket = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Extract tenantId from token
    useEffect(() => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setTenantId(payload.tenantId);
        } catch (error) {
            console.error('Failed to decode token:', error);
        }
    }, [token]);

    // Initialize Socket.io
    useEffect(() => {
        socket.current = io('http://localhost:3000');

        socket.current.on('connect', () => {
            console.log('Connected to Socket.io');
            if (tenantId) {
                socket.current?.emit('join_tenant', tenantId);
            }
        });

        return () => {
            socket.current?.disconnect();
        };
    }, [tenantId]);

    // Use custom hooks
    const { conversations, loading: conversationsLoading, refetch: refetchConversations } = useConversations({
        tenantId,
        status: activeTab,
        socket: socket.current,
    });

    const { messages, loading: messagesLoading } = useMessages({
        conversationId: activeConversationId,
        socket: socket.current,
    });

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch notes and tags when conversation changes
    useEffect(() => {
        if (activeConversationId) {
            fetchNotes();
            fetchTags();
        }
    }, [activeConversationId]);

    const fetchNotes = async () => {
        if (!activeConversationId) return;
        try {
            const response = await axios.get(`/api/conversations/${activeConversationId}/notes`);
            setNotes(response.data.notes);
        } catch (error) {
            console.error('Failed to fetch notes:', error);
        }
    };

    const fetchTags = async () => {
        if (!activeConversationId) return;
        try {
            const response = await axios.get(`/api/conversations/${activeConversationId}/tags`);
            setTags(response.data.tags);
        } catch (error) {
            console.error('Failed to fetch tags:', error);
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim() || !activeConversationId) return;

        const activeConversation = conversations.find(c => c.id === activeConversationId);
        if (!activeConversation) return;

        setInputValue('');

        try {
            await axios.post('/api/messages/send', {
                tenantId,
                to: activeConversation.contactPhone,
                text: inputValue,
                type: 'text',
            });
        } catch (error) {
            console.error('Failed to send message', error);
        }
    };

    const handleSendTemplate = async (template: any, variables: string[]) => {
        if (!activeConversationId) return;
        const activeConversation = conversations.find(c => c.id === activeConversationId);
        if (!activeConversation) return;

        // Construct components for variables
        const components = [];
        if (variables.length > 0) {
            components.push({
                type: 'body',
                parameters: variables.map(v => ({ type: 'text', text: v }))
            });
        }

        try {
            await axios.post('/api/messages/send', {
                tenantId,
                to: activeConversation.contactPhone,
                type: 'template',
                template: {
                    name: template.name,
                    language: template.language,
                    components: components
                }
            });
        } catch (error) {
            console.error('Failed to send template message', error);
            alert('Failed to send template');
        }
    };

    const handleUpdateStatus = async (status: string) => {
        if (!activeConversationId) return;

        try {
            await axios.patch(`/api/conversations/${activeConversationId}/status`, { status });
            refetchConversations();
        } catch (error) {
            console.error('Failed to update status', error);
            alert('Failed to update status');
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim() || !activeConversationId) return;

        try {
            await axios.post(`/api/conversations/${activeConversationId}/notes`, {
                content: newNote,
                createdBy: 'User',
            });
            setNewNote('');
            fetchNotes();
        } catch (error) {
            console.error('Failed to add note:', error);
        }
    };

    const handleAddTag = async (tagName: string, color: string) => {
        if (!activeConversationId) return;

        try {
            await axios.post(`/api/conversations/${activeConversationId}/tags`, {
                name: tagName,
                color,
            });
            fetchTags();
        } catch (error) {
            console.error('Failed to add tag:', error);
        }
    };

    const handleDeleteTag = async (tagId: string) => {
        if (!activeConversationId) return;

        try {
            await axios.delete(`/api/conversations/${activeConversationId}/tags/${tagId}`);
            fetchTags();
        } catch (error) {
            console.error('Failed to delete tag:', error);
        }
    };

    // Simulate incoming message (for testing)
    const handleSimulateMessage = async () => {
        const phone = prompt("Enter phone number for new conversation:", '1555' + Math.floor(1000000 + Math.random() * 9000000));
        if (!phone) return;

        try {
            await axios.post('/api/webhooks/simulate', {
                text: 'Hello! This is a test message from ' + phone,
                from: phone,
            });
        } catch (error) {
            console.error('Simulation failed:', error);
            alert('Failed to simulate message');
        }
    };

    const filteredConversations = conversations.filter(conv =>
        conv.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.contactPhone.includes(searchQuery)
    );

    const activeConversation = conversations.find(c => c.id === activeConversationId);

    const tabs = [
        { id: 'active', label: 'Active' },
        { id: 'requesting', label: 'Requesting' },
        { id: 'intervened', label: 'Intervened' },
        { id: 'all', label: 'All' },
    ];

    return (
        <div className="flex h-[85vh] bg-surface rounded-2xl overflow-hidden border border-border shadow-2xl relative">
            <TemplateSendModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                onSend={handleSendTemplate}
                tenantId={tenantId}
            />

            {/* Pane 1: Conversation List (Left) */}
            <div className="w-80 bg-slate-900 border-r border-border flex flex-col">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Conversations</h2>
                    <button
                        onClick={handleSimulateMessage}
                        className="p-2 hover:bg-white/5 rounded-full text-neutral-400 hover:text-white transition-colors"
                        title="Simulate Incoming Message"
                    >
                        <MessageSquarePlus size={20} />
                    </button>
                </div>
                <div className="p-4 border-b border-border bg-slate-900/50 backdrop-blur">
                    <ConversationTabs
                        activeTab={activeTab}
                        onTabChange={(id) => {
                            setActiveTab(id);
                            setActiveConversationId(null);
                        }}
                        tabs={tabs}
                    />
                    <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-800 text-slate-200 pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {conversationsLoading ? (
                        <div className="text-center text-slate-400 py-8">Loading...</div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">No conversations</div>
                    ) : (
                        filteredConversations.map((conv) => (
                            <div
                                key={conv.id}
                                onClick={() => setActiveConversationId(conv.id)}
                                className={`p-3 rounded-lg cursor-pointer transition-all ${activeConversationId === conv.id
                                    ? 'bg-primary-900/20 border border-primary-500/30'
                                    : 'hover:bg-slate-800 border border-transparent'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`font-medium ${activeConversationId === conv.id ? 'text-primary-300' : 'text-slate-200'}`}>
                                        {conv.contactName || conv.contactPhone}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                        {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs text-slate-400 truncate max-w-[70%]">{conv.lastMessage}</p>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${conv.status === 'active' ? 'bg-green-500' :
                                            conv.status === 'requesting' ? 'bg-yellow-500' :
                                                conv.status === 'intervened' ? 'bg-purple-500' : 'bg-slate-500'
                                            }`} title={conv.status} />

                                        {conv.unreadCount > 0 && (
                                            <span className="bg-green-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Pane 2: Chat Window (Center) */}
            <div className="flex-1 flex flex-col bg-slate-950 relative">
                {activeConversation ? (
                    <>
                        {/* Header */}
                        <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                                    {(activeConversation.contactName || activeConversation.contactPhone).charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-medium text-slate-200">
                                        {activeConversation.contactName || activeConversation.contactPhone}
                                    </h3>
                                    <p className="text-xs text-slate-400 flex items-center gap-1">
                                        {activeConversation.contactPhone} • <span className="capitalize">{activeConversation.status}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                {activeConversation.status !== 'active' && (
                                    <button
                                        onClick={() => handleUpdateStatus('active')}
                                        className="p-2 hover:bg-green-500/20 hover:text-green-500 rounded-lg transition-colors border border-transparent hover:border-green-500/30"
                                        title="Mark as Active"
                                    >
                                        <CheckCircle size={20} />
                                    </button>
                                )}
                                {activeConversation.status !== 'requesting' && (
                                    <button
                                        onClick={() => handleUpdateStatus('requesting')}
                                        className="p-2 hover:bg-yellow-500/20 hover:text-yellow-500 rounded-lg transition-colors border border-transparent hover:border-yellow-500/30"
                                        title="Mark as Requesting"
                                    >
                                        <AlertCircle size={20} />
                                    </button>
                                )}
                                {activeConversation.status !== 'intervened' && (
                                    <button
                                        onClick={() => handleUpdateStatus('intervened')}
                                        className="p-2 hover:bg-purple-500/20 hover:text-purple-500 rounded-lg transition-colors border border-transparent hover:border-purple-500/30"
                                        title="Mark as Intervened"
                                    >
                                        <User size={20} />
                                    </button>
                                )}
                                <div className="w-px h-6 bg-white/10 mx-2" />
                                <Phone className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
                                <Video className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
                                <MoreVertical className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://i.pinimg.com/originals/97/c0/07/97c00759d90d786d9b6096d274ad3e07.png')] bg-repeat bg-opacity-5">
                            {messagesLoading ? (
                                <div className="text-center text-slate-400">Loading messages...</div>
                            ) : (
                                <AnimatePresence>
                                    {messages.map((msg) => (
                                        <MessageBubble key={msg.id} message={msg} />
                                    ))}
                                </AnimatePresence>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-slate-900 border-t border-border">
                            <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded-xl border border-slate-700 focus-within:border-primary-500/50 focus-within:ring-1 focus-within:ring-primary-500/30 transition-all">
                                <button className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700">
                                    <Smile className="w-5 h-5" />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700">
                                    <Paperclip className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setIsTemplateModalOpen(true)}
                                    className="p-2 text-slate-400 hover:text-[#00a884] transition-colors rounded-lg hover:bg-slate-700"
                                    title="Send Template Message"
                                >
                                    <FileText className="w-5 h-5" />
                                </button>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-transparent text-slate-200 text-sm focus:outline-none px-2"
                                />
                                <button
                                    onClick={handleSend}
                                    className="p-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg shadow-lg shadow-primary-900/20 transition-all active:scale-95"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        Select a conversation to start messaging
                    </div>
                )}
            </div>

            {/* Pane 3: Contact Details & CRM (Right) */}
            {activeConversation && (
                <div className="w-72 bg-slate-900 border-l border-border flex flex-col hidden lg:flex">
                    <div className="p-6 border-b border-border flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-3xl mb-3 shadow-lg">
                            {(activeConversation.contactName || activeConversation.contactPhone).charAt(0).toUpperCase()}
                        </div>
                        <h3 className="text-lg font-bold text-slate-200">
                            {activeConversation.contactName || 'Unknown'}
                        </h3>
                        <p className="text-sm text-slate-400">{activeConversation.contactPhone}</p>
                    </div>

                    <div className="p-6 space-y-6 overflow-y-auto">
                        {/* Tags */}
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tags</h4>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <span
                                        key={tag.id}
                                        className={`px-2.5 py-1 rounded-full bg-${tag.color}-500/10 text-${tag.color}-400 text-xs border border-${tag.color}-500/20 cursor-pointer`}
                                        onClick={() => handleDeleteTag(tag.id)}
                                    >
                                        {tag.name} ×
                                    </span>
                                ))}
                                <button
                                    onClick={() => handleAddTag('New Tag', 'blue')}
                                    className="px-2.5 py-1 rounded-full bg-white/5 text-slate-400 text-xs border border-white/10 hover:bg-white/10"
                                >
                                    + Add
                                </button>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Notes</h4>
                            <div className="space-y-2 mb-3">
                                {notes.map((note) => (
                                    <div key={note.id} className="p-3 bg-slate-800 rounded-lg text-xs text-slate-300 leading-relaxed border border-slate-700">
                                        {note.content}
                                        <div className="text-[10px] text-slate-500 mt-1">
                                            {new Date(note.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Add a note..."
                                    className="flex-1 px-3 py-2 bg-slate-800 text-slate-200 text-xs rounded-lg border border-slate-700 focus:outline-none focus:border-primary-500"
                                />
                                <button
                                    onClick={handleAddNote}
                                    className="px-3 py-2 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-500"
                                >
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Details</h4>
                            <div className="flex items-center gap-3 text-sm text-slate-300">
                                <Clock className="w-4 h-4 text-slate-500" />
                                <span>Last active: {new Date(activeConversation.updatedAt).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-300">
                                <User className="w-4 h-4 text-slate-500" />
                                <span>Unread: {activeConversation.unreadCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
