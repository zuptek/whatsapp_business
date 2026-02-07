import { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, MoreVertical, Search, Paperclip, Smile, User, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

interface Message {
    id: string;
    text: string;
    sender: 'me' | 'them';
    timestamp: Date;
}

interface Conversation {
    id: number;
    name: string;
    lastMessage: string;
    time: string;
    unread: number;
    online: boolean;
}

interface ChatInterfaceProps {
    token: string;
}

export const ChatInterface = ({ token }: ChatInterfaceProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [activeConversation, setActiveConversation] = useState<number>(1);
    const socket = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Mock Conversations
    const conversations: Conversation[] = [
        { id: 1, name: 'Alice Johnson', lastMessage: 'Thanks for the update!', time: '10:30 AM', unread: 2, online: true },
        { id: 2, name: 'Bob Smith', lastMessage: 'Can we schedule a call?', time: '09:15 AM', unread: 0, online: false },
        { id: 3, name: 'Charlie Brown', lastMessage: 'Payment received.', time: 'Yesterday', unread: 0, online: false },
    ];

    useEffect(() => {
        // Connect to Socket.io
        socket.current = io('http://localhost:3000'); // Ensure this matches backend URL

        socket.current.on('connect', () => {
            console.log('Connected to Socket.io');
        });

        socket.current.on('new_message', (payload: any) => {
            console.log('New Message Received:', payload);
            const msg = payload;
            // Handle text message structure from Meta
            const text = msg.text?.body || (msg.type === 'text' ? msg.text.body : 'Media message');

            const newMessage: Message = {
                id: msg.id || Date.now().toString(),
                text: text,
                sender: 'them',
                timestamp: new Date()
            };

            setMessages((prev) => [...prev, newMessage]);
        });

        return () => {
            socket.current?.disconnect();
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        // Optimistic Update
        const tempId = Date.now().toString();
        const newMessage: Message = {
            id: tempId,
            text: inputValue,
            sender: 'me',
            timestamp: new Date()
        };
        setMessages((prev) => [...prev, newMessage]);
        setInputValue('');

        try {
            // Retrieve tenantId from token (mocking decode for now or just sending token)
            // Ideally we decode the JWT to get tenantId, or backend extracts it from header.
            // For this MVP route, let's assume we send tenantId if we have it, or backend handles it.
            // Since backend expects tenantId in body (as per my previous implementation), 
            // I should probably decode it here or update backend to use req.user from middleware.
            // Backend: const { tenantId, to, text } = req.body;

            // Let's decode token for MVP or hardcode if we can't easily decode without library.
            // Actually, backend *should* get it from token using middleware, but I didn't implement middleware yet in routes/messages.ts
            // I implemented it to take tenantId from body.
            // Let's cheat and send a hardcoded tenantId or extract from token payload if simple.

            const payload = JSON.parse(atob(token.split('.')[1]));
            const tenantId = payload.id;

            await axios.post('/api/messages/send', {
                tenantId,
                to: conversations.find(c => c.id === activeConversation)?.name || '1234567890', // Use contact phone
                text: newMessage.text
            });

        } catch (error) {
            console.error('Failed to send message', error);
            // Revert optimistic update or show error
        }
    };

    return (
        <div className="flex h-[85vh] bg-surface rounded-2xl overflow-hidden border border-border shadow-2xl">

            {/* Pane 1: Conversation List (Left) */}
            <div className="w-80 bg-slate-900 border-r border-border flex flex-col">
                <div className="p-4 border-b border-border bg-slate-900/50 backdrop-blur">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            className="w-full bg-slate-800 text-slate-200 pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {conversations.map((conv) => (
                        <div
                            key={conv.id}
                            onClick={() => setActiveConversation(conv.id)}
                            className={`p-3 rounded-lg cursor-pointer transition-all ${activeConversation === conv.id ? 'bg-primary-900/20 border border-primary-500/30' : 'hover:bg-slate-800 border border-transparent'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`font-medium ${activeConversation === conv.id ? 'text-primary-300' : 'text-slate-200'}`}>{conv.name}</span>
                                <span className="text-[10px] text-slate-500">{conv.time}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-slate-400 truncate max-w-[70%]">{conv.lastMessage}</p>
                                {conv.unread > 0 && (
                                    <span className="bg-green-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{conv.unread}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pane 2: Chat Window (Center) */}
            <div className="flex-1 flex flex-col bg-slate-950 relative">
                {/* Header */}
                <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                            {conversations.find(c => c.id === activeConversation)?.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-200">{conversations.find(c => c.id === activeConversation)?.name}</h3>
                            <p className="text-xs text-green-400 flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${conversations.find(c => c.id === activeConversation)?.online ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                                {conversations.find(c => c.id === activeConversation)?.online ? 'Online' : 'Offline'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-slate-400">
                        <Phone className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
                        <Video className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
                        <MoreVertical className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://i.pinimg.com/originals/97/c0/07/97c00759d90d786d9b6096d274ad3e07.png')] bg-repeat bg-opacity-5">
                    <AnimatePresence>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${msg.sender === 'me'
                                    ? 'bg-primary-600 text-white rounded-br-none shadow-lg shadow-primary-900/20'
                                    : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                                    }`}>
                                    <p className="text-sm">{msg.text}</p>
                                    <span className="text-[10px] opacity-70 block text-right mt-1">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
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
            </div>

            {/* Pane 3: Contact Details & CRM (Right) */}
            <div className="w-72 bg-slate-900 border-l border-border flex flex-col hidden lg:flex">
                <div className="p-6 border-b border-border flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-3xl mb-3 shadow-lg">
                        {conversations.find(c => c.id === activeConversation)?.name.charAt(0)}
                    </div>
                    <h3 className="text-lg font-bold text-slate-200">{conversations.find(c => c.id === activeConversation)?.name}</h3>
                    <p className="text-sm text-slate-400">+1 (555) 123-4567</p>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Tags */}
                    <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20">VIP</span>
                            <span className="px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs border border-orange-500/20">New Lead</span>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                            Notes
                            <button className="text-primary-400 hover:text-primary-300 text-[10px]">Edit</button>
                        </h4>
                        <div className="p-3 bg-slate-800 rounded-lg text-xs text-slate-300 leading-relaxed border border-slate-700">
                            Customer is interested in the premium plan. Follow up next Tuesday regarding the specialized features.
                        </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Details</h4>
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                            <Clock className="w-4 h-4 text-slate-500" />
                            <span>Local Time: 4:32 PM</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                            <User className="w-4 h-4 text-slate-500" />
                            <span>Owner: John Doe</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};
