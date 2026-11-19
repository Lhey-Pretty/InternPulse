import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import api from '../../api/client';
import { EvaluationForm } from './EvaluationForm';
import { Notice, apiError } from '../ui';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const studentOf = (p) => p.student_profile || p.studentProfile || {};
const postingOf = (p) => p.internship_posting || p.internshipPosting || {};
const nameOf = (p) => studentOf(p).full_name || `${studentOf(p).first_name || ''} ${studentOf(p).last_name || ''}`.trim() || 'Intern';
const initialOf = (p) => (studentOf(p).first_name || nameOf(p) || '?').charAt(0).toUpperCase();

const placementStatusCls = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  completed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  terminated: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
  on_hold: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
};
const taskStatusCls = {
  pending: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  overdue: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
};
const inputCls = 'w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5';

function InternDetail({ placementId, onBack }) {
  const [p, setP] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', due_date: '' });
  const [feedback, setFeedback] = useState({});
  const [showEval, setShowEval] = useState(false);
  const [evaluationEditingEnabled, setEvaluationEditingEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/company/interns/${placementId}`);
      setP(res.data.data);
    } catch (e) { setError(apiError(e)); }
    try {
      const policy = await api.get('/evaluation-policy');
      setEvaluationEditingEnabled(Boolean(policy.data.data?.editing_enabled));
    } catch { setEvaluationEditingEnabled(false); }
  }, [placementId]);

  useEffect(() => { load(); }, [load]);

  if (!p) return <p className="py-12 text-center text-slate-500">{error || 'Loading…'}</p>;

  const tasks = p.tasks || [];
  const logs = p.attendance_logs || p.attendanceLogs || [];
  const evals = p.evaluations || [];
  const hasFinal = evals.some((e) => (e.evaluation_period || 'final') === 'final');
  const pct = Math.min(100, p.completion_percentage ?? 0);
  const requiredHours = Number(p.required_hours) || 480;
  const renderedHours = Number(p.rendered_hours) || 0;
  const hoursComplete = renderedHours >= requiredHours;
  const finalEvaluation = evals.find((e) => (e.evaluation_period || 'final') === 'final') || null;
  const evaluationReadOnly = !evaluationEditingEnabled || !hoursComplete;

  const assignTask = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/company/interns/${p.id}/tasks`, taskForm);
      setTaskForm({ title: '', due_date: '' });
      setMessage('Task assigned.');
      await load();
    } catch (err) { setError(apiError(err)); }
  };

  const saveFeedback = async (task) => {
    setError('');
    try {
      await api.patch(`/company/tasks/${task.id}/feedback`, { supervisor_feedback: feedback[task.id] ?? task.supervisor_feedback ?? '' });
      setMessage('Feedback saved.');
      await load();
    } catch (err) { setError(apiError(err)); }
  };

  const approve = async (log, kind) => {
    setError('');
    try {
      await api.patch(`/company/attendance/${log.id}/${kind === 'in' ? 'approve-time-in' : 'approve-time-out'}`);
      setMessage('Attendance approved.');
      await load();
    } catch (err) { setError(apiError(err)); }
  };

  const sectionTitle = (icon, text, sub) => (
    <div className="border-b border-gray-100 dark:border-gray-800 pb-4 mb-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><span>{icon}</span> {text}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 mb-2 group cursor-pointer">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to interns
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Intern Training Profile</h1>
      </div>

      <Notice message={message} error={error} />

      {/* Header card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-emerald-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">{initialOf(p)}</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{nameOf(p)}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mt-0.5">{studentOf(p).course} — {postingOf(p).title}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1.5"><span>{fmt(p.start_date)} to {fmt(p.end_date)}</span></p>
            </div>
          </div>
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-4 text-right min-w-[150px] shrink-0">
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{p.rendered_hours}<span className="text-base font-medium text-gray-500 dark:text-gray-400">/{p.required_hours}h</span></p>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">Rendered Hours</p>
          </div>
        </div>
        <div className="pt-6">
          <div className="flex justify-between items-center text-xs font-bold mb-2">
            <span className="text-gray-500 dark:text-gray-400">Overall OJT Completion</span>
            <span className="text-emerald-600 dark:text-emerald-400">{pct}% Complete</span>
          </div>
          <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-600 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${pct}%` }}></div>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8">
        {sectionTitle('☑', 'Intern Tasks & Assignments', 'Assign deliverables and provide constructive mentor feedback')}
        <form onSubmit={assignTask} className="bg-gray-50 dark:bg-gray-800/50 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-end mb-6">
          <div className="flex-1 w-full">
            <label className={labelCls}>Task Title / Objective</label>
            <input required value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="e.g. Implement user login API and write unit tests" className={inputCls} />
          </div>
          <div className="w-full md:w-52">
            <label className={labelCls}>Due Date</label>
            <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} className={inputCls} />
          </div>
          <button type="submit" className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 transition-all text-sm shrink-0 cursor-pointer">
            <Plus className="w-4 h-4" /> Assign Task
          </button>
        </form>

        <div className="space-y-4">
          {tasks.length === 0 && <div className="text-center py-8"><p className="text-sm text-gray-400 dark:text-gray-500">No tasks assigned yet. Use the form above to assign an objective.</p></div>}
          {tasks.map((task) => (
            <div key={task.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900/60">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border capitalize shrink-0 mt-0.5 ${taskStatusCls[task.status] || taskStatusCls.pending}`}>{String(task.status || '').replace('_', ' ')}</span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">{task.title}</h4>
                  {task.due_date && <p className="text-xs text-gray-400 mt-0.5">Due: {fmt(task.due_date)}</p>}
                  {task.student_notes && <div className="mt-2 text-xs p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700/60"><span className="font-semibold text-gray-900 dark:text-white">Student Note:</span> {task.student_notes}</div>}
                  {task.supervisor_feedback && <div className="mt-2 text-xs p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/50"><span className="font-semibold">Mentor Feedback:</span> {task.supervisor_feedback}</div>}
                </div>
              </div>
              {task.status !== 'pending' && (
                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                  <input type="text" placeholder="Add / update feedback..." value={feedback[task.id] ?? task.supervisor_feedback ?? ''} onChange={(e) => setFeedback({ ...feedback, [task.id]: e.target.value })} className="flex-1 md:w-56 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                  <button onClick={() => saveFeedback(task)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer">Save</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Attendance approval */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8">
        {sectionTitle('◷', 'Attendance Approval', 'Approve each time-in and time-out before hours are credited.')}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="py-3 pr-4">Date</th><th className="py-3 pr-4">Time In</th><th className="py-3 pr-4">Time Out</th><th className="py-3 pr-4">Hours</th><th className="py-3 text-right">Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {logs.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No attendance logs yet.</td></tr>}
              {logs.map((log) => {
                const fullyApproved = log.time_in_approved_at && log.time_out_approved_at;
                return (
                  <tr key={log.id}>
                    <td className="py-4 pr-4 font-semibold text-gray-900 dark:text-white">{fmt(log.date)}</td>
                    <td className="py-4 pr-4 text-gray-700 dark:text-gray-300">
                      <div>{log.time_in || '—'}</div>
                      <span className={`text-[11px] ${log.time_in_approved_at ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{log.time_in_approved_at ? 'Approved' : 'Pending'}</span>
                    </td>
                    <td className="py-4 pr-4 text-gray-700 dark:text-gray-300">
                      <div>{log.time_out || '—'}</div>
                      {log.time_out && <span className={`text-[11px] ${log.time_out_approved_at ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{log.time_out_approved_at ? 'Approved' : 'Pending'}</span>}
                    </td>
                    <td className="py-4 pr-4 font-semibold text-gray-900 dark:text-white">{fullyApproved ? `${log.hours_rendered} hrs` : 'Pending'}</td>
                    <td className="py-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {log.time_in && !log.time_in_approved_at && <button onClick={() => approve(log, 'in')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer">Approve Time In</button>}
                        {log.time_out && log.time_in_approved_at && !log.time_out_approved_at && <button onClick={() => approve(log, 'out')} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 cursor-pointer">Approve Time Out</button>}
                        {log.time_out && !log.time_in_approved_at && <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Approve time-in first</span>}
                        {fullyApproved && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Fully approved</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluations */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><span>★</span> Performance Evaluations</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Formal assessments required by the academic department</p>
          </div>
          {!showEval && (
            <button onClick={() => setShowEval(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 px-3.5 py-1.5 rounded-xl shadow-sm transition-all cursor-pointer">{evaluationReadOnly ? 'View Evaluation Form' : hasFinal ? 'Edit Evaluation' : '+ OJT Completion Evaluation'}</button>
          )}
        </div>

        {!hoursComplete && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            {!evaluationEditingEnabled ? 'Evaluation editing is currently disabled by the administrator. The form remains available in read-only preview.' : <>The OJT performance evaluation can be submitted after the intern completes all required rendered hours. Progress: <strong>{renderedHours} of {requiredHours} hours.</strong></>}
          </div>
        )}

        {showEval ? (
          <div>
            <EvaluationForm placementId={p.id} initialEvaluation={finalEvaluation} readOnly={evaluationReadOnly} onCancel={() => setShowEval(false)} onSaved={async () => { setShowEval(false); setMessage('Evaluation submitted.'); await load(); }} />
          </div>
        ) : (
          <div className="space-y-3">
            {evals.length === 0 && <div className="text-center py-8"><p className="text-sm text-gray-400 dark:text-gray-500">No evaluations submitted yet for this placement.</p></div>}
            {evals.map((ev) => (
              <div key={ev.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">OJT {(ev.evaluation_period || 'completion').replace('_', ' ')} Evaluation</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60 font-semibold">Completed</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ev.grade_description} • Submitted on {fmt(ev.submitted_at)}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{ev.overall_rating}</span>
                  <span className="text-xs font-medium text-gray-400">/5.0</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InternsPanel() {
  const [placements, setPlacements] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(async (p = 1, s = statusFilter, search = debouncedSearch) => {
    try {
      const res = await api.get('/company/interns', { params: { page: p, ...(s ? { status: s } : {}), ...(search ? { search } : {}) } });
      const d = res.data.data;
      setPlacements(d.data || d || []);
      setPage(d.current_page || p);
      setLastPage(d.last_page || 1);
      setTotal(d.total ?? (d.data || d || []).length);
    } catch (e) { setError(apiError(e)); setPlacements([]); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => { load(1, statusFilter, debouncedSearch); }, [statusFilter, debouncedSearch, load]);

  if (detailId) return <InternDetail placementId={detailId} onBack={() => { setDetailId(null); load(1, statusFilter, debouncedSearch); }} />;
  if (!placements) return <p className="py-12 text-center text-slate-500">{error || 'Loading…'}</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Intern Roster & Progress</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitor student training hours, task performance, and OJT completion evaluations</p>
        </div>
        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50 self-start sm:self-auto">
          {total} Total Intern{total !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 sm:p-5 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Search Student</label>
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name or student ID..." className={inputCls} />
        </div>
        <div className="w-full sm:w-60">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Placement Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all capitalize">
            <option value="">All Statuses</option>
            {['active', 'completed', 'terminated'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {(searchTerm || statusFilter) && <button type="button" onClick={() => { setSearchTerm(''); setStatusFilter(''); }} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">Reset</button>}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {placements.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-12 text-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No interns found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">Once applicants are accepted and assigned placement schedules, they will show up here.</p>
          </div>
        ) : placements.map((p) => {
          const pct = Math.min(100, p.completion_percentage ?? 0);
          const barColor = p.status === 'completed' ? 'from-blue-500 to-emerald-600' : p.status === 'terminated' ? 'from-rose-500 to-red-600' : 'from-emerald-500 to-teal-500';
          return (
            <div key={p.id} className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-extrabold text-base shadow-md shrink-0">{initialOf(p)}</div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug truncate">{nameOf(p)}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{studentOf(p).course}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border capitalize shrink-0 ${placementStatusCls[p.status] || placementStatusCls.active}`}>{p.status}</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 mb-5">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{postingOf(p).title}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">{fmt(p.start_date)} – {fmt(p.end_date)}</p>
                </div>
                <div className="mb-5">
                  <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
                    <span className="text-gray-500 dark:text-gray-400">Rendered Hours</span>
                    <span className="text-gray-900 dark:text-white">{p.rendered_hours} / {p.required_hours}h <span className="text-emerald-600 dark:text-emerald-400 ml-1">({pct}%)</span></span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-2 bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              </div>
              <button onClick={() => setDetailId(p.id)} className="w-full inline-flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/50 dark:border-emerald-800/50 py-2.5 rounded-xl transition-all cursor-pointer">
                View Performance & Tasks <span>→</span>
              </button>
            </div>
          );
        })}
      </div>

      {lastPage > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => load(page - 1, statusFilter, debouncedSearch)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">← Prev</button>
          <span className="text-sm text-gray-500 dark:text-gray-400 px-3">Page {page} of {lastPage}</span>
          <button disabled={page >= lastPage} onClick={() => load(page + 1, statusFilter, debouncedSearch)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">Next →</button>
        </div>
      )}
    </div>
  );
}
