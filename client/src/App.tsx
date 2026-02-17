
import { motion, useScroll, useSpring } from 'framer-motion';
import { MessageSquare, Zap, BarChart3, Users, ShieldCheck, Database, LayoutGrid } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { Layout } from './components/Layout';
import { TemplatesPage } from './pages/TemplatesPage';
import { BroadcastsPage } from './pages/BroadcastsPage';
import { SettingsPage } from './pages/SettingsPage';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { MetaCallback } from './pages/MetaCallback';
import { useState } from 'react';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          token ? <Navigate to="/" /> : <LoginPage onLogin={(t, _u) => {
            setToken(t);
            localStorage.setItem('token', t);
          }} />
        } />

        {token ? (
          <Route element={<Layout onLogout={handleLogout} />}>
            <Route index element={<ChatInterface token={token} />} />
            <Route path="templates" element={<TemplatesPage token={token} />} />
            <Route path="broadcasts" element={<BroadcastsPage token={token} />} />
            <Route path="settings" element={<SettingsPage token={token} />} />
            <Route path="whatsapp-callback" element={<MetaCallback token={token} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        ) : (
          <Route path="*" element={<LandingPage />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

// Extract Landing Page to keep App clean? Or just inline it here for now but wrapped in a component.
function LandingPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-cyan-500/30">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 origin-left z-50"
        style={{ scaleX }}
      />

      {/* Navbar */}
      <nav className="fixed w-full z-40 backdrop-blur-xl border-b border-white/5 bg-neutral-950/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">
              Upgreat
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Features</a>
            <a href="#solutions" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Solutions</a>
            <a href="#pricing" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Pricing</a>
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-medium"
            >
              Log In
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-medium shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>


      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-neutral-950 to-neutral-950" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl animate-pulse delay-700" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-cyan-400 mb-8"
            >
              <Zap className="w-3 h-3" />
              <span>v2.0 is now live</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-8"
            >
              Connect with customers on <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
                WhatsApp Application
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-neutral-400 mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              The advanced CRM for modern businesses. Automate support, drive sales,
              and manage relationships at scale with our unified WhatsApp platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-lg font-bold shadow-xl shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                Start Free Trial <Zap className="w-5 h-5 fill-current" />
              </button>

              <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-medium flex items-center justify-center gap-2">
                View Demo
              </button>
            </motion.div>
          </div>

          {/* Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, type: "spring" }}
            className="mt-24 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent z-20" />
            <div className="rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur-sm p-2 shadow-2xl">
              <div className="rounded-xl overflow-hidden border border-white/5 bg-neutral-950 aspect-[16/9] relative group">
                {/* Mock UI Elements */}
                <div className="absolute top-0 left-0 w-64 h-full border-r border-white/5 bg-neutral-900/30 hidden md:block" />
                <div className="absolute top-0 left-64 right-0 h-16 border-b border-white/5 bg-neutral-900/30 hidden md:flex items-center px-6 justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                    <div className="h-2 w-24 bg-white/10 rounded-full" />
                  </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-neutral-500 font-medium">Dashboard Preview</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-white/5 bg-neutral-900/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Active Users', value: '10k+' },
              { label: 'Messages Sent', value: '50M+' },
              { label: 'Uptime', value: '99.9%' },
              { label: 'Countries', value: '120+' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <h3 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-500 mb-2">
                  {stat.value}
                </h3>
                <p className="text-sm text-neutral-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-20 text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Everything you need to <br /> scale support</h2>
            <p className="text-neutral-400 text-lg">Powerful features aimed at growth-focused teams. We provide the tools, you provide the magic.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <MessageSquare className="w-6 h-6 text-cyan-400" />,
                title: "Unified Inbox",
                desc: "Manage all customer conversations from a single, collaborative interface."
              },
              {
                icon: <Users className="w-6 h-6 text-blue-400" />,
                title: "Team Collaboration",
                desc: "Assign chats, add internal notes, and work together seamlessly."
              },
              {
                icon: <BarChart3 className="w-6 h-6 text-purple-400" />,
                title: "Analytics & Insights",
                desc: "Track response times, resolution rates, and team performance."
              },
              {
                icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
                title: "Enterprise Security",
                desc: "Bank-grade encryption and compliance with global data standards."
              },
              {
                icon: <Database className="w-6 h-6 text-orange-400" />,
                title: "CRM Integration",
                desc: "Connect with your existing tools like Salesforce, HubSpot, and more."
              },
              {
                icon: <LayoutGrid className="w-6 h-6 text-pink-400" />,
                title: "Custom Workflows",
                desc: "Automate repetitive tasks with a visual drag-and-drop builder."
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all cursor-default"
              >
                <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-neutral-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-b from-blue-900/20 to-neutral-900 border border-white/10 p-12 md:p-24 text-center">
            <div className="absolute top-0 right-0 p-12 opacity-20">
              <div className="w-64 h-64 bg-cyan-500 blur-[100px] rounded-full" />
            </div>
            <div className="absolute bottom-0 left-0 p-12 opacity-20">
              <div className="w-64 h-64 bg-blue-600 blur-[100px] rounded-full" />
            </div>

            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to transform your <br /> customer support?</h2>
              <p className="text-xl text-neutral-400 mb-10 max-w-2xl mx-auto">
                Join thousands of competitive businesses using Upgreat to deliver exceptional experiences.
              </p>
              <button className="px-8 py-4 rounded-full bg-white text-neutral-950 font-bold hover:bg-neutral-200 transition-colors shadow-xl shadow-white/10">
                Get Started Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-neutral-500 text-sm">© 2024 Upgreat Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-neutral-500 hover:text-white transition-colors text-sm">Privacy</a>
            <a href="#" className="text-neutral-500 hover:text-white transition-colors text-sm">Terms</a>
            <a href="#" className="text-neutral-500 hover:text-white transition-colors text-sm">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
