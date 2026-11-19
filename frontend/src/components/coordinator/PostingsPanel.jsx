import React, { useCallback, useEffect, useState } from 'react';

import api from '../../api/client';
import { apiError } from '../ui';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const postingCompany = (p) => p.company_profile || p.companyProfile || {};
const logoUrl = (p) => {
  const logo = postingCompany(p).logo_path || postingCompany(p).logoPath;
  return logo ? `${import.meta.env.VITE_API_URL?.replace(/\/api.*$/, '') || 'http://127.0.0.1:8000'}/storage/${logo}` : null;
};

const statusCls = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
  closed: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
};
const dotCls = { approved: 'bg-emerald-500', pending: 'bg-amber-500', rejected: 'bg-rose-500', closed: 'bg-gray-400' };
const inputCls = 'w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5';
const thCls = 'px-6 py-4';
const tdCls = 'px-6 py-4';
const theadCls = 'border-b border-gray-100 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider';

function PostingDetail({ id, onBack, onChanged }) {
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    api.get(`/coordinator/postings/${id}`).then((res) => setP(res.data.data)).catch((e) => setError(apiError(e)));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (!p) return <p className="py-12 text-center text-slate-500">{error || 'Loading…'}</p>;
  const company = postingCompany(p);
  const skills = p.required_skills || p.requiredSkills || [];

  const act = async (action) => {
    setError(''); setMessage('');
    try {
      if (action === 'approve') await api.patch(`/coordinator/postings/${p.id}/approve`);
      else await api.patch(`/coordinator/postings/${p.id}/reject`, { rejection_reason: reason });
      setMessage(action === 'approve' ? 'Posting approved.' : 'Posting rejected.');
      setRejecting(false); setReason('');
      load(); onChanged?.();
    } catch (e) { setError(apiError(e)); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 mb-3 cursor-pointer">← Back to postings</button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            {logoUrl(p) && <img src={logoUrl(p)} alt={`${company.company_name} logo`} className="w-16 h-16 object-contain rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1 mb-3" />}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">{p.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{p.position} · {company.company_name || '—'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Posted {fmt(p.created_at)} · Updated {fmt(p.updated_at)}</p>
          </div>
          <span className={`inline-flex self-start items-center px-3 py-1 rounded-full text-xs font-semibold border capitalize ${statusCls[p.status] || statusCls.closed}`}>{p.status}</span>
        </div>
      </div>

      {message && <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold">{message}</div>}
      {error && <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm font-semibold">{error}</div>}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[['Location', p.location || '—'], ['Work Setup', p.work_setup ? p.work_setup : '—'], ['Slots', p.slots], ['Required Hours', `${p.required_hours || 480} hours`]].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-1 capitalize">{val}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[['Internship Type', 'OJT / Internship'], ['Compensation', p.is_paid ? `Paid${p.allowance ? ` · ₱${Number(p.allowance).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}` : 'Unpaid'], ['Duration', p.duration_months ? `${p.duration_months} month(s)` : '480 hours']].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">{val}</p>
            </div>
          ))}
        </div>

        {p.description && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">Job Description</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">{p.description}</p>
          </div>
        )}
        {[
          ['Responsibilities', p.responsibilities],
          ['Qualifications', p.qualifications],
        ].map(([label, content]) => content ? (
          <div key={label} className="border-t border-gray-100 dark:border-gray-800 pt-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">{label}</h2>
            <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">{content}</div>
          </div>
        ) : null)}

        {skills.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Required Skills</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((s, i) => (
                <span key={i} className="inline-flex items-center px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-200/50 dark:border-emerald-800/50"># {typeof s === 'object' ? s.name : s}</span>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">Application Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[['Required Course', p.required_course || 'Any course'], ['Required Year', p.required_year_level || '4th Year'], ['Application Deadline', fmt(p.application_deadline)]].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{val}</p>
              </div>
            ))}
          </div>
        </div>

        {company.company_name && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">About the Company</h2>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{company.company_name}</p>
            {company.industry && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{company.industry}</p>}
            {company.description && <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed mt-2">{company.description}</p>}
          </div>
        )}

        {p.status === 'pending' && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5 space-y-3">
            {rejecting ? (
              <div className="flex flex-wrap gap-2">
                <input value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="Reason for rejection..." className={inputCls + ' flex-1 min-w-[200px]'} />
                <button onClick={() => act('reject')} disabled={!reason.trim()} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold cursor-pointer">Confirm Reject</button>
                <button onClick={() => { setRejecting(false); setReason(''); }} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">Cancel</button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => act('approve')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold cursor-pointer">✓ Approve Posting</button>
                <button onClick={() => setRejecting(true)} className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900 rounded-xl text-sm font-semibold cursor-pointer">Reject…</button>
                <button onClick={onBack} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">Back</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostingsPanel() {
  const [postings, setPostings] = useState(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [rejectFor, setRejectFor] = useState(null);
  const [reason, setReason] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (p = 1) => {
    try {
      const res = await api.get('/coordinator/postings', { params: { ...(status ? { status } : {}), page: p } });
      const d = res.data.data;
      setPostings(d.data || d || []);
      setTotal(d.total ?? (d.data || d || []).length);
      setPage(d.current_page || p);
      setLastPage(d.last_page || 1);
    } catch (e) { setError(apiError(e)); setPostings([]); }
  }, [status]);

  useEffect(() => { load(1); }, [load]);

  const act = async (p, action) => {
    setError(''); setMessage('');
    try {
      if (action === 'approve') await api.patch(`/coordinator/postings/${p.id}/approve`);
      else {
        if (!reason.trim()) { setError('Rejection reason is required.'); return; }
        await api.patch(`/coordinator/postings/${p.id}/reject`, { rejection_reason: reason });
      }
      setMessage(action === 'approve' ? 'Posting approved.' : 'Posting rejected.');
      setRejectFor(null); setReason('');
      load(page);
    } catch (e) { setError(apiError(e)); }
  };

  if (detailId) return <PostingDetail id={detailId} onBack={() => { setDetailId(null); load(page); }} onChanged={() => load(page)} />;
  if (!postings) return <p className="py-12 text-center text-slate-500">{error || 'Loading…'}</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Internship Postings Review</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Approve or moderate internship opportunities submitted by partner host establishments</p>
        </div>
        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50 self-start sm:self-auto">
          {total} Total {total === 1 ? 'Posting' : 'Postings'}
        </span>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 sm:p-5 mb-6 flex flex-wrap gap-4 items-end">
        <div className="w-full sm:w-64">
          <label className={labelCls}>Posting Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} capitalize`}>
            <option value="">All Statuses</option>
            {['pending', 'approved', 'rejected', 'closed'].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {status && <button type="button" onClick={() => setStatus('')} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">Reset</button>}
        </div>
      </div>

      {message && <div className="mb-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold">{message}</div>}
      {error && <div className="mb-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm font-semibold">{error}</div>}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={theadCls}>
                <th className={thCls}>Posting Details</th><th className={thCls}>Company</th><th className={thCls}>Slots</th><th className={thCls}>Deadline</th><th className={thCls}>Status</th><th className={`${thCls} text-right`}>Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {postings.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">No postings found</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-sm mx-auto">No internship listings match your selected criteria.</p>
                </td></tr>
              ) : postings.map((p) => {
                const company = postingCompany(p);
                const logo = logoUrl(p);
                return (
                  <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                    <td className={tdCls}>
                      <div className="flex items-start gap-3">
                        {logo ? (
                          <img src={logo} alt={`${company.company_name} logo`} className="w-10 h-10 rounded-xl object-contain bg-white dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700 shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base shrink-0 mt-0.5">{(company.company_name || '?').charAt(0).toUpperCase()}</div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-900 dark:text-white leading-snug">{p.title}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span> {p.location || 'Location TBD'}</span>
                            <span>•</span>
                            <span className="capitalize">{p.work_setup || '—'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`${tdCls} text-xs font-semibold text-gray-800 dark:text-gray-200`}>{company.company_name || '—'}</td>
                    <td className={`${tdCls} text-xs font-semibold text-gray-700 dark:text-gray-300`}>{p.slots} {p.slots === 1 ? 'slot' : 'slots'}</td>
                    <td className={`${tdCls} text-xs text-gray-500 dark:text-gray-400`}>{fmt(p.application_deadline)}</td>
                    <td className={tdCls}>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${statusCls[p.status] || statusCls.closed}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotCls[p.status] || 'bg-gray-400'}`}></span>
                        {p.status}
                      </span>
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setDetailId(p.id)} className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer">View Details</button>
                          {p.status === 'pending' && (
                            <>
                              <button onClick={() => act(p, 'approve')} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer">✓ Approve</button>
                              <button onClick={() => { setRejectFor(rejectFor === p.id ? null : p.id); setReason(''); }} className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900 rounded-xl text-xs font-semibold transition-colors cursor-pointer">Reject…</button>
                            </>
                          )}
                        </div>
                        {rejectFor === p.id && (
                          <div className="w-full max-w-xs mt-1 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl">
                            <div className="flex gap-2">
                              <input value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="Reason for rejection..." className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-800 border border-rose-300 dark:border-rose-800 rounded-lg text-xs text-gray-900 dark:text-white" />
                              <button onClick={() => act(p, 'reject')} className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors shrink-0 cursor-pointer">Confirm</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {lastPage > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer">← Prev</button>
          <span className="text-sm text-gray-500">Page {page} of {lastPage}</span>
          <button disabled={page >= lastPage} onClick={() => load(page + 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer">Next →</button>
        </div>
      )}
    </div>
  );
}
