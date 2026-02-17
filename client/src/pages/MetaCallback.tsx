import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export const MetaCallback = ({ token }: { token: string | null }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        const code = searchParams.get('code');
        if (!code || !token) {
            setStatus('error');
            return;
        }

        axios.post('http://localhost:3001/api/meta/callback', { code }, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(() => {
                setStatus('success');
                setTimeout(() => navigate('/settings'), 2000);
            })
            .catch((err) => {
                console.error(err);
                setStatus('error');
            });
    }, [searchParams, token, navigate]);

    return (
        <div className="min-h-screen bg-[#0c1317] flex items-center justify-center text-[#e9edef]">
            <div className="text-center space-y-4">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-12 h-12 animate-spin mx-auto text-[#00a884]" />
                        <p>Connecting your WhatsApp Account...</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                        <p>Connected Successfully! Redirecting...</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <XCircle className="w-12 h-12 mx-auto text-red-500" />
                        <p>Failed to connect. Please try again.</p>
                        <button
                            onClick={() => navigate('/settings')}
                            className="text-[#00a884] hover:underline"
                        >
                            Return to Settings
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
