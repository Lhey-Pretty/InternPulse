import React, { useEffect, useState } from 'react';
import { Building2, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

export default function OverviewPanel({ onNavigate }) {
  const { user } = useAuth();
  const [reports, setReports] = useState(null);

  useEffect(() => {
    api.get('/admin/reports').then((res) => setReports(res.data.data)).catch(() => setReports(null));
  }, []);

  if (!reports) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">Loading…</p>;

  const cards = [
    ['Total Users', reports.users?.total, 'from-blue-600 to-emerald-600 dark:from-blue-800 dark:to-emerald-800', 'users'],
    ['Students', reports.users?.students, 'from-emerald-600 to-teal-600 dark:from-emerald-800 dark:to-teal-800', 'users'],
    ['Companies', reports.users?.companies, 'from-emerald-600 to-pink-600 dark:from-emerald-800 dark:to-pink-800', 'companies'],
    ['Coordinators', reports.users?.coordinators, 'from-teal-600 to-emerald-600 dark:from-teal-800 dark:to-emerald-800', 'users'],
    ['Pending Companies', reports.companies?.pending, 'from-amber-500 to-orange-600 dark:from-amber-800 dark:to-orange-800', 'companies'],
    ['Verified Companies', reports.companies?.verified, 'from-emerald-600 to-teal-600 dark:from-emerald-800 dark:to-teal-800', 'companies'],
    ['Active Placements', reports.placements?.active, 'from-emerald-600 to-teal-600 dark:from-emerald-800 dark:to-teal-800', 'reports'],
    ['Completed Placements', reports.placements?.completed, 'from-cyan-600 to-blue-600 dark:from-cyan-800 dark:to-blue-800', 'reports'],
  ];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#064e26] via-[#0b6333] to-[#043319] text-white p-6 sm:p-8 shadow-xl shadow-emerald-950/20 border border-emerald-600/30">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide uppercase mb-3 text-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              MinSU Administrative Control
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome back, {user?.name}</h1>
            <p className="mt-1 text-emerald-100/90 text-sm max-w-xl">Oversee company approvals, monitor placements, and manage institutional records.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => onNavigate?.('users')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#064e26] hover:bg-emerald-50 font-bold text-sm shadow-md transition-all cursor-pointer dark:bg-gray-900 dark:hover:bg-emerald-950/50 dark:text-emerald-300">New User</button>
            <button onClick={() => onNavigate?.('companies')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-800 text-white border border-white/20 font-semibold text-sm backdrop-blur-md transition-all cursor-pointer">Review Companies</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map(([label, value, grad, tab]) => (
          <button key={label} onClick={() => onNavigate?.(tab)}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-6 flex items-center justify-between text-left cursor-pointer dark:text-gray-100">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1.5 tracking-tight">{value ?? 0}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${grad} text-white flex items-center justify-center shadow-lg`}>
              {tab === 'companies' ? <Building2 className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            </div>
          </button>
        ))}
      </div>

      {reports.average_evaluation != null && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 dark:text-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Average Evaluation Rating</p>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{reports.average_evaluation} <span className="text-base font-medium text-gray-400 dark:text-gray-400">/ 5.0</span></p>
        </div>
      )}
    </div>
  );
}
