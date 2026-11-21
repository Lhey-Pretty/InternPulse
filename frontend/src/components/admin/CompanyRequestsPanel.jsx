import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import { apiError, Pager, pageMeta } from '../ui';

export default function CompanyRequestsPanel() {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [credentials, setCredentials] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async (p = page) => {
    try {
      const res = await api.get('/admin/company-requests', { params: { page: p } });
      const meta = pageMeta(res.data.data);
      setRequests(meta.items);
      setPage(meta.page);
      setLastPage(meta.lastPage);
      setTotal(meta.total);
    } catch (e) { setError(apiError(e)); setRequests([]); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const approve = async (req) => {
    if (!window.confirm(`Approve "${req.company_name}" and create a company account?`)) return;
    setBusyId(req.id); setError('');
    try {
      const res = await api.patch(`/admin/company-requests/${req.id}/review`, { status: 'approved' });
      const d = res.data.data;
      setCredentials({ email: d.login_email, password: d.temporary_password, name: req.company_name });
      await load();
    } catch (e) { setError(apiError(e)); }
    finally { setBusyId(null); }
  };

  const reject = async (req) => {
    if (!rejectNotes.trim()) { setError('A rejection reason is required.'); return; }
    setBusyId(req.id); setError('');
    try {
      await api.patch(`/admin/company-requests/${req.id}/review`, { status: 'rejected', review_notes: rejectNotes });
      setRejectingId(null); setRejectNotes('');
      setMessage('Company request rejected.');
      await load();
    } catch (e) { setError(apiError(e)); }
    finally { setBusyId(null); }
  };

  if (!requests) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">{error || 'Loading…'}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Company Requests</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review companies that students want to add to the campus partnership network.</p>
      </div>

      {credentials && (
        <div className="rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 p-5">
          <h3 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">✓ Company Approved — Account Created</h3>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">Share these credentials with <strong>{credentials.name}</strong>. The company must change the password on first login.</p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800 dark:text-gray-100">
              <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-400">Login Email</p>
              <p className="font-mono font-bold text-gray-900 dark:text-white mt-0.5">{credentials.email}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800 dark:text-gray-100">
              <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-400">Temporary Password</p>
              <p className="font-mono font-bold text-gray-900 dark:text-white mt-0.5">{credentials.password}</p>
            </div>
          </div>
          <button onClick={() => setCredentials(null)} className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {error && <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm font-semibold">{error}</div>}
      {message && <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold">{message}</div>}

      <div className="space-y-3">
        {requests.length === 0 && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-12 text-center text-gray-400 text-sm dark:text-gray-400">No company requests.</div>
        )}
        {requests.map((req) => (
          <div key={req.id} className="rounded-2xl bg-white dark:bg-gray-900 p-5 shadow-sm border border-gray-100 dark:border-gray-800 dark:text-gray-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">{req.company_name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Requested by {req.student?.name || 'Unknown'} · {req.contact_email || 'No contact email'}</p>
                {req.reason && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{req.reason}</p>}
                {req.review_notes && <p className="mt-2 text-xs text-rose-500 dark:text-rose-400">Rejection notes: {req.review_notes}</p>}
              </div>
              <span className={`capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full ${req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : req.status === 'rejected' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>{req.status}</span>
            </div>
            {req.status === 'pending' && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => approve(req)} disabled={busyId === req.id}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer dark:bg-emerald-700">
                  {busyId === req.id ? 'Processing…' : 'Approve & Create Account'}
                </button>
                {rejectingId === req.id ? (
                  <div className="flex gap-2 items-center">
                    <input value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} placeholder="Reason for rejection" required
                      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs dark:text-white dark:placeholder:text-gray-400" />
                    <button onClick={() => reject(req)} disabled={busyId === req.id}
                      className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60 cursor-pointer dark:bg-rose-700">Reject</button>
                    <button onClick={() => { setRejectingId(null); setRejectNotes(''); }} className="text-xs text-gray-500 hover:underline cursor-pointer dark:text-gray-400">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => { setRejectingId(req.id); setRejectNotes(''); }}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer dark:bg-rose-700">Reject</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <Pager page={page} lastPage={lastPage} total={total} onChange={load} noun="requests" />
    </div>
  );
}
