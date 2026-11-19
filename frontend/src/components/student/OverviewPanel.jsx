import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, Award, BookOpen, CheckCircle2,
  Clock, Download, FileText, Lock, Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';


const statusColors = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
  shortlisted: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300',
  interview: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
  accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
  rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300',
  withdrawn: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

function StatCard({ label, icon: Icon, iconCls, children, footer }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</span>
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconCls} flex items-center justify-center text-white shadow-md`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {children}
      </div>
      {footer && <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800/80">{footer}</div>}
    </div>
  );
}

export default function OverviewPanel({ onNavigate, hasAcceptedApplication }) {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [applications, setApplications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/student/overview').catch(() => ({ data: { data: null } })),
      api.get('/applications').catch(() => ({ data: { data: null } })),
      api.get('/student/tasks').catch(() => ({ data: { data: null } })),
      api.get('/notifications').catch(() => ({ data: { data: null } })),
    ]).then(([ov, apps, tsk, ntf]) => {
      setOverview(ov.data.data);
      setApplications(apps.data.data?.data || []);
      setTasks((tsk.data.data?.tasks || []).filter((t) => t.status !== 'completed'));
      setNotifications((ntf.data.data?.notifications?.data || []).filter((n) => !n.is_read).slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-12 text-center text-slate-500">Loading…</p>;

  const placement = overview?.placement;
  const stats = overview?.stats;
  const posting = placement?.internship_posting;
  const company = posting?.company_profile;
  const rendered = stats?.rendered_hours ?? placement?.rendered_hours ?? 0;
  const required = stats?.required_hours ?? placement?.required_hours ?? 480;
  const pct = stats?.completion_percentage ?? (required > 0 ? Math.min(100, Math.round((rendered / required) * 100)) : 0);
  const hasPlacementStarted = placement?.start_date && new Date(placement.start_date) <= new Date(new Date().toDateString());

  const uploadResume = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      await api.post('/student/resume', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch { /* best effort */ }
    setUploading(false);
    e.target.value = '';
  };

  const downloadResume = async () => {
    try {
      const res = await api.get('/student/resume/download', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'resume'; a.click();
      URL.revokeObjectURL(url);
    } catch { /* no resume */ }
  };

  const go = (tab) => onNavigate?.(tab);

  return (
    <div className="space-y-6">
      {/* Welcome hero */}
      <div className="mb-2 relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#064e26] via-[#0b6333] to-[#043319] text-white p-6 sm:p-8 shadow-xl shadow-emerald-950/20 border border-emerald-600/30">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-emerald-100 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              <span>MinSU Bongabong · OJT Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-emerald-100/90 text-sm mt-1 max-w-xl">
              Track your real-time training progress, daily journals, attendance records, and tasks all in one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {placement && hasPlacementStarted ? (
              <>
                <button onClick={() => go('attendance')} className="inline-flex items-center gap-2 bg-white text-[#064e26] hover:bg-emerald-50 font-bold px-4 py-2.5 rounded-xl text-sm shadow-md transition-all cursor-pointer">
                  <Clock className="w-4 h-4 text-emerald-700" /><span>Log Hours</span>
                </button>
                <button onClick={() => go('journal')} className="inline-flex items-center gap-2 bg-emerald-800/80 hover:bg-emerald-800 border border-white/20 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer">
                  <Plus className="w-4 h-4" /><span>New Journal</span>
                </button>
              </>
            ) : placement ? (
              <span className="inline-flex items-center gap-2 bg-emerald-950/60 border border-white/10 text-emerald-200/70 font-semibold px-4 py-2.5 rounded-xl text-sm cursor-not-allowed">
                <Lock className="w-4 h-4" /><span>Starts {new Date(placement.start_date).toLocaleDateString()}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Rendered Hours" icon={Clock} iconCls="from-blue-500 to-emerald-600 shadow-blue-500/20"
          footer={<>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium"><span>Progress</span><span>{pct}%</span></div>
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </>}>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{rendered}</span>
            <span className="text-sm font-medium text-gray-400">/ {required} hrs</span>
          </div>
        </StatCard>

        <StatCard label="Target Completion" icon={CheckCircle2} iconCls="from-emerald-500 to-teal-600 shadow-emerald-500/20"
          footer={<p className="text-xs text-gray-500 dark:text-gray-400">{Math.max(0, required - rendered)} hours remaining to finish OJT</p>}>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${pct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>{pct}%</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct >= 100 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'}`}>
              {pct >= 100 ? 'Completed' : 'In Progress'}
            </span>
          </div>
        </StatCard>

        <StatCard label="Applications" icon={FileText} iconCls="from-emerald-500 to-emerald-600 shadow-emerald-500/20"
          footer={<div className="flex items-center justify-between"><span className="text-xs text-gray-500 dark:text-gray-400">Applied positions</span><button onClick={() => go('applications')} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer">View all →</button></div>}>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{applications.length}</span>
            <span className="text-sm font-medium text-gray-400">submitted</span>
          </div>
        </StatCard>

        <StatCard label="Assigned Tasks" icon={Award} iconCls={tasks.length > 0 ? 'from-amber-500 to-orange-600 shadow-amber-500/20' : 'from-gray-400 to-gray-500'}
          footer={<div className="flex items-center justify-between">
            <span className={`text-xs ${tasks.length > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>{tasks.length > 0 ? 'Requires attention' : 'All up to date'}</span>
            <button onClick={() => go('tasks')} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer">Manage →</button>
          </div>}>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${tasks.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>{tasks.length}</span>
            <span className="text-sm font-medium text-gray-400">active tasks</span>
          </div>
        </StatCard>
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Placement */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Active Placement</h2>
              {placement && <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 capitalize">{placement.status}</span>}
            </div>
            {placement ? (
              <>
                <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-emerald-50/40 dark:from-gray-800/60 dark:to-gray-800/30 border border-gray-100 dark:border-gray-800">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center text-white font-extrabold text-xl shrink-0 shadow-lg shadow-emerald-600/30">
                      {(company?.company_name || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">{posting?.title || 'Internship'}</h3>
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 truncate mt-0.5">{company?.company_name || 'Partner company'}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-200/60 dark:border-gray-700/60 text-xs text-gray-600 dark:text-gray-400">
                        <span>{placement.start_date ? new Date(placement.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} – {placement.end_date ? new Date(placement.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{rendered} / {required} hrs rendered</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  {hasPlacementStarted ? (
                    <>
                      <button onClick={() => go('attendance')} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer">
                        <Clock className="w-4 h-4" /><span>Record Attendance</span>
                      </button>
                      <button onClick={() => go('journal')} className="inline-flex items-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer">
                        <BookOpen className="w-4 h-4 text-gray-500" /><span>Add Daily Journal</span>
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-2 border border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold text-sm px-5 py-2.5 rounded-xl cursor-not-allowed">
                      <Lock className="w-4 h-4" /><span>Training Starts {placement.start_date ? new Date(placement.start_date).toLocaleDateString() : ''} (Journal Locked)</span>
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={uploadResume} />
                  <button onClick={() => fileRef.current?.click()} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer">{uploading ? 'Uploading…' : 'Upload resume'}</button>
                  <span className="text-gray-300">·</span>
                  <button onClick={downloadResume} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"><Download className="w-3 h-3" />Download resume</button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 px-4 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 border border-dashed border-gray-200 dark:border-gray-800">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No Active Internship Yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-5">Your coordinator will assign you or you can explore and apply to open company positions.</p>
                {!hasAcceptedApplication && (
                  <button onClick={() => go('opportunities')} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer">
                    <span>Browse Available Internships</span><ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Applications</h2>
              <button onClick={() => go('applications')} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer">View all →</button>
            </div>
            {applications.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 border border-dashed border-gray-200 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">No applications yet</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">Start applying to recommended internships.</p>
                {!hasAcceptedApplication && (
                  <button onClick={() => go('opportunities')} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-md cursor-pointer">Explore Positions</button>
                )}
              </div>
            ) : (
              <div>
                {applications.slice(0, 5).map((app) => (
                  <div key={app.id} className="flex items-center justify-between gap-4 p-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-gray-800 dark:to-gray-700 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-sm font-bold shrink-0 border border-emerald-200/40 dark:border-gray-700">
                        {(app.internship_posting?.company_profile?.company_name || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{app.internship_posting?.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{app.internship_posting?.company_profile?.company_name}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${statusColors[app.status] || statusColors.pending}`}>{app.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tasks requiring attention */}
        {tasks.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Tasks Requiring Attention</h2>
              <button onClick={() => go('tasks')} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer">View all →</button>
            </div>
            <div className="space-y-2.5">
              {tasks.slice(0, 5).map((task) => {
                const overdue = task.due_date && new Date(task.due_date) < new Date(new Date().toDateString());
                return (
                  <div key={task.id} className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-all flex items-start gap-3">
                    <span className={`mt-1.5 w-2.5 h-2.5 rounded-full inline-block ${overdue ? 'bg-rose-500 animate-ping' : 'bg-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{task.title}</p>
                      {task.due_date && (
                        <p className={`text-xs mt-0.5 ${overdue ? 'text-rose-500 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                          Due {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {overdue && <span className="ml-1 px-1.5 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded font-bold text-[10px]">OVERDUE</span>}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent updates */}
        {notifications.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-5">Recent Updates</h2>
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n.id} className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{n.title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
