import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Map, FlaskConical, Atom, TrendingUp,
  FileText, BookOpen, Bell, Settings, Moon, Sun, Wifi, WifiOff,
  LogOut, User, ChevronRight, Radio
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import DataModeBadge from './DataModeBadge';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/map', icon: Map, label: 'Live Map' },
  { to: '/laboratory', icon: FlaskConical, label: 'Test Laboratory' },
  { to: '/chemicals', icon: Atom, label: 'Chemical Intelligence' },
  { to: '/forecast', icon: TrendingUp, label: 'Pollution Forecast' },
  { to: '/reports', icon: FileText, label: 'Reports & History' },
  { to: '/blog', icon: BookOpen, label: 'Research Blog' },
  { to: '/alerts', icon: Bell, label: 'Devices & Alerts' },
];

export default function Layout() {
  const { darkMode, toggleDarkMode, user, logout, unreadAlerts, markAlertsRead,
    sseConnected, dataMode, setDataMode } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg-light dark:bg-navy-dark">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white dark:bg-navy border-r border-slate-100 dark:border-slate-700 shadow-sm z-10 flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="18" fill="#0A6FB8" opacity="0.15"/>
                <path d="M18 6C18 6 10 14 10 20a8 8 0 0016 0c0-6-8-14-8-14z" fill="#0A6FB8"/>
                <path d="M18 12C18 12 13 18 13 21a5 5 0 0010 0c0-3-5-9-5-9z" fill="#0EA5A4" opacity="0.7"/>
                <circle cx="18" cy="22" r="2" fill="white" opacity="0.8"/>
              </svg>
            </div>
            <div>
              <div className="font-bold text-navy dark:text-white text-sm leading-tight">AquaSentinel AI</div>
              <div className="text-xs text-slate-400 leading-tight">Detect. Investigate. Predict.</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-thin">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => { if (to === '/alerts') markAlertsRead(); }}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={17} />
              <span>{label}</span>
              {to === '/alerts' && unreadAlerts > 0 && (
                <span className="ml-auto bg-critical text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold">
                  {unreadAlerts > 99 ? '99+' : unreadAlerts}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom user section */}
        <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-ocean flex items-center justify-center text-white text-xs font-semibold">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                {user?.name ?? 'Demo User'}
              </div>
              <div className="text-xs text-slate-400 truncate capitalize">{user?.role ?? 'family'}</div>
            </div>
            <button onClick={handleLogout} title="Logout" className="text-slate-400 hover:text-critical transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-navy border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 px-4 lg:px-6 z-10 flex-shrink-0">
          {/* Mobile: Logo */}
          <div className="md:hidden flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="18" fill="#0A6FB8" opacity="0.15"/>
              <path d="M18 6C18 6 10 14 10 20a8 8 0 0016 0c0-6-8-14-8-14z" fill="#0A6FB8"/>
              <path d="M18 12C18 12 13 18 13 21a5 5 0 0010 0c0-3-5-9-5-9z" fill="#0EA5A4" opacity="0.7"/>
            </svg>
            <span className="font-bold text-navy dark:text-white text-sm">AquaSentinel</span>
          </div>

          {/* SSE indicator */}
          <div className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
            sseConnected
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
          }`}>
            {sseConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {sseConnected ? 'Live' : 'Connecting...'}
          </div>

          <div className="flex-1" />

          {/* Data Mode Switch */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-full p-0.5">
            <button
              onClick={() => setDataMode('simulation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                dataMode === 'simulation'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Radio size={11} />
              Simulation
            </button>
            <button
              onClick={() => setDataMode('live')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                dataMode === 'live'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Wifi size={11} />
              Live
            </button>
          </div>

          {/* Alert bell */}
          <NavLink to="/alerts" onClick={markAlertsRead} className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <Bell size={18} className="text-slate-600 dark:text-slate-300" />
            {unreadAlerts > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-critical text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </span>
            )}
          </NavLink>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <Sun size={18} className="text-amber-400" />
            ) : (
              <Moon size={18} className="text-slate-600" />
            )}
          </button>
        </header>

        {/* Simulated data ribbon */}
        <DataModeBadge />

        {/* Page content */}
        <main className="flex-1 overflow-auto mb-14 md:mb-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-navy border-t border-slate-100 dark:border-slate-700 flex z-20 safe-area-pb">
          {navItems.slice(0, 5).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-ocean dark:text-ocean-light'
                    : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <Icon size={20} />
              <span>{label.split(' ')[0]}</span>
            </NavLink>
          ))}
          <NavLink
            to="/alerts"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors relative ${
                isActive ? 'text-ocean dark:text-ocean-light' : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            <Bell size={20} />
            {unreadAlerts > 0 && (
              <span className="absolute top-1.5 right-3 w-3.5 h-3.5 bg-critical text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </span>
            )}
            <span>Alerts</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
