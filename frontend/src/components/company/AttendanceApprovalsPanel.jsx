import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import api from '../../api/client';
import { apiError, Pager, pageMeta, useDebounced } from '../ui';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const studentOf = (p) => p.student_profile || p.studentProfile || {};
const postingOf = (p) => p.internship_posting || p.internshipPosting || {};
const nameOf = (p) => studentOf(p).full_name || `${studentOf(p).first_name || ''} ${studentOf(p).last_name || ''}`.trim() || '—';
const initialOf = (p) => (studentOf(p).first_name || nameOf(p) || '?').charAt(0).toUpperCase();
const isToday = (d) => d && new Date(d).toDateString() === new Date().toDateString();

const smallInput = 'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none';

function StudentAttendance({ placementId, onBack }) {
  const [p, setP] = useState(null);
  const [logs, setLogs] = useState([]);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/company/interns/${placementId}`);
      setP(res.data.data);
      setLogs(res.data.data.attendance_logs || res.data.data.attendanceLogs || []);
    } catch (e) { setError(apiError(e)); }
  }, [placementId]);

  useEffect(() => { load(); }, [load]);

  if (!p) return <p className="py-12 text-center text-slate-500">{error || 'Loading…'}</p>;

  const pendingCount = logs.filter((l) => !l.time_in_approved_at || (l.time_out && l.time_in_approved_at && !l.time_out_approved_at)).length;
  const filtered = logs.filter((l) => {
    if (dateFilter && !String(l.date || '').startsWith(dateFilter)) return false;
    const fully = l.time_in_approved_at && (!l.time_out || l.time_out_approved_at);
    if (statusFilter === 'approved' && !fully) return false;
    if (statusFilter === 'pending' && fully) return false;
    return true;
  });

  const approve = async (log, kind) => {
    setError(''); setMessage('');
    try {
      await api.patch(`/company/attendance/${log.id}/${kind === 'in' ? 'approve-time-in' : 'approve-time-out'}`);
      setMessage(kind === 'in' ? 'Time-in approved.' : 'Time-out approved.');
      await load();
    } catch (err) { setError(apiError(err)); }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 space-y-4">
        <div>
          <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 mb-2 group cursor-pointer">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Attendance Approvals
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white font-extrabold text-xl flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">{initialOf(p)}</div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{nameOf(p)}</h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Active Intern</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{studentOf(p).student_id_number || 'No ID'} · {studentOf(p).course} · {postingOf(p).title}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs text-center min-w-[100px]">
                <p className="text-xs text-gray-400 uppercase font-semibold">Rendered</p>
                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{p.rendered_hours ?? 0} <span className="text-xs text-gray-400 font-normal">/ {p.required_hours ?? 600}h</span></p>
              </div>
              <div className="px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs text-center min-w-[100px]">
                <p className="text-xs text-gray-400 uppercase font-semibold">Pending</p>
                <p className={`text-base font-extrabold mt-0.5 ${pendingCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'}`}>{pendingCount}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Daily Attendance Records</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={smallInput} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={smallInput}>
              <option value="">All Status</option>
              <option value="pending">Pending Only</option>
              <option value="approved">Approved Only</option>
            </select>
            <button onClick={() => { setDateFilter(''); setStatusFilter(''); }} className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer">Clear</button>
          </div>
        </div>
      </div>

      {(message || error) && <div className={`mb-5 rounded-xl border p-4 text-sm font-semibold ${message ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'}`}>{message || error}</div>}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-400">
                <th className="px-6 py-4">Date</th><th className="px-6 py-4">Time In</th><th className="px-6 py-4">Time Out</th><th className="px-6 py-4">Hours</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No attendance logs found</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{dateFilter || statusFilter ? 'Try clearing your filters.' : 'This student has not submitted any daily attendance yet.'}</p>
                </td></tr>
              ) : filtered.map((log) => {
                const fully = log.time_in_approved_at && (!log.time_out || log.time_out_approved_at);
                const isPending = !log.time_in_approved_at || (log.time_out && log.time_in_approved_at && !log.time_out_approved_at);
                return (
                  <tr key={log.id} className={`${isPending ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''} hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-bold text-gray-900 dark:text-white">{fmt(log.date)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{isToday(log.date) ? 'Today' : ''}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{log.time_in || '—'}</p>
                      {log.time_in && <span className={`text-xs font-semibold ${log.time_in_approved_at ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{log.time_in_approved_at ? '✓ Approved' : '● Needs approval'}</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{log.time_out || '—'}</p>
                      {log.time_out ? (
                        <span className={`text-xs font-semibold ${log.time_out_approved_at ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{log.time_out_approved_at ? '✓ Approved' : '● Needs approval'}</span>
                      ) : <span className="text-xs text-gray-400">No time-out</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-600 dark:text-gray-300">{log.hours_rendered ? `${log.hours_rendered} hrs` : '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {fully ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Completed</span>
                      ) : log.time_in_approved_at && log.time_out && !log.time_out_approved_at ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>Approve Time-Out</span>
                      ) : !log.time_out && log.time_in_approved_at ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">Checked in</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>Approve Time-In</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex flex-wrap justify-end gap-2">
                        {log.time_in && !log.time_in_approved_at && <button onClick={() => approve(log, 'in')} className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer">Approve Time In</button>}
                        {log.time_out && log.time_in_approved_at && !log.time_out_approved_at && <button onClick={() => approve(log, 'out')} className="rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 shadow-sm transition-colors cursor-pointer">Approve Time Out</button>}
                        {log.time_out && !log.time_in_approved_at && <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold italic">Approve in first</span>}
                        {fully && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ Verified</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AttendanceApprovalsPanel() {
  const [placements, setPlacements] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailId, setDetailId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async (p = 1) => {
    try {
      const res = await api.get('/company/attendance-approvals', { params: { page: p, ...(debouncedSearch ? { search: debouncedSearch } : {}) } });
      const meta = pageMeta(res.data.data);
      setPlacements(meta.items);
      setLastPage(meta.lastPage);
      setTotal(meta.total);
      setPage(p);
    } catch (e) { setError(apiError(e)); setPlacements([]); }
  }, [debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  if (detailId) return <StudentAttendance placementId={detailId} onBack={() => { setDetailId(null); load(); }} />;
  if (!placements) return <p className="py-12 text-center text-slate-500">{error || 'Loading…'}</p>;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Attendance Approvals</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select an active intern to view and verify their daily attendance logs.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student name or ID..." className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 pl-9 pr-3 py-2 w-64 focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
          {search && <button type="button" onClick={() => { setSearch(''); setPage(1); }} className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer">Clear</button>}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-400">
                <th className="px-6 py-4">Student</th><th className="px-6 py-4">Internship Role</th><th className="px-6 py-4">Attendance Status</th><th className="px-6 py-4">Logged Days</th><th className="px-6 py-4">Latest Log</th><th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {placements.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No active interns found</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{search ? 'No intern matched your search.' : 'You do not have any active interns deployed yet.'}</p>
                </td></tr>
              ) : placements.map((p) => {
                const student = studentOf(p);
                const logs = p.attendance_logs || p.attendanceLogs || [];
                const pendingCount = logs.filter((l) => !l.time_in_approved_at || (l.time_out && l.time_in_approved_at && !l.time_out_approved_at)).length;
                const latestLog = logs[0];
                return (
                  <tr key={p.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">{initialOf(p)}</div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white leading-tight">{nameOf(p)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{student.student_id_number || 'No ID'} · {student.course || 'BSIT'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{postingOf(p).title}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{p.rendered_hours ?? 0} / {p.required_hours ?? 600} hrs rendered</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {pendingCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>{pendingCount} pending approval</span>
                      ) : logs.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>All approved</span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">No attendance yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">{logs.length} day{logs.length !== 1 ? 's' : ''}</td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {latestLog ? <><p className="font-semibold text-gray-800 dark:text-gray-200">{fmt(latestLog.date)}</p><p className="text-[11px] text-gray-400 dark:text-gray-500">{isToday(latestLog.date) ? 'Today' : 'Recent'}</p></> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button onClick={() => setDetailId(p.id)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer">
                        View Attendance <span>→</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Pager page={page} lastPage={lastPage} total={total} onChange={load} noun="interns" className="mt-4" />
    </div>
  );
}
