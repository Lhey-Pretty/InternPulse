import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationsBell from './NotificationsBell';
import { KeyRound, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

export default function DashboardLayout({
  title = 'Dashboard',
  activeTab,
  onTabChange,
  navGroups = [],
  children,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('ip-theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ip-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ip-theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (user?.password_change_required || user?.must_change_password) {
      setPasswordModalOpen(true);
    }
  }, [user?.password_change_required, user?.must_change_password]);

  const toggleTheme = () => setDarkMode(!darkMode);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  return (
    <div className="flex h-full min-h-screen font-sans minsu-dashboard-bg text-gray-900 dark:text-gray-100 antialiased">
      {/* ════════════════════════════ SIDEBAR ════════════════════════════ */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col
          bg-[#082b1b]
          border-r border-emerald-950/70
          transition-transform duration-300 ease-in-out
          shadow-xl shadow-emerald-950/25
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* MinSU Institutional Brand Header */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <Link to="/" className="flex translate-y-2 items-center gap-3 min-w-0 group">
           <img
            src={`${import.meta.env.BASE_URL}images/minsu-logo.png`}
            alt="MinSU Seal"
            className="h-8 w-8 object-contain"
          />
            <div className="min-w-0">
              <span className="font-bold text-white tracking-tight text-sm truncate block leading-tight">
                MinSU InternPulse
              </span>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                {user?.role === 'coordinator'
                  ? user?.coordinator_profile?.program
                    ? `${user.coordinator_profile.program} - Coordinator`
                    : 'Coordinator'
                  : user?.role || 'Portal'}
              </p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden translate-y-2 text-emerald-300 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav aria-label="Main navigation" className="flex-1 space-y-0.5 overflow-y-auto px-3.5 py-4">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx}>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        onTabChange(item.key);
                        setSidebarOpen(false);
                      }}
                      className={`group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#082b1b] ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-sm shadow-black/20 dark:bg-emerald-700'
                          : 'text-emerald-50/90 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {item.icon ? (
                        <span className={`shrink-0 ${isActive ? 'text-white' : 'text-emerald-300 group-hover:text-white'}`}>
                          {item.icon}
                        </span>
                      ) : null}
                      <span className="truncate flex-1">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User profile footer */}
        {user && (
          <div className="mx-3.5 mb-4 shrink-0">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md dark:from-emerald-800 dark:to-teal-800">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p title={user.name} className="truncate text-sm font-semibold leading-tight text-white">{user.name}</p>
                <p title={user.email} className="truncate text-[11px] text-emerald-200/90">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setLogoutModalOpen(true)}
                aria-label="Log out"
                title="Log out"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-300 hover:text-rose-400 hover:bg-white/10 transition-all duration-200 shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-200"
        />
      )}

      {/* ════════════════════════════ MAIN CONTENT ════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-[270px]">
        {/* Sticky Header Bar */}
        <header className="sticky top-0 z-20 h-16 flex items-center gap-4 px-5 lg:px-8 bg-white dark:bg-gray-900 border-b border-emerald-900/10 dark:border-gray-800 dark:text-gray-100">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden -ml-1 p-2 rounded-xl text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleTheme}
              title="Toggle theme"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-gray-300" />}
            </button>

            <button
              onClick={() => setPasswordModalOpen(true)}
              title="Change password"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
            </button>

            <NotificationsBell />
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 px-5 pb-6 pt-10 lg:px-8 lg:pt-12 animate-fade-in">
          {children}
        </main>

        {/* Institutional Footer */}
        <footer className="px-5 lg:px-8 py-4 border-t border-gray-200/60 dark:border-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <img
  src={`${import.meta.env.BASE_URL}images/minsu-logo.png`}
        alt="MinSU Seal"
        className="h-8 w-8 object-contain"
      />
            <span>MinSU InternPulse · Bongabong Campus OJT Portal</span>
          </div>
          <span>© {new Date().getFullYear()} Mindoro State University. All rights reserved.</span>
        </footer>
      </div>

      {/* Change Password Modal */}
      {passwordModalOpen && <ChangePasswordModal required={!!(user?.password_change_required || user?.must_change_password)} onClose={() => setPasswordModalOpen(false)} />}

      {/* Logout Confirmation Modal */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-sm w-full animate-fade-up dark:text-gray-100">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">Confirm Logout</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
              Are you sure you want to logout?
            </p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white shadow-md transition-all cursor-pointer dark:bg-emerald-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
