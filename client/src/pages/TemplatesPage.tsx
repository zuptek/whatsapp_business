import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Template {
    id: string;
    name: string;
    status: string;
    category: string;
    language: string;
    components: any[];
}

export const TemplatesPage = ({ token }: { token: string | null }) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [tenantId, setTenantId] = useState<string>('');

    useEffect(() => {
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setTenantId(payload.tenantId);
            } catch (e) {
                console.error('Invalid token');
            }
        }
    }, [token]);

    useEffect(() => {
        if (!tenantId) return;
        setLoading(true);
        axios.get(`/api/templates?tenantId=${tenantId}`)
            .then(res => {
                setTemplates(res.data.data || []);
            })
            .catch(err => {
                console.error(err);
                // alert('Failed to fetch templates');
            })
            .finally(() => setLoading(false));
    }, [tenantId]);

    const getStatusConfig = (status: string) => {
        const config: any = {
            APPROVED: { color: 'text-green-500 bg-green-500/10 border-green-500/20', icon: CheckCircle },
            REJECTED: { color: 'text-red-500 bg-red-500/10 border-red-500/20', icon: XCircle },
            PENDING: { color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', icon: Clock },
        };
        return config[status] || config.PENDING;
    };

    if (loading) return <div className="flex items-center justify-center h-full text-[#aebac1]"><Loader2 className="animate-spin w-8 h-8" /></div>;

    return (
        <div className="flex flex-col h-full bg-[#0c1317]">
            {/* Header */}
            <div className="p-6 border-b border-[#313d45] flex justify-between items-center bg-[#202c33]">
                <div>
                    <h1 className="text-2xl font-bold text-[#e9edef]">Message Templates</h1>
                    <p className="text-[#8696a0] text-sm mt-1">Manage and create WhatsApp message templates</p>
                </div>
                <button className="bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] px-5 py-2.5 rounded-full font-medium flex items-center gap-2 transition-colors shadow-lg shadow-[#00a884]/20">
                    <Plus size={20} /> New Template
                </button>
            </div>

            {/* Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto">
                {templates.map((t, idx) => {
                    const statusConfig = getStatusConfig(t.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                        <div key={t.id || idx} className="bg-[#1f2c34] p-5 rounded-2xl border border-[#313d45] hover:border-[#00a884]/50 transition-all group flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-semibold text-[#e9edef] text-lg truncate w-40" title={t.name}>{t.name}</h3>
                                    <p className="text-[#8696a0] text-xs uppercase tracking-wider font-bold mt-1">{t.category}</p>
                                </div>
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                                    <StatusIcon size={14} strokeWidth={2.5} />
                                    {t.status}
                                </div>
                            </div>

                            <div className="bg-[#0c1317] p-4 rounded-xl text-[#d1d7db] text-sm flex-1 mb-4 font-light leading-relaxed border border-[#313d45]/50">
                                {t.components.find((c: any) => c.type === 'BODY')?.text || <span className="text-[#8696a0] italic">No preview available</span>}
                            </div>

                            <div className="flex justify-between items-center text-xs text-[#8696a0] pt-4 border-t border-[#313d45]">
                                <span className="bg-[#313d45] px-2 py-1 rounded text-[#d1d7db]">{t.language}</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#00a884] cursor-pointer hover:underline font-medium">View Details →</span>
                            </div>
                        </div>
                    );
                })}
                {templates.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 text-[#8696a0] border-2 border-dashed border-[#313d45] rounded-3xl">
                        <Search size={48} strokeWidth={1} className="mb-4 text-[#313d45]" />
                        <h3 className="text-xl font-medium text-[#d1d7db] mb-2">No templates found</h3>
                        <p>Create a new template to get started with broadcasts.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
