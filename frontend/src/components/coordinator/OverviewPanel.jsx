import React, { useEffect, useState } from 'react';
import { ArrowRight, Briefcase, Building2, Clock, Shield, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Badge } from '../ui';

export default function OverviewPanel({ onNavigate }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/coordinator/overview').then((res) => setData(res.data.data)).catch(() => setData(null));
  }, []);

  if (!data) return <p className="py-12 text-center text-slate-500">Loading…</p>;
  const s = data.stats || {};

  const cards = [
    { label: 'Total Students', value: s.total_students, icon: Users, grad: 'from-blue-600 to-emerald-600', tab: 'students' },
    { label: 'On Internship', value: s.students_on_internship, icon: Briefcase, grad: 'from-emerald-600 to-teal-600', tab: 'placements' },
    { label: 'Completed', value: s.students_completed, icon: Shield, grad: 'from-teal-600 to-emerald-600', tab: 'reports' },
    { label: 'Unplaced', value: s.students_without_placement, icon: Users, grad: 'from-rose-600 to-red-600', tab: 'students' },
    { label: 'Pending Postings', value: s.pending_postings, icon: Clock, grad: 'from-amber-500 to-orange-600', tab: 'postings' },
  ];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#064e26] via-[#0b6333] to-[#043319] text-white p-6 sm:p-8 shadow-xl shadow-emerald-950/20 border border-emerald-600/30">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-emerald-100 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>MinSU Bongabong · Coordinator Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome back, {user?.name}</h1>
          <p className="text-emerald-100/90 text-sm mt-1 max-w-xl">Monitor placements, approve postings, and oversee student journals across the campus.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <button key={c.label} onClick={() => onNavigate?.(c.tab)}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-6 flex items-center justify-between text-left cursor-pointer">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{c.label}</p>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1.5 tracking-tight">{c.value ?? 0}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.grad} text-white flex items-center justify-center shadow-lg`}>
              <c.icon className="w-5 h-5" />
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Pending Posting Approvals</h2>
            <button onClick={() => onNavigate?.('postings')} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer">Review all →</button>
          </div>
          {(data.pending_postings || []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No pending postings.</p>
          ) : (
            <div className="space-y-2.5">
              {data.pending_postings.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{p.title}</p>
                    <p className="text-xs text-gray-500 truncate">{p.company_profile?.company_name}</p>
                  </div>
                  <Badge tone="amber">pending</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Placements</h2>
            <button onClick={() => onNavigate?.('placements')} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer">Monitor →</button>
          </div>
          {(data.recent_placements || []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No placements yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.recent_placements.map((pl) => (
                <div key={pl.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{pl.student_profile?.full_name || pl.student_profile?.user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{pl.internship_posting?.company_profile?.company_name} · {pl.internship_posting?.title}</p>
                  </div>
                  <Badge tone={pl.status === 'active' ? 'green' : pl.status === 'completed' ? 'blue' : 'slate'}>{pl.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Partner Network</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Total Partner Companies', s.total_companies, 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'],
            ['Verified Employers', s.verified_companies, 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'],
            ['Pending Verification', s.pending_companies, 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'],
            ['Active Approved Postings', s.approved_postings, 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'],
          ].map(([label, val, badge]) => (
            <div key={label} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">{val ?? 0}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
