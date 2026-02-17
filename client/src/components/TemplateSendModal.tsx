import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, X, Send, FileText, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface Template {
    id: string;
    name: string;
    language: string;
    status: string;
    category: string;
    components: Component[];
}

interface Component {
    type: string;
    text?: string;
    format?: string;
    example?: { body_text: string[][] };
}

interface TemplateSendModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (template: Template, variables: string[]) => void;
    tenantId: string;
}

export const TemplateSendModal = ({ isOpen, onClose, onSend, tenantId }: TemplateSendModalProps) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [variableValues, setVariableValues] = useState<string[]>([]);
    const [step, setStep] = useState<'select' | 'customize'>('select');

    useEffect(() => {
        if (isOpen && tenantId) {
            fetchTemplates();
            setStep('select');
            setSelectedTemplate(null);
            setVariableValues([]);
            setSearchTerm('');
        }
    }, [isOpen, tenantId]);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/templates?tenantId=${tenantId}`);
            setTemplates(res.data.templates || res.data.data || []);
        } catch (error) {
            console.error('Failed to fetch templates', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateSelect = (template: Template) => {
        if (template.status !== 'APPROVED') return; // Only allow sending approved templates
        setSelectedTemplate(template);

        // Extract variables count
        const bodyComponent = template.components.find(c => c.type === 'BODY');
        const text = bodyComponent?.text || '';
        const matches = text.match(/{{(\d+)}}/g);
        const count = matches ? new Set(matches).size : 0;

        setVariableValues(new Array(count).fill(''));
        setStep('customize');
    };

    const handleSend = () => {
        if (selectedTemplate) {
            onSend(selectedTemplate, variableValues);
            onClose();
        }
    };

    const getPreviewText = () => {
        if (!selectedTemplate) return '';
        const bodyComponent = selectedTemplate.components.find(c => c.type === 'BODY');
        let text = bodyComponent?.text || '';
        variableValues.forEach((val, idx) => {
            text = text.replace(`{{${idx + 1}}}`, val || `{{${idx + 1}}}`);
        });
        return text;
    }

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#202c33] w-full max-w-2xl rounded-2xl shadow-2xl border border-[#313d45] flex flex-col max-h-[85vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-[#313d45] flex justify-between items-center bg-[#2a3942]">
                        <h2 className="text-xl font-semibold text-[#e9edef] flex items-center gap-2">
                            <FileText className="text-[#00a884]" size={24} />
                            {step === 'select' ? 'Select Template' : 'Customize Message'}
                        </h2>
                        <button onClick={onClose} className="text-[#aebac1] hover:text-[#e9edef] transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {step === 'select' ? (
                            <>
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Search templates..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-[#111b21] text-[#d1d7db] pl-10 pr-4 py-3 rounded-xl border border-[#313d45] focus:outline-none focus:border-[#00a884] placeholder-[#8696a0] transition-all"
                                    />
                                </div>

                                {loading ? (
                                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-[#00a884]" size={32} /></div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {filteredTemplates.map(t => (
                                            <div
                                                key={t.id}
                                                onClick={() => handleTemplateSelect(t)}
                                                className={`p-4 rounded-xl border border-[#313d45] flex justify-between items-center cursor-pointer transition-all ${t.status === 'APPROVED'
                                                    ? 'bg-[#111b21] hover:bg-[#2a3942] hover:border-[#00a884]/50'
                                                    : 'bg-[#111b21]/50 opacity-50 cursor-not-allowed'
                                                    }`}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-medium text-[#e9edef]">{t.name}</h3>
                                                        <span className="text-xs text-[#8696a0] bg-[#202c33] px-2 py-0.5 rounded uppercase">{t.language}</span>
                                                    </div>
                                                    <p className="text-sm text-[#8696a0] mt-1 line-clamp-1">
                                                        {t.components.find((c: any) => c.type === 'BODY')?.text}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-xs px-2 py-1 rounded font-medium ${t.status === 'APPROVED' ? 'text-green-400 bg-green-400/10' : 'text-yellow-400 bg-yellow-400/10'
                                                        }`}>
                                                        {t.status}
                                                    </span>
                                                    <ChevronRight size={18} className="text-[#8696a0]" />
                                                </div>
                                            </div>
                                        ))}
                                        {filteredTemplates.length === 0 && (
                                            <div className="text-center p-8 text-[#8696a0]">
                                                <AlertCircle className="mx-auto mb-2 opacity-50" size={32} />
                                                <p>No templates found.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col md:flex-row gap-6 h-full">
                                {/* Inputs */}
                                <div className="flex-1 space-y-4">
                                    <div className="bg-[#111b21] p-4 rounded-xl border border-[#313d45]">
                                        <h3 className="text-[#e9edef] font-medium mb-2">Template Variables</h3>
                                        <p className="text-sm text-[#8696a0] mb-4">Fill in the values for the variables in your message.</p>

                                        {variableValues.length > 0 ? (
                                            <div className="space-y-3">
                                                {variableValues.map((val, idx) => (
                                                    <div key={idx}>
                                                        <label className="text-xs text-[#00a884] font-medium mb-1 block">Variable {'{{'}{idx + 1}{'}}'}</label>
                                                        <input
                                                            type="text"
                                                            value={val}
                                                            onChange={(e) => {
                                                                const newVals = [...variableValues];
                                                                newVals[idx] = e.target.value;
                                                                setVariableValues(newVals);
                                                            }}
                                                            placeholder={`Value for {{${idx + 1}}}`}
                                                            className="w-full bg-[#202c33] text-[#d1d7db] px-3 py-2 rounded-lg border border-[#313d45] focus:outline-none focus:border-[#00a884]"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-[#8696a0] italic">This template has no variables.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="w-full md:w-[280px] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat rounded-xl overflow-hidden flex flex-col shadow-inner">
                                    <div className="bg-[#008069] h-12 flex items-center px-4 shadow-sm">
                                        <div className="text-white font-medium text-sm">WhatsApp Preview</div>
                                    </div>
                                    <div className="flex-1 p-4 bg-[#e5ddd5]/90">
                                        <div className="bg-white p-2 rounded-lg rounded-tr-none shadow-sm text-sm text-[#111b21] relative max-w-[90%] self-end ml-auto">
                                            <p className="whitespace-pre-wrap leading-relaxed">{getPreviewText()}</p>
                                            <div className="text-[10px] text-[#8696a0] text-right mt-1 flex items-center justify-end gap-1">
                                                Based on template
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-[#313d45] bg-[#202c33] flex justify-between items-center">
                        {step === 'customize' ? (
                            <button
                                onClick={() => setStep('select')}
                                className="text-[#00a884] font-medium px-4 py-2 hover:bg-[#2a3942] rounded-lg transition-colors"
                            >
                                Back
                            </button>
                        ) : (
                            <div></div>
                        )}

                        {step === 'customize' && (
                            <button
                                onClick={handleSend}
                                className="bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] px-6 py-2.5 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-[#00a884]/20 transition-all transform active:scale-95"
                            >
                                <Send size={18} /> Send Message
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
