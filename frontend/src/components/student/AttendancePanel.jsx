import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import api from '../../api/client';
import { Field, Notice, apiError, pageMeta, Pager } from '../ui';

const statusStyles = {
  present: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
  absent: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300',
  late: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
  half_day: 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300',
  excused: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300',
};

const currentTimeValue = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

export default function AttendancePanel({ onNavigate, hasAcceptedApplication }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(() => ({ time_in: currentTimeValue(), time_out: currentTimeValue() }));
  const [timeout, setTimeoutVal] = useState(currentTimeValue);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/student/attendance', { params: { page } });
      setData(res.data.data);
    } catch (e) { setError(apiError(e)); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  if (!data) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">Loading…</p>;

  const placement = data.placement;
  const pagedLogs = pageMeta(data.logs);
  const logs = pagedLogs.items;
  const todayLog = data.today_log;

  if (!placement) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm dark:text-gray-100">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No Active Internship Placement</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">Daily attendance and time-in/out logs will be recorded once your placement is confirmed.</p>
        {!hasAcceptedApplication && (
          <button onClick={() => onNavigate?.('opportunities')} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 cursor-pointer dark:from-emerald-800 dark:to-teal-800">
            <span>Browse Internships</span><ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  const store = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    if (form.time_out && form.time_out <= form.time_in) {
      setError('Time Out must be later than Time In. Adjust either time, or clear Time Out if you will record it when your shift ends.');
      return;
    }
    try {
      await api.post('/student/attendance', form);
      setMessage('Attendance logged.');
      setForm({ time_in: currentTimeValue(), time_out: currentTimeValue() });
      await load();
    } catch (err) { setError(apiError(err)); }
  };

  const doTimeout = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      await api.patch(`/student/attendance/${todayLog.id}/timeout`, { time_out: timeout });
      setMessage('Time out recorded.');
      setTimeoutVal(currentTimeValue());
      await load();
    } catch (err) { setError(apiError(err)); }
  };

  const approvalLabel = (log) => {
    if (!log.time_in_approved_at) return 'Awaiting company approval';
    if (!log.time_out) return 'Time-in checked';
    if (!log.time_out_approved_at) return 'Time-out awaiting approval';
    return 'Time-in and time-out checked';
  };

  return (
    <div>
      <Notice message={message} error={error} />

      {/* Today action */}
      {!todayLog ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-7 mb-6 shadow-sm dark:text-gray-100">
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Record attendance</h2>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <form onSubmit={store} className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
            <Field label="Time In *"><input type="time" required value={form.time_in} onChange={(e) => setForm({ ...form, time_in: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-gray-100 dark:placeholder:text-gray-400" /></Field>
            <Field label="Time Out (Optional)"><input type="time" value={form.time_out} onChange={(e) => setForm({ ...form, time_out: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-gray-100 dark:placeholder:text-gray-400" /></Field>
            <button type="submit" className="h-11 w-full whitespace-nowrap rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 cursor-pointer">Log attendance</button>
          </form>
        </div>
      ) : !todayLog.time_out ? (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-200 dark:border-emerald-800/80 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm">Logged In at {todayLog.time_in} today</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Don't forget to record your time out before leaving the shift.</p>
            </div>
            <form onSubmit={doTimeout} className="flex items-center gap-3">
              <input type="time" required value={timeout} onChange={(e) => setTimeoutVal(e.target.value)} className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-gray-100 dark:placeholder:text-gray-400" />
              <button type="submit" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 text-sm shrink-0 cursor-pointer dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800 dark:hover:to-emerald-800">Record Time Out</button>
            </form>
          </div>
        </div>
      ) : (
        <div className={`p-5 rounded-2xl border mb-6 flex items-center gap-3 ${todayLog.time_in_approved_at && todayLog.time_out_approved_at ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200' : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'}`}>
          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${todayLog.time_in_approved_at && todayLog.time_out_approved_at ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300'}`}>!</span>
          <div className="text-sm">
            <span className="font-bold">{todayLog.time_in_approved_at && todayLog.time_out_approved_at ? "Today's attendance approved:" : "Today's attendance is awaiting company approval:"}</span>
            <span className="ml-1">{todayLog.time_in} to {todayLog.time_out}{todayLog.hours_rendered ? ` (${todayLog.hours_rendered}h credited)` : ''}</span>
          </div>
        </div>
      )}

      {/* History table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden dark:text-gray-100">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Attendance history</h2>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{pagedLogs.total} {pagedLogs.total === 1 ? 'record' : 'records'}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/50">
                {['Date', 'Time In', 'Time Out', 'Hours Rendered', 'Status'].map((h) => (
                  <th key={h} className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/80">
              {logs.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400 dark:text-gray-400">No attendance logs recorded yet.</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-sm">
                    {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    <span className="text-xs text-gray-400 font-normal block dark:text-gray-400">{new Date(log.date).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono">{log.time_in || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono">{log.time_out || '—'}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white text-sm">{log.time_in_approved_at && log.time_out_approved_at ? `${log.hours_rendered} hrs` : '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusStyles[log.status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                      {log.time_in_approved_at ? 'Checked' : (log.status || 'present').replace('_', ' ')}
                    </span>
                    <span className={`block mt-1 text-[11px] font-semibold ${log.time_in_approved_at ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{approvalLabel(log)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pager page={pagedLogs.page} lastPage={pagedLogs.lastPage} total={pagedLogs.total} onChange={setPage} noun="attendance logs" className="mt-4" />
    </div>
  );
}
