import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { api } from '../lib/api';
import { Droplets, Eye, EyeOff, AlertCircle, Loader } from 'lucide-react';
import { DEMO_USERS, DEMO_STATIONS, DEMO_ALERTS, DEMO_DASHBOARD, DEMO_TOKEN } from '../lib/demoData';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@aquasentinel.local');
  const [password, setPassword] = useState('admin123');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const { setAuth } = useAppStore();
  const navigate = useNavigate();

  const loginWithDemoData = (userEmail: string, userPassword: string): boolean => {
    const account = DEMO_USERS[userEmail];
    if (!account || account.password !== userPassword) return false;
    // Populate the store with demo data
    const store = useAppStore.getState();
    setAuth(DEMO_TOKEN, account.user);
    store.setStations(DEMO_STATIONS);
    store.setAlerts(DEMO_ALERTS);
    store.setDashboard(DEMO_DASHBOARD);
    store.setSseConnected(false);
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      setAuth(res.data.access_token, res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      // If backend is unreachable, fall back to demo mode automatically
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK' || !err.response) {
        if (loginWithDemoData(email, password)) {
          setDemoMode(true);
          navigate('/dashboard');
          return;
        }
        setError('Invalid demo credentials. Use one of the demo accounts below.');
      } else {
        const msg = err?.response?.data?.detail;
        setError(msg ?? 'Login failed. Check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'family@aquasentinel.local', role: 'Family', password: 'family123', color: 'bg-teal/20 text-teal-700 dark:text-teal-300' },
    { email: 'admin@aquasentinel.local', role: 'Admin', password: 'admin123', color: 'bg-purple-100 text-purple-700 dark:text-purple-300' },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-navy-dark via-navy to-ocean-dark">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-ocean opacity-20" />
          <div className="absolute top-1/2 -right-24 w-72 h-72 rounded-full bg-teal opacity-15" />
          <div className="absolute -bottom-24 left-1/4 w-56 h-56 rounded-full bg-ocean-light opacity-10" />
        </div>

        <div className="relative z-10 max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shadow-xl">
              <svg width="48" height="48" viewBox="0 0 36 36" fill="none">
                <path d="M18 2C18 2 6 14 6 22a12 12 0 0024 0C30 14 18 2 18 2z" fill="white" opacity="0.9"/>
                <path d="M18 10C18 10 11 18 11 23a7 7 0 0014 0c0-5-7-13-7-13z" fill="#0EA5A4" opacity="0.8"/>
                <circle cx="18" cy="24" r="3" fill="white" opacity="0.9"/>
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-3">AquaSentinel AI</h1>
          <p className="text-xl text-white/70 mb-8">Detect. Investigate. Predict. Respond.</p>

          <div className="grid grid-cols-2 gap-4 text-left">
            {[
              { icon: '🌊', title: 'Real-time Monitoring', desc: '12+ stations, 5-second updates' },
              { icon: '🧪', title: 'Chemical Intelligence', desc: '25+ substance reference database' },
              { icon: '📡', title: 'IoT Connected', desc: 'ESP32 sensor integration' },
              { icon: '🔮', title: 'Pollution Forecast', desc: 'Travel-time modelling with uncertainty' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="font-semibold text-sm">{title}</div>
                <div className="text-white/60 text-xs mt-1">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel: login form */}
      <div className="w-full lg:w-[420px] flex items-center justify-center p-8 bg-white dark:bg-navy">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="18" fill="#0A6FB8" opacity="0.15"/>
              <path d="M18 6C18 6 10 14 10 20a8 8 0 0016 0c0-6-8-14-8-14z" fill="#0A6FB8"/>
              <path d="M18 12C18 12 13 18 13 21a5 5 0 0010 0c0-3-5-9-5-9z" fill="#0EA5A4" opacity="0.7"/>
            </svg>
            <div>
              <div className="font-bold text-navy dark:text-white">AquaSentinel AI</div>
              <div className="text-xs text-slate-400">Detect. Investigate. Predict. Respond.</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Sign in</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Access your monitoring dashboard</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  required
                  className="input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-critical text-sm bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-2.5 text-sm font-semibold"
            >
              {loading ? <Loader size={16} className="animate-spin" /> : <Droplets size={16} />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2 font-medium uppercase tracking-wide">
              Demo accounts
            </p>
            <div className="space-y-2">
              {demoAccounts.map(({ email: e, role, password: pwd, color }) => (
                <button
                  key={e}
                  onClick={() => { setEmail(e); setPassword(pwd); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-navy-light transition-colors text-sm"
                >
                  <span className="text-slate-600 dark:text-slate-300 font-mono text-xs">{e}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{role}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            For demo use only. Not for production deployment.
          </p>
        </div>
      </div>
    </div>
  );
}
