import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import { Notice, apiError } from '../ui';

const emptyForm = { company_name: '', contact_email: '', website: '', reason: '' };

export default function CompanyRequestsPanel() {
  const [requests, setRequests] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/student/company-requests');
      setRequests(res.data.data || []);
    } catch (e) { setError(apiError(e)); setRequests([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!requests) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">Loading…</p>;

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      await api.post('/student/company-requests', form);
      setMessage('Company request submitted for campus review.');
      setForm(emptyForm);
      await load();
    } catch (err) { setError(apiError(err)); }
  };

  const inputCls = 'w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white';
  const labelCls = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#064e26] via-[#0b6333] to-[#043319] p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/20">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100">
            <span>+</span> Company Request
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Request a New Company</h1>
          <p className="mt-2 text-sm leading-relaxed text-emerald-100/90">Can't find your preferred company? Send the details below so it can be reviewed as a potential campus partner.</p>
        </div>
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-emerald-400/10 blur-2xl"></div>
        <div className="absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl"></div>
      </div>

      <Notice message={message} error={error} />

      {/* Form */}
      <form onSubmit={submit} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8 dark:text-gray-100">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2zM9 7h6m-6 4h6m-6 4h3"/></svg>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Company details</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Provide information that will help with the review.</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Company name <span className="text-rose-500 dark:text-rose-400">*</span></label>
            <input required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="e.g. ABC Corporation" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Contact email <span className="font-normal normal-case tracking-normal text-gray-400 dark:text-gray-400">(optional)</span></label>
            <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="company@example.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Website <span className="font-normal normal-case tracking-normal text-gray-400 dark:text-gray-400">(optional)</span></label>
            <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Why this company?</label>
            <textarea rows={4} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Tell us why you would like to intern with this company." className={`${inputCls} resize-none`} />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:from-emerald-700 hover:to-teal-700 cursor-pointer dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800 dark:hover:to-teal-800">
            Submit Request <span>→</span>
          </button>
        </div>
      </form>

      {/* Requests list */}
      {requests.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your requests</h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">{requests.length} total</span>
          </div>
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-sm font-extrabold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">{(r.company_name || 'C').charAt(0).toUpperCase()}</div>
                    <strong className="text-sm text-gray-900 dark:text-white">{r.company_name}</strong>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold capitalize text-gray-600 dark:bg-gray-800 dark:text-gray-300">{r.status}</span>
                </div>
                <p className="mt-3 border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-500 dark:border-gray-800 dark:text-gray-400">{r.review_notes || 'Awaiting campus review.'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
