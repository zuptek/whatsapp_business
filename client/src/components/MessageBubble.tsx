import { motion } from 'framer-motion';
import type { Message } from '../hooks/useMessages';

interface MessageBubbleProps {
    message: Message;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
    const isOutbound = message.direction === 'outbound';

    const renderContent = () => {
        switch (message.type) {
            case 'text':
                return <p className="text-sm">{message.content}</p>;

            case 'image':
                return (
                    <div>
                        {message.mediaUrl && (
                            <img
                                src={message.mediaUrl}
                                alt="Shared image"
                                className="rounded-lg max-w-xs mb-2"
                            />
                        )}
                        {message.content && message.content !== 'Image' && (
                            <p className="text-sm mt-2">{message.content}</p>
                        )}
                    </div>
                );

            case 'interactive':
                return (
                    <div>
                        <p className="text-sm mb-2">{message.content}</p>
                        {message.interactiveData?.buttons && (
                            <div className="space-y-2 mt-2">
                                {message.interactiveData.buttons.map((btn: any, idx: number) => (
                                    <button
                                        key={idx}
                                        className="w-full px-3 py-2 text-sm border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
                                        disabled={isOutbound}
                                    >
                                        {btn.title || btn.reply?.title}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'template':
                return (
                    <div>
                        <p className="text-[10px] font-bold opacity-50 mb-1 uppercase tracking-wider">Template Message</p>
                        <p className="text-sm">{message.content}</p>
                    </div>
                );

            case 'video':
            case 'audio':
            case 'document':
                return (
                    <div>
                        <p className="text-sm opacity-70">📎 {message.type}</p>
                        {message.content && (
                            <p className="text-sm mt-1">{message.content}</p>
                        )}
                    </div>
                );

            default:
                return <p className="text-sm">{message.content}</p>;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
        >
            <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl ${isOutbound
                    ? 'bg-primary-600 text-white rounded-br-none shadow-lg shadow-primary-900/20'
                    : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                    }`}
            >
                {renderContent()}
                <span className="text-[10px] opacity-70 block text-right mt-1">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </span>
            </div>
        </motion.div>
    );
};
