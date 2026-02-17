import { Outlet, Link, useLocation } from 'react-router-dom';
import { MessageSquare, StickyNote, Megaphone, Settings, LogOut } from 'lucide-react';

interface LayoutProps {
    onLogout: () => void;
}

export const Layout = ({ onLogout }: LayoutProps) => {
    const location = useLocation();

    const menuItems = [
        { icon: MessageSquare, path: '/', label: 'Chats' },
        { icon: StickyNote, path: '/templates', label: 'Templates' },
        { icon: Megaphone, path: '/broadcasts', label: 'Broadcasts' },
        { icon: Settings, path: '/settings', label: 'Settings' },
    ];

    return (
        <div className="flex h-screen bg-[#0c1317] text-[#e9edef] overflow-hidden font-sans">
            {/* Sidebar Navigation */}
            <div className="w-[68px] bg-[#202c33] border-r border-[#313d45] flex flex-col items-center py-6 gap-6 z-50 flex-shrink-0">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link key={item.path} to={item.path} title={item.label} className="relative group">
                            <div className={`p-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-[#00a884] text-white shadow-lg shadow-[#00a884]/20' : 'text-[#aebac1] hover:bg-[#313d45] hover:text-[#d1d7db]'}`}>
                                <item.icon size={24} strokeWidth={1.8} />
                            </div>
                            {/* Tooltip */}
                            <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                {item.label}
                            </div>
                        </Link>
                    );
                })}

                <div className="mt-auto flex flex-col gap-4 items-center w-full pb-4">
                    <button
                        onClick={onLogout}
                        title="Logout"
                        className="p-3 rounded-xl text-[#ef4444] hover:bg-[#313d45] hover:text-[#f87171] transition-all"
                    >
                        <LogOut size={24} strokeWidth={1.8} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative flex flex-col h-full w-full">
                <Outlet />
            </div>
        </div>
    );
};
