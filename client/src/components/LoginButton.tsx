import { useState, useEffect } from 'react';
import axios from 'axios';
import { Facebook } from 'lucide-react';

declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
    }
}

interface LoginButtonProps {
    appId: string;
    onSuccess: (token: string) => void;
    onError: (error: string) => void;
}

export const LoginButton = ({ appId, onSuccess, onError }: LoginButtonProps) => {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load Facebook SDK
        if (!window.FB) {
            window.fbAsyncInit = function () {
                window.FB.init({
                    appId: appId,
                    cookie: true,
                    xfbml: true,
                    version: 'v18.0'
                });
            };

            (function (d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) { return; }
                js = d.createElement(s) as HTMLScriptElement; js.id = id;
                js.src = "https://connect.facebook.net/en_US/sdk.js";
                fjs.parentNode?.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));
        }
    }, [appId]);

    const handleLogin = () => {
        setLoading(true);
        if (!window.FB) {
            onError('Facebook SDK not loaded');
            setLoading(false);
            return;
        }

        window.FB.login((response: any) => {
            if (response.authResponse) {
                // Note: For embedded signup, we might need a specific flow or use the code flow.
                // Standard FB.login returns accessToken directly in implicit flow unless configured otherwise.
                // BUT for "System User" exchange, we typically need a code.
                // If response_type='code' is not supported in JS SDK easily, we might get an accessToken short-lived one.
                // Let's assume we get a code or short-lived token to exchange.
                // Actually, for Embedded Signup, the "Login with Facebook" button is often used to launch a popup with specific config ID.

                // MVP: Send whatever we get (code or token) to backend
                const authCode = response.authResponse.code || response.authResponse.accessToken;

                axios.post('http://localhost:3000/api/auth/meta-callback', { code: authCode })
                    .then((res) => {
                        onSuccess(res.data.token);
                    })
                    .catch((err) => {
                        onError(err.response?.data?.error || 'Login failed');
                    })
                    .finally(() => {
                        setLoading(false);
                    });
            } else {
                onError('User cancelled login or did not fully authorize.');
                setLoading(false);
            }
        }, {
            scope: 'whatsapp_business_management,whatsapp_business_messaging',
            response_type: 'code', // Try to request code flow
            extras: {
                feature: 'whatsapp_embedded_signup',
                // version: 2 // might be needed
            }
        });
    };

    return (
        <button
            onClick={handleLogin}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-full font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        >
            <Facebook className="w-5 h-5 fill-current" />
            {loading ? 'Connecting...' : 'Connect with Facebook'}
        </button>
    );
};
