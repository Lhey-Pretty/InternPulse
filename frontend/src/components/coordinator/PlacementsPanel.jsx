import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import api from '../../api/client';
import { apiError, Pager, pageMeta, useDebounced } from '../ui';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
const studentOf = (p) => p.student_profile || p.studentProfile || {};
const postingOf = (p) => p.internship_posting || p.internshipPosting || {};
const companyOf = (p) => postingOf(p).company_profile || postingOf(p).companyProfile || {};
const nameOf = (p) => studentOf(p).full_name || `${studentOf(p).first_name || ''} ${studentOf(p).last_name || ''}`.trim() || '—';
const initialOf = (p) => (studentOf(p).first_name || nameOf(p) || '?').charAt(0).toUpperCase();

const pStatusCls = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  completed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  terminated: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
  on_hold: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
};
const logCls = {
  present: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  absent: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
  late: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  half_day: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60',
  excused: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
};
const taskCls = {
  pending: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  overdue: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
};

const inputCls = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:placeholder-gray-400';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5';

function PlacementDetail({ id, onBack }) {
  const [p, setP] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/coordinator/placements/${id}`).then((res) => setP(res.data.data)).catch((e) => setError(apiError(e)));
  }, [id]);

  if (!p) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">{error || 'Loading…'}</p>;

  const logs = p.attendance_logs || p.attendanceLogs || [];
  const tasks = p.tasks || [];
  const evals = p.evaluations || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 mb-2 group cursor-pointer">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to placements tracker
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Internship Placement Overview</h1>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 space-y-6 dark:text-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-emerald-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 dark:from-emerald-800 dark:via-emerald-800 dark:to-emerald-800">{initialOf(p)}</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{nameOf(p)}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mt-0.5">{postingOf(p).title} • {companyOf(p).company_name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 flex items-center gap-1.5"><span></span><span>{fmt(p.start_date)} – {fmt(p.end_date)}</span></p>
            </div>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full font-bold border capitalize shrink-0 ${pStatusCls[p.status] || pStatusCls.active}`}>● {(p.status || '').replace('_', ' ')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50/70 dark:bg-gray-800/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 text-center">
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{p.rendered_hours}h</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">Rendered Hours</p>
          </div>
          <div className="bg-gray-50/70 dark:bg-gray-800/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 text-center">
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{p.required_hours}h</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">Required Hours</p>
          </div>
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/40 text-center">
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{p.completion_percentage ?? 0}%</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/80 mt-1">Completion</p>
          </div>
        </div>

        <div>
          <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-600 rounded-full transition-all duration-500 dark:from-emerald-800 dark:via-emerald-800 dark:to-emerald-800" style={{ width: `${Math.min(100, p.completion_percentage ?? 0)}%` }}></div>
          </div>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 dark:text-gray-100">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">▦ Recent Attendance Logs ({logs.length})</h3>
          <div className="space-y-2.5">
            {logs.slice(0, 7).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-xs">
                <span className="font-bold text-gray-800 dark:text-gray-200">{fmt(log.date)}</span>
                <span className="text-gray-500 dark:text-gray-400">{log.time_in || '—'} to {log.time_out || '—'}</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{log.hours_rendered ? `${log.hours_rendered} hrs` : '—'}</span>
                <span className={`px-2.5 py-0.5 rounded-full font-semibold border capitalize ${logCls[log.status] || logCls.present}`}>{(log.status || '').replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 dark:text-gray-100">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">▦ Deliverables & Tasks ({tasks.length})</h3>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{task.title}</p>
                  {task.due_date && <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">Due Date: {fmt(task.due_date)}</p>}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border capitalize shrink-0 ${taskCls[task.status] || taskCls.pending}`}>{(task.status || '').replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {evals.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 dark:text-gray-100">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">▦ Performance Assessments</h3>
          <div className="space-y-3">
            {evals.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{ev.evaluation_period || 'final'} Assessment</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ev.grade_description || ''}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{ev.overall_rating}</span>
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-400">/5.0</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlacementsPanel() {
  const [placements, setPlacements] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);
  const [lastPage, setLastPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [detailId, setDetailId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async (p = 1) => {
    try {
      const params = { page: p };
      if (debouncedSearch) params.search = debouncedSearch;
      if (status) params.status = status;
      const res = await api.get('/coordinator/placements', { params });
      const meta = pageMeta(res.data.data);
      setPlacements(meta.items);
      setLastPage(meta.lastPage);
      setTotalRows(meta.total);
      setPage(p);
    } catch (e) { setError(apiError(e)); setPlacements([]); }
  }, [debouncedSearch, status]);

  useEffect(() => { load(); }, [load]);

  if (detailId) return <PlacementDetail id={detailId} onBack={() => { setDetailId(null); load(); }} />;
  if (!placements) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">{error || 'Loading…'}</p>;
  const total = totalRows || placements.length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Internship Placements Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Oversee student training hours, corporate mentor supervision, and active deployment statuses</p>
        </div>
        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50 self-start sm:self-auto">{total} Total Placements</span>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 sm:p-5 mb-6 flex flex-wrap gap-4 items-end dark:text-gray-100">
        <div className="flex-1 min-w-[240px]">
          <label className={labelCls}>Search Students</label>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by student name or company..." className={inputCls} />
        </div>
        <div className="w-full sm:w-56">
          <label className={labelCls}>Placement Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} capitalize`}>
            <option value="">All Statuses</option>
            {['active', 'completed', 'terminated', 'on_hold'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {(search || status) && <button type="button" onClick={() => { setSearch(''); setStatus(''); }} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">Reset</button>}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden dark:text-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Student</th><th className="px-6 py-4">Host Company & Role</th><th className="px-6 py-4">Hours Rendered</th><th className="px-6 py-4">Completion Progress</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {placements.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">No placements found</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 max-w-sm mx-auto">No student placement records match your query.</p>
                </td></tr>
              ) : placements.map((p) => {
                const pct = p.completion_percentage ?? 0;
                const barColor = p.status === 'completed' ? 'from-blue-500 to-emerald-600 dark:from-blue-800 dark:to-emerald-800' : p.status === 'terminated' ? 'from-rose-500 to-red-600 dark:from-rose-800 dark:to-red-800' : 'from-emerald-500 to-teal-500 dark:from-emerald-800 dark:to-teal-800';
                const start = p.start_date ? new Date(p.start_date) : null;
                const daysUntil = start ? Math.ceil((start - new Date()) / 86400000) : null;
                return (
                  <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm dark:from-emerald-800 dark:to-emerald-800">{initialOf(p)}</div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white leading-tight">{nameOf(p)}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5 truncate">{studentOf(p).course || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 dark:text-white text-xs">{companyOf(p).company_name || '—'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-xs">{postingOf(p).title || '—'}</p>
                      {p.start_date && p.end_date && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium">
                          <span></span><span>{fmtD(p.start_date)} – {fmt(p.end_date)}</span>
                          {daysUntil !== null && daysUntil > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Starts in {daysUntil}d</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4"><span className="text-xs font-bold text-gray-800 dark:text-gray-200">{p.rendered_hours} / {p.required_hours}h</span></td>
                    <td className="px-6 py-4 w-36">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        <span>Progress</span><span className="font-bold text-gray-900 dark:text-white">{pct}%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-2 bg-gradient-to-r ${barColor} rounded-full`} style={{ width: `${Math.min(100, pct)}%` }}></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${pStatusCls[p.status] || pStatusCls.active}`}>{(p.status || '').replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setDetailId(p.id)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer">View Details <span>→</span></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Pager page={page} lastPage={lastPage} total={total} onChange={load} noun="placements" className="mt-4" />
      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
