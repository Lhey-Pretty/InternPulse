import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../../api/client';
import { apiError, Pager, pageMeta, useDebounced } from '../ui';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const studentOf = (a) => a.student_profile || a.studentProfile || {};
const postingOf = (a) => a.internship_posting || a.internshipPosting || {};
const companyOf = (a) => postingOf(a).company_profile || postingOf(a).companyProfile || {};
const nameOf = (a) => studentOf(a).full_name || `${studentOf(a).first_name || ''} ${studentOf(a).last_name || ''}`.trim() || '—';
const initialOf = (a) => (studentOf(a).first_name || nameOf(a) || '?').charAt(0).toUpperCase();

const appStatusCls = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  shortlisted: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  interview: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
};
const STATUSES = ['pending', 'accepted', 'rejected'];

export default function ApplicationsReviewPanel() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page };
      if (status) params.status = status;
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await api.get('/coordinator/applications', { params });
      const meta = pageMeta(res.data.data);
      setApps(meta.items);
      setLastPage(meta.lastPage);
      setTotal(meta.total);
      setStatusCounts(res.data.status_counts || {});
      if (meta.page !== page) setPage(meta.page);
    } catch (e) { 
      console.error('Load error:', e);
      setError(apiError(e)); 
      setApps([]); 
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch, page]);

  useEffect(() => { 
    const timer = setTimeout(() => load(), 300);
    return () => clearTimeout(timer);
  }, [load]);

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: Number(statusCounts[s] || 0) }), {});

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Student Applications Review</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitor internship applications submitted by students — status is managed by the hiring company</p>
      </div>

      {error && <p className="mb-4 px-4 py-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-300 border border-red-200 dark:border-red-900 rounded-xl">{error}</p>}

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => { setStatus(''); setPage(1); }} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${!status ? 'bg-gray-900 text-white border-gray-900' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>All</button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border capitalize transition-colors cursor-pointer ${status === s ? 'bg-emerald-600 text-white border-emerald-600' : appStatusCls[s]}`}>{s}{counts[s] ? ` (${counts[s]})` : ''}</button>
        ))}
      </div>

      <div className="mb-5">
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by student name..." className="max-w-sm px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Student</th><th className="px-6 py-4">Position & Company</th><th className="px-6 py-4">Applied</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-sm text-gray-500">Loading applications...</td></tr>
              ) : apps.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">No applications found</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Student applications will appear here for review.</p>
                </td></tr>
              ) : apps.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">{initialOf(app)}</div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white leading-tight">{nameOf(app)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{studentOf(app).course || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white text-xs">{postingOf(app).title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{companyOf(app).company_name}</p>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{fmt(app.applied_at || app.created_at)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${appStatusCls[app.status] || appStatusCls.pending}`}>{app.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setDetail(app)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer">Review <span>→</span></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pager page={page} lastPage={lastPage} total={total} onChange={setPage} noun="applications" className="mt-4" />

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 p-6 sm:p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{nameOf(detail)}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{postingOf(detail).title} · {companyOf(detail).company_name}</p>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
              {[
                ['Student ID', studentOf(detail).student_id_number || '—'],
                ['Course', studentOf(detail).course || '—'],
                ['Applied', fmt(detail.applied_at || detail.created_at)],
                ['Status', detail.status],
              ].map(([k, v]) => (
                <div key={k} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{k}</p>
                  <p className="text-gray-900 dark:text-white font-medium mt-0.5 capitalize">{v}</p>
                </div>
              ))}
            </div>

            {detail.cover_letter && (
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Cover Letter</p>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{detail.cover_letter}</div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${appStatusCls[detail.status] || appStatusCls.pending}`}>{detail.status}</span>
              <p className="text-xs text-gray-400 dark:text-gray-500">Status is managed by the hiring company.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
