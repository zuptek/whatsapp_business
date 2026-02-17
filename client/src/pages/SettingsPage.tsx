import { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, MessageSquare, Clock, Save, Phone, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface SettingsPageProps {
    token: string;
}

interface AutoResponseConfig {
    welcomeEnabled: boolean;
    welcomeMessage: string;
    awayEnabled: boolean;
    awayMessage: string;
    businessHours: {
        start: string;
        end: string;
        timezone: string;
        days: string[];
    };
}

const DEFAULT_CONFIG: AutoResponseConfig = {
    welcomeEnabled: false,
    welcomeMessage: 'Hi! Thanks for reaching out. How can we help you today?',
    awayEnabled: false,
    awayMessage: 'Thanks for your message! We\'re currently away but will get back to you soon.',
    businessHours: {
        start: '09:00',
        end: '18:00',
        timezone: 'Asia/Kolkata',
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    }
};

export function SettingsPage({ token }: SettingsPageProps) {
    const [tenant, setTenant] = useState<any>(null);
    const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
    const [selectedPhoneId, setSelectedPhoneId] = useState<string>('');
    const [config, setConfig] = useState<AutoResponseConfig>(DEFAULT_CONFIG);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    useEffect(() => {
        loadSettings();
    }, [token]);

    const loadSettings = async () => {
        try {
            const response = await axios.get('http://localhost:3000/api/settings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTenant(response.data.tenant);
            setPhoneNumbers(response.data.phoneNumbers);

            if (response.data.phoneNumbers.length > 0) {
                const first = response.data.phoneNumbers[0];
                setSelectedPhoneId(first.id);
                setConfig(first.autoResponseConfig || DEFAULT_CONFIG);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneChange = (id: string) => {
        setSelectedPhoneId(id);
        const phone = phoneNumbers.find(p => p.id === id);
        if (phone) {
            setConfig(phone.autoResponseConfig || DEFAULT_CONFIG);
        }
    };

    const saveSettings = async () => {
        if (!selectedPhoneId) return;
        setSaving(true);
        try {
            await axios.put(`http://localhost:3000/api/settings/phone/${selectedPhoneId}`, config, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update local state
            setPhoneNumbers(prev => prev.map(p => p.id === selectedPhoneId ? { ...p, autoResponseConfig: config } : p));
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const connectWhatsApp = () => {
        // Redirect to Meta OAuth
        // Construct URL
        const appId = import.meta.env.VITE_META_APP_ID;
        console.log('Meta App ID:', appId);

        if (!appId) {
            alert('App ID is missing! Please check your configuration.');
            return;
        }

        const redirectUri = `${window.location.origin}/whatsapp-callback`;
        const scope = 'whatsapp_business_management,whatsapp_business_messaging';
        const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
        window.location.href = url;
    };

    const toggleDay = (day: string) => {
        setConfig(prev => ({
            ...prev,
            businessHours: {
                ...prev.businessHours,
                days: prev.businessHours.days.includes(day)
                    ? prev.businessHours.days.filter(d => d !== day)
                    : [...prev.businessHours.days, day]
            }
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-400">Loading settings...</div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-gray-900 p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Settings className="w-8 h-8 text-cyan-400" />
                        <div>
                            <h1 className="text-3xl font-bold text-white">Settings</h1>
                            <p className="text-gray-400 text-sm mt-1">{tenant?.businessName}</p>
                        </div>
                    </div>

                    <button
                        onClick={connectWhatsApp}
                        className="bg-[#1877F2] hover:bg-[#166fe5] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                        <Plus size={18} />
                        Connect WhatsApp
                    </button>
                </div>

                {/* Phone Number Selection */}
                {phoneNumbers.length > 0 ? (
                    <div className="mb-8">
                        <label className="text-gray-400 text-sm block mb-3 uppercase tracking-wider font-semibold">Select Phone Number</label>
                        <div className="flex gap-4 overflow-x-auto pb-2">
                            {phoneNumbers.map(phone => (
                                <button
                                    key={phone.id}
                                    onClick={() => handlePhoneChange(phone.id)}
                                    className={`flex items-center gap-3 px-5 py-3 rounded-xl border transition-all ${selectedPhoneId === phone.id
                                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 ring-1 ring-cyan-500/50'
                                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750'
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg ${selectedPhoneId === phone.id ? 'bg-cyan-500/20' : 'bg-gray-700'}`}>
                                        <Phone size={20} />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold">{phone.name}</div>
                                        <div className="text-xs opacity-70">{phone.telNumber}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-xl mb-8 flex items-center gap-4">
                        <div className="p-3 bg-yellow-500/20 rounded-full text-yellow-500">
                            <Phone size={24} />
                        </div>
                        <div>
                            <h3 className="text-yellow-500 font-bold text-lg">No WhatsApp Numbers Connected</h3>
                            <p className="text-yellow-200/70 text-sm mt-1">Connect your WhatsApp Business account to start messaging.</p>
                        </div>
                    </div>
                )}

                {selectedPhoneId && (
                    <>
                        {/* Welcome Message Section */}
                        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="w-6 h-6 text-green-400" />
                                    <h2 className="text-xl font-semibold text-white">Welcome Message</h2>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.welcomeEnabled}
                                        onChange={(e) => setConfig({ ...config, welcomeEnabled: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                                </label>
                            </div>
                            <p className="text-gray-400 text-sm mb-4">
                                Automatically send this message to new contacts when they first reach out.
                            </p>
                            <textarea
                                value={config.welcomeMessage}
                                onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                                disabled={!config.welcomeEnabled}
                                className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-cyan-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                rows={3}
                                placeholder="Enter your welcome message..."
                            />
                        </div>

                        {/* Away Message Section */}
                        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Clock className="w-6 h-6 text-yellow-400" />
                                    <h2 className="text-xl font-semibold text-white">Away Message</h2>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.awayEnabled}
                                        onChange={(e) => setConfig({ ...config, awayEnabled: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                                </label>
                            </div>
                            <p className="text-gray-400 text-sm mb-4">
                                Send this message when contacts reach out outside business hours.
                            </p>
                            <textarea
                                value={config.awayMessage}
                                onChange={(e) => setConfig({ ...config, awayMessage: e.target.value })}
                                disabled={!config.awayEnabled}
                                className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-cyan-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                                rows={3}
                                placeholder="Enter your away message..."
                            />

                            {/* Business Hours */}
                            {config.awayEnabled && (
                                <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                                    <h3 className="text-white font-medium mb-3">Business Hours</h3>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="text-gray-400 text-sm block mb-2">Start Time</label>
                                            <input
                                                type="time"
                                                value={config.businessHours.start}
                                                onChange={(e) => setConfig({
                                                    ...config,
                                                    businessHours: { ...config.businessHours, start: e.target.value }
                                                })}
                                                className="w-full bg-gray-600 text-white rounded-lg p-2 border border-gray-500 focus:border-cyan-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-gray-400 text-sm block mb-2">End Time</label>
                                            <input
                                                type="time"
                                                value={config.businessHours.end}
                                                onChange={(e) => setConfig({
                                                    ...config,
                                                    businessHours: { ...config.businessHours, end: e.target.value }
                                                })}
                                                className="w-full bg-gray-600 text-white rounded-lg p-2 border border-gray-500 focus:border-cyan-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="text-gray-400 text-sm block mb-2">Working Days</label>
                                        <div className="flex flex-wrap gap-2">
                                            {weekDays.map(day => (
                                                <button
                                                    key={day}
                                                    onClick={() => toggleDay(day)}
                                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${config.businessHours.days.includes(day)
                                                        ? 'bg-cyan-500 text-white'
                                                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                                        }`}
                                                >
                                                    {day}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-gray-400 text-sm block mb-2">Timezone</label>
                                        <select
                                            value={config.businessHours.timezone}
                                            onChange={(e) => setConfig({
                                                ...config,
                                                businessHours: { ...config.businessHours, timezone: e.target.value }
                                            })}
                                            className="w-full bg-gray-600 text-white rounded-lg p-2 border border-gray-500 focus:border-cyan-500 focus:outline-none"
                                        >
                                            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                            <option value="America/New_York">America/New_York (EST)</option>
                                            <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                                            <option value="Europe/London">Europe/London (GMT)</option>
                                            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Save Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={saveSettings}
                            disabled={saving}
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-5 h-5" />
                            {saving ? 'Saving...' : 'Save Settings'}
                        </motion.button>
                    </>
                )}
            </motion.div>
        </div>
    );
}
