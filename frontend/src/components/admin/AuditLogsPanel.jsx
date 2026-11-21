import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import { apiError, useDebounced } from '../ui';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';
const base = (t) => (t || '').split('\\').pop();

export default function AuditLogsPanel() {
  const [logs, setLogs] = useState(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const applied = useDebounced(search);
  const [error, setError] = useState('');

  const load = useCallback(async (p = 1, s = applied) => {
    try {
      const res = await api.get('/admin/audit-logs', { params: { page: p, ...(s ? { search: s } : {}) } });
      const d = res.data.data;
      setLogs(d.data || []);
      setPage(d.current_page || p);
      setLastPage(d.last_page || 1);
    } catch (e) { setError(apiError(e)); setLogs([]); }
  }, [applied]);

  useEffect(() => { load(1); }, [applied]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!logs) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">{error || 'Loading…'}</p>;

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide uppercase mb-1"> Security & Governance</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Trail</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Chronological record of user activity, administrative actions, and system changes</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 dark:text-gray-100">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search action type (e.g. login, create, update)..."
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all dark:placeholder:text-gray-400" />
          </div>
          {search && (
            <button type="button" onClick={() => setSearch('')} className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 cursor-pointer self-start sm:self-auto dark:text-gray-400">Clear</button>
          )}
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm font-semibold">{error}</div>}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden dark:text-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
                <th className="px-6 py-4">Action Event</th><th className="px-6 py-4">Actor</th><th className="px-6 py-4">Subject Target</th><th className="px-6 py-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {logs.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">No audit logs recorded</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Platform actions and changes will be logged here as they occur.</p>
                </td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center font-mono text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">{log.action}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.user ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center text-[10px] dark:from-emerald-800 dark:to-teal-800">{(log.user.name || '?').charAt(0).toUpperCase()}</div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-xs leading-tight">{log.user.name}</p>
                          <p className="text-[11px] text-gray-400 capitalize dark:text-gray-400">{log.user.role}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>System Automated</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.subject_type ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{base(log.subject_type)} #{log.subject_id}</span>
                    ) : <span className="text-gray-400 text-xs dark:text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-gray-500 dark:text-gray-400">{fmt(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {lastPage > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer">← Prev</button>
          <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {lastPage}</span>
          <button disabled={page >= lastPage} onClick={() => load(page + 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer">Next →</button>
        </div>
      )}
    </div>
  );
}
