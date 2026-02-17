import { motion } from 'framer-motion';

interface Tab {
    id: string;
    label: string;
    count?: number;
}

interface ConversationTabsProps {
    activeTab: string;
    onTabChange: (tabId: string) => void;
    tabs: Tab[];
}

export const ConversationTabs = ({ activeTab, onTabChange, tabs }: ConversationTabsProps) => {
    return (
        <div className="flex p-1 bg-slate-800/50 rounded-lg mb-2">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`relative flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${activeTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-slate-300'
                        }`}
                >
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-slate-700/80 rounded-md shadow-sm"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <span className="relative z-10 flex items-center justify-center gap-1.5">
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-slate-600 text-slate-200' : 'bg-slate-700/50 text-slate-500'
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </span>
                </button>
            ))}
        </div>
    );
};
