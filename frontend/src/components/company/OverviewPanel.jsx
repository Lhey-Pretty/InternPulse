import React, { useEffect, useState } from 'react';
import { Briefcase, CalendarCheck, Clock, UserCheck, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Badge } from '../ui';

const listOf = (res) => res?.data?.data?.data || res?.data?.data || [];

export default function OverviewPanel({ onNavigate }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/company/postings').catch(() => null),
      api.get('/company/applicants').catch(() => null),
      api.get('/company/interns').catch(() => null),
      api.get('/company/attendance-approvals').catch(() => null),
    ]).then(([postings, applicants, interns, attendance]) => {
      setData({
        postings: listOf(postings),
        applicants: listOf(applicants),
        interns: listOf(interns),
        attendance: listOf(attendance),
      });
    });
  }, []);

  if (!data) return <p className="py-12 text-center text-slate-500">Loading…</p>;

  const pendingApps = data.applicants.filter((a) => a.status === 'pending').length;
  const activeInterns = data.interns.filter((i) => i.status === 'active').length;

  const cards = [
    { label: 'Job Postings', value: data.postings.length, icon: Briefcase, grad: 'from-blue-600 to-emerald-600', tab: 'postings' },
    { label: 'Total Applicants', value: data.applicants.length, icon: Users, grad: 'from-emerald-600 to-teal-600', tab: 'applicants' },
    { label: 'Pending Review', value: pendingApps, icon: Clock, grad: 'from-amber-500 to-orange-600', tab: 'applicants' },
    { label: 'Active Interns', value: activeInterns, icon: UserCheck, grad: 'from-teal-600 to-emerald-600', tab: 'interns' },
    { label: 'Attendance Queue', value: data.attendance.length, icon: CalendarCheck, grad: 'from-cyan-600 to-blue-600', tab: 'attendance' },
  ];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#064e26] via-[#0b6333] to-[#043319] text-white p-6 sm:p-8 shadow-xl shadow-emerald-950/20 border border-emerald-600/30">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-emerald-100 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              <span>MinSU Bongabong · Employer Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome back, {user?.name}</h1>
            <p className="text-emerald-100/90 text-sm mt-1 max-w-xl">Manage your internship postings, review applicants, and supervise your interns.</p>
          </div>
          <button onClick={() => onNavigate?.('postings')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#064e26] hover:bg-emerald-50 font-bold text-sm shadow-md transition-all cursor-pointer">
            <Briefcase className="w-4 h-4 text-emerald-700" /> New Posting
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <button key={c.label} onClick={() => onNavigate?.(c.tab)}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-6 flex items-center justify-between text-left cursor-pointer">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{c.label}</p>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1.5 tracking-tight">{c.value}</p>
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
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Latest Applicants</h2>
            <button onClick={() => onNavigate?.('applicants')} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer">View all →</button>
          </div>
          {data.applicants.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No applicants yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.applicants.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{a.student_profile?.full_name || `${a.student_profile?.first_name || ''} ${a.student_profile?.last_name || ''}`}</p>
                    <p className="text-xs text-gray-500 truncate">{a.internship_posting?.title}</p>
                  </div>
                  <Badge tone={a.status === 'accepted' ? 'green' : a.status === 'rejected' ? 'red' : 'amber'}>{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Your Postings</h2>
            <button onClick={() => onNavigate?.('postings')} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer">Manage →</button>
          </div>
          {data.postings.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No postings yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.postings.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{p.title}</p>
                    <p className="text-xs text-gray-500 truncate">{p.location || 'Flexible'} · {p.slots} slot(s)</p>
                  </div>
                  <Badge tone={p.status === 'approved' ? 'green' : p.status === 'pending' ? 'amber' : 'slate'}>{p.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
