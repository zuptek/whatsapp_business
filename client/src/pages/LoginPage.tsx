import { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { MessageSquare, Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';

interface LoginPageProps {
    onLogin: (token: string, user: any) => void;
}

export const LoginPage = ({ onLogin }: LoginPageProps) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const payload = isLogin ? { email, password } : { email, password, name, businessName };

            const res = await axios.post(`http://localhost:3000${endpoint}`, payload);
            onLogin(res.data.token, res.data.user);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:3000/api/auth/google', {
                credential: credentialResponse.credential
            });
            onLogin(res.data.token, res.data.user);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Google Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0c1317] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00a884]/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#34b7f1]/5 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-[#1f2c34] border border-[#313d45] rounded-2xl p-8 shadow-2xl relative z-10"
            >
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-[#00a884] rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#00a884]/20">
                        <MessageSquare className="text-white" size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-[#e9edef] mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
                    <p className="text-[#8696a0] text-sm">
                        {isLogin ? 'Sign in to your dashboard' : 'Get started with Upgreat'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-[#8696a0] uppercase tracking-wider">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-[#111b21] border border-[#313d45] rounded-xl p-3 text-[#d1d7db] focus:border-[#00a884] outline-none transition-all placeholder:text-[#536d7a]"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-[#8696a0] uppercase tracking-wider">Business Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-[#111b21] border border-[#313d45] rounded-xl p-3 text-[#d1d7db] focus:border-[#00a884] outline-none transition-all placeholder:text-[#536d7a]"
                                    placeholder="Acme Corp"
                                    value={businessName}
                                    onChange={e => setBusinessName(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#8696a0] uppercase tracking-wider">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]" size={18} />
                            <input
                                type="email"
                                required
                                className="w-full bg-[#111b21] border border-[#313d45] rounded-xl pl-10 p-3 text-[#d1d7db] focus:border-[#00a884] outline-none transition-all placeholder:text-[#536d7a]"
                                placeholder="name@company.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#8696a0] uppercase tracking-wider">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]" size={18} />
                            <input
                                type="password"
                                required
                                className="w-full bg-[#111b21] border border-[#313d45] rounded-xl pl-10 p-3 text-[#d1d7db] focus:border-[#00a884] outline-none transition-all placeholder:text-[#536d7a]"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-bold py-3 rounded-xl transition-all shadow-lg shadow-[#00a884]/20 hover:shadow-[#00a884]/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                {isLogin ? 'Sign In' : 'Create Account'}
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#313d45]"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-[#1f2c34] text-[#8696a0]">Or continue with</span>
                    </div>
                </div>

                <div className="flex justify-center">
                    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Google Login Failed')}
                            theme="filled_black"
                            shape="circle"
                        />
                    </GoogleOAuthProvider>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-[#8696a0] text-sm">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-[#00a884] hover:text-[#00c298] font-semibold transition-colors"
                        >
                            {isLogin ? 'Sign up' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};
