import { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, FileText, Loader2 } from 'lucide-react';

export const BroadcastsPage = ({ token }: { token: string | null }) => {
    const [tenantId, setTenantId] = useState('');
    const [templates, setTemplates] = useState<any[]>([]);
    const [campaigns, setCampaigns] = useState<any[]>([]);

    // Form State
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [phones, setPhones] = useState(''); // Comma separated
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setTenantId(payload.tenantId);
            } catch (e) { }
        }
    }, [token]);

    useEffect(() => {
        if (!tenantId) return;
        // Fetch Templates
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        axios.get(`${apiUrl}/api/templates?tenantId=${tenantId}`)
            .then(res => setTemplates(res.data.data));

        // Fetch Campaigns
        fetchCampaigns();
    }, [tenantId]);

    const fetchCampaigns = () => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        axios.get(`${apiUrl}/api/campaigns?tenantId=${tenantId}`)
            .then(res => setCampaigns(res.data));
    };

    const handleSend = async () => {
        if (!selectedTemplate || !phones || !campaignName) return;
        setLoading(true);

        const template = templates.find(t => t.id === selectedTemplate);
        if (!template) return;

        const contactList = phones.split(',').map(p => ({ phone: p.trim(), name: 'Valued Customer' })).filter(c => c.phone);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            await axios.post(`${apiUrl}/api/campaigns`, {
                tenantId,
                name: campaignName,
                templateId: template.id,
                templateName: template.name,
                language: template.language,
                components: template.components,
                contacts: contactList
            });
            alert('Campaign Started! Messages are being sent in the background.');
            setCampaignName('');
            setPhones('');
            fetchCampaigns();
        } catch (err) {
            alert('Failed to send broadcast');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0c1317] p-8 gap-8 overflow-y-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#e9edef]">Broadcast Campaigns</h1>
                    <p className="text-[#8696a0] mt-1">Send bulk messages to your customers using approved templates.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create Campaign Form */}
                <div className="lg:col-span-1 bg-[#202c33] p-6 rounded-2xl border border-[#313d45] h-fit sticky top-6 shadow-xl shadow-black/20">
                    <h2 className="text-xl font-semibold text-[#e9edef] mb-6 flex items-center gap-3 pb-4 border-b border-[#313d45]">
                        <div className="p-2 bg-[#00a884]/10 rounded-lg text-[#00a884]">
                            <Send size={24} />
                        </div>
                        New Broadcast
                    </h2>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#8696a0] block uppercase tracking-wide">Campaign Name</label>
                            <input
                                className="w-full bg-[#111b21] border border-[#313d45] rounded-xl p-3 text-[#d1d7db] focus:border-[#00a884] outline-none transition-colors placeholder:text-[#536d7a]"
                                placeholder="e.g. Summer Sale Promo 2024"
                                value={campaignName}
                                onChange={e => setCampaignName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#8696a0] block uppercase tracking-wide">Select Template</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-[#111b21] border border-[#313d45] rounded-xl p-3 text-[#d1d7db] focus:border-[#00a884] outline-none appearance-none cursor-pointer"
                                    value={selectedTemplate}
                                    onChange={e => setSelectedTemplate(e.target.value)}
                                >
                                    <option value="">-- Choose a Template --</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.language}) - {t.category}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#8696a0]">▼</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#8696a0] block uppercase tracking-wide">Recipients</label>
                            <textarea
                                className="w-full bg-[#111b21] border border-[#313d45] rounded-xl p-3 text-[#d1d7db] focus:border-[#00a884] outline-none h-40 resize-none font-mono text-sm leading-relaxed placeholder:text-[#536d7a]"
                                placeholder="1555123456,&#10;1555987654,&#10;..."
                                value={phones}
                                onChange={e => setPhones(e.target.value)}
                            />
                            <p className="text-xs text-[#8696a0] flex items-center gap-1">
                                ℹ️ Enter phone numbers separated by commas or newlines.
                            </p>
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={loading || !selectedTemplate || !phones}
                            className="w-full bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 disabled:cursor-not-allowed text-[#111b21] py-3.5 rounded-xl font-bold transition-all flex justify-center items-center gap-2 mt-4 shadow-lg shadow-[#00a884]/20 hover:shadow-[#00a884]/40 hover:-translate-y-0.5"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                            Launch Campaign
                        </button>
                    </div>
                </div>

                {/* History */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-semibold text-[#e9edef] mb-6 flex items-center gap-3">
                        <div className="p-2 bg-[#313d45] rounded-lg text-[#d1d7db]">
                            <FileText size={24} />
                        </div>
                        Broadcast History
                    </h2>
                    <div className="grid gap-4">
                        {campaigns.map(c => (
                            <div key={c.id} className="bg-[#1f2c34] p-5 rounded-2xl border border-[#313d45] flex justify-between items-center group hover:bg-[#202c33] transition-all hover:border-[#00a884]/30 hover:shadow-lg">
                                <div>
                                    <h3 className="font-semibold text-[#e9edef] text-lg mb-1">{c.name}</h3>
                                    <p className="text-sm text-[#8696a0] flex items-center gap-2">
                                        Template: <span className="text-[#d1d7db] font-medium">{c.templateName || 'Unknown'}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 uppercase tracking-wide ${c.status === 'completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                        c.status === 'processing' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20 animate-pulse' :
                                            'bg-[#313d45] text-[#8696a0]'
                                        }`}>
                                        {c.status}
                                    </div>
                                    <p className="text-xs text-[#8696a0] font-mono">{new Date(c.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {campaigns.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-16 text-[#8696a0] bg-[#1f2c34/50] rounded-3xl border-2 border-dashed border-[#313d45]">
                            <Send size={48} className="mb-4 opacity-50" />
                            <h3 className="text-lg font-medium text-[#d1d7db]">No campaigns yet</h3>
                            <p className="mt-2">Create your first broadcast using the form on the left.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
