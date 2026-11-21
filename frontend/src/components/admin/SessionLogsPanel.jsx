import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import { apiError, Pager, pageMeta, useDebounced } from '../ui';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';

export default function SessionLogsPanel() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [event, setEvent] = useState('');
  const debouncedSearch = useDebounced(search);
  const [error, setError] = useState('');

  const load = useCallback(async (p = 1) => {
    try {
      const params = { page: p };
      if (debouncedSearch) params.search = debouncedSearch;
      if (event) params.event = event;
      const res = await api.get('/admin/session-logs', { params });
      setData(res.data.data);
    } catch (e) { setError(apiError(e)); setData({ logs: { data: [] }, active_count: 0 }); }
  }, [debouncedSearch, event]);

  useEffect(() => { load(); }, [load]);

  const paged = pageMeta(data?.logs);
  const logs = paged.items;
  const activeCount = data?.active_count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">Access Monitoring</div>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Session Logs</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Login history, logout events, failed attempts, and recent active sessions.</p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900 border border-gray-100 dark:border-gray-800 dark:text-gray-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Recently active users</p>
        <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{activeCount}</p>
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900 border border-gray-100 dark:border-gray-800 dark:text-gray-100">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email address" className="flex-1 min-w-[200px] rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:placeholder:text-gray-400" />
        <select value={event} onChange={(e) => setEvent(e.target.value)} className="rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm px-3.5 py-2.5 text-gray-900 dark:text-white dark:placeholder:text-gray-400">
          <option value="">All events</option>
          {['login', 'logout', 'failed_login'].map((ev) => <option key={ev} value={ev}>{ev.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-900 border border-gray-100 dark:border-gray-800 dark:text-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400"><tr><th className="px-5 py-4">User</th><th className="px-5 py-4">Event</th><th className="px-5 py-4">Browser</th><th className="px-5 py-4">Time</th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {logs.length === 0 ? (
                <tr><td colSpan="4" className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400">No session events recorded.</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white">{log.user?.name || 'Unknown user'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{log.email || '—'}</p>
                  </td>
                  <td className="px-5 py-4"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold capitalize dark:bg-gray-800">{(log.event || '').replace('_', ' ')}</span></td>
                  <td className="max-w-xs px-5 py-4 text-xs text-gray-500 dark:text-gray-400"><p className="truncate">{log.user_agent || '—'}</p></td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500 dark:text-gray-400">{fmt(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pager page={paged.page} lastPage={paged.lastPage} total={paged.total} onChange={load} noun="session events" />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
