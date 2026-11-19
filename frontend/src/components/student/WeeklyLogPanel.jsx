import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import api from '../../api/client';
import { Badge, btnGhost, btnPrimary, Card, EmptyState, Field, inputCls, Notice, apiError } from '../ui';

const statusCls = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300',
  reviewed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
};
const fmtShort = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
const fmtFull = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

export default function WeeklyLogPanel() {
  const [data, setData] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/student/weekly-logs');
      setData(res.data.data);
    } catch (e) { setError(apiError(e)); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data) return <p className="py-12 text-center text-slate-500">Loading…</p>;

  const placement = data.placement;
  const logs = data.logs || [];
  const nextWeek = data.next_week;
  const posting = placement?.internship_posting;
  const companyName = posting?.company_profile?.company_name || 'Partner Company';

  const openForm = () => {
    setForm({
      week_number: nextWeek?.week_number || 1,
      week_start: nextWeek?.week_start || '',
      week_end: nextWeek?.week_end || '',
      hours_this_week: '',
      activities_done: '',
      learnings: '',
      challenges: '',
    });
    setShowForm(true); setError(''); setMessage('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/student/weekly-logs', form);
      setMessage('Weekly log submitted.');
      setShowForm(false);
      await load();
    } catch (err) { setError(apiError(err)); }
  };

  if (!placement) {
    return <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm">
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No Active Internship Placement</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">Weekly accomplishment logs will be activated once your internship placement is active.</p>
    </div>;
  }

  return (
    <div>
      {/* Header banner */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{companyName}</h2>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{posting?.title}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Training Period: {fmtShort(placement.start_date)} – {fmtFull(placement.end_date)}</p>
        </div>
        <button onClick={openForm} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer shrink-0">
          <Plus className="w-4 h-4" /><span>Submit Weekly Log</span>
        </button>
      </div>

      <Notice message={message} error={error} />

      {logs.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No Weekly Logs Submitted Yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">Submit weekly progress logs to report rendered hours, key achievements, and learnings for academic review.</p>
          <button onClick={openForm} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 cursor-pointer">
            <span>Submit Week 1 Log</span><ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center font-black text-emerald-700 dark:text-emerald-300 text-base shrink-0">W{log.week_number}</div>
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">Week {log.week_number} Summary</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{fmtShort(log.week_start)} – {fmtFull(log.week_end)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="inline-flex items-center text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">{log.hours_this_week} hrs</span>
                  <span className={`inline-flex items-center text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${statusCls[log.status] || statusCls.draft}`}>{log.status}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">{log.activities_done}</p>
              {log.supervisor_remarks && (
                <div className="mt-3.5 p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-blue-600 dark:text-blue-400 block mb-0.5">Supervisor Remarks:</span>
                  <p className="leading-relaxed">{log.supervisor_remarks}</p>
                </div>
              )}
              <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800 flex items-center justify-end">
                <button onClick={() => setViewing(log)} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer">View Full Submission →</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit modal */}
      {showForm && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={submit} className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-900 p-7 shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-gray-100 dark:border-gray-800">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-lg shrink-0">W{form.week_number}</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Week {form.week_number} Accomplishment Report</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Coverage: {fmtShort(form.week_start)} – {fmtFull(form.week_end)}</p>
              </div>
            </div>
            <Notice message={message} error={error} />
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Field label="Week Start *"><input type="date" required value={form.week_start} onChange={(e) => setForm({ ...form, week_start: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" /></Field>
                <Field label="Week End *"><input type="date" required value={form.week_end} onChange={(e) => setForm({ ...form, week_end: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" /></Field>
                <Field label="Hours Rendered *"><input type="number" required min="0" max="60" step="0.5" value={form.hours_this_week} onChange={(e) => setForm({ ...form, hours_this_week: e.target.value })} placeholder="e.g. 40" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" /></Field>
              </div>
              <Field label="Activities & Accomplishments *"><textarea rows={5} required value={form.activities_done} onChange={(e) => setForm({ ...form, activities_done: e.target.value })} placeholder="Detail your major projects, completed assignments, meetings attended, and responsibilities for the week..." className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent leading-relaxed" /></Field>
              <Field label="Key Learnings & Insights"><textarea rows={3} value={form.learnings} onChange={(e) => setForm({ ...form, learnings: e.target.value })} placeholder="What new concepts, tools, or best practices did you discover this week?" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent leading-relaxed" /></Field>
              <Field label="Challenges Encountered & Solutions"><textarea rows={3} value={form.challenges} onChange={(e) => setForm({ ...form, challenges: e.target.value })} placeholder="Any blockers or hurdles you faced? How did you overcome them?" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent leading-relaxed" /></Field>
              <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button type="submit" className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 text-sm cursor-pointer">Submit Weekly Report</button>
                <button type="button" onClick={() => setShowForm(false)} className={btnGhost}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setViewing(null)}>
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-900 p-7 shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center font-black text-emerald-700 dark:text-emerald-300 text-xl shrink-0">W{viewing.week_number}</div>
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Week {viewing.week_number} Log Summary</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{fmtShort(viewing.week_start)} – {fmtFull(viewing.week_end)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">{viewing.hours_this_week} hrs rendered</span>
                <span className={`inline-flex items-center text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${statusCls[viewing.status] || statusCls.draft}`}>{viewing.status}</span>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2"><span className="w-1.5 h-4 rounded-full bg-emerald-600" />Accomplishments & Key Activities</h3>
                <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800"><p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line leading-relaxed">{viewing.activities_done}</p></div>
              </div>
              {viewing.learnings && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2"><span className="w-1.5 h-4 rounded-full bg-emerald-600" />Key Learnings & Insights</h3>
                  <div className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/40"><p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line leading-relaxed">{viewing.learnings}</p></div>
                </div>
              )}
              {viewing.challenges && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2"><span className="w-1.5 h-4 rounded-full bg-amber-600" />Challenges & Resolution</h3>
                  <div className="p-5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100/70 dark:border-amber-900/40"><p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line leading-relaxed">{viewing.challenges}</p></div>
                </div>
              )}
              {viewing.supervisor_remarks && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2"><span className="w-1.5 h-4 rounded-full bg-blue-600" />Supervisor Evaluation & Remarks</h3>
                  <div className="p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40"><p className="text-sm text-blue-900 dark:text-blue-200 whitespace-pre-line leading-relaxed">{viewing.supervisor_remarks}</p></div>
                </div>
              )}
              {viewing.submitted_at && <p className="pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500">Submitted on {new Date(viewing.submitted_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>}
            </div>
            <div className="mt-6 flex justify-end"><button onClick={() => setViewing(null)} className={btnGhost}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
