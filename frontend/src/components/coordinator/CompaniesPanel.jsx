import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import api from '../../api/client';
import { apiError } from '../ui';

const hostOf = (u) => { try { return new URL(u).host; } catch { return u; } };

const vCls = {
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
};
const pCls = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
  closed: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
};
const inputCls = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:placeholder-gray-400';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5';

function CompanyDetail({ id, onBack, onChanged }) {
  const [data, setData] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get(`/coordinator/companies/${id}`).then((res) => setData(res.data.data)).catch((e) => setError(apiError(e)));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">{error || 'Loading…'}</p>;
  const c = data.company;
  const stats = data.journal_stats || {};
  const pct = stats.unrelated_percentage || 0;
  const tone = pct >= 30 ? 'rose' : pct >= 15 ? 'amber' : 'emerald';
  const toneCls = {
    rose: { banner: 'bg-rose-50 border-rose-200 dark:bg-rose-950/60 dark:border-rose-800/60', text: 'text-rose-900 dark:text-rose-200', sub: 'text-rose-700 dark:text-rose-300', card: 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-800/60', cardText: 'text-rose-600 dark:text-rose-400', cardVal: 'text-rose-700 dark:text-rose-300' },
    amber: { banner: 'bg-amber-50 border-amber-200 dark:bg-amber-950/60 dark:border-amber-800/60', text: 'text-amber-900 dark:text-amber-200', sub: 'text-amber-700 dark:text-amber-300', card: 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-800/60', cardText: 'text-amber-600 dark:text-amber-400', cardVal: 'text-amber-700 dark:text-amber-300' },
    emerald: { banner: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800/60', text: 'text-emerald-900 dark:text-emerald-200', sub: 'text-emerald-700 dark:text-emerald-300', card: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-800/60', cardText: 'text-emerald-600 dark:text-emerald-400', cardVal: 'text-emerald-700 dark:text-emerald-300' },
  }[tone];
  const statusLabel = pct >= 30 ? 'Needs Review' : pct >= 15 ? 'Warning' : 'Good Quality';
  const metricTone = {
    gray: { box: 'bg-gray-50 dark:bg-gray-800/60 border-gray-100 dark:border-gray-800', label: 'text-gray-500 dark:text-gray-400', val: 'text-gray-700 dark:text-gray-300' },
    emerald: { box: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-800/60', label: 'text-emerald-600 dark:text-emerald-400', val: 'text-emerald-700 dark:text-emerald-300' },
    rose: { box: 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-800/60', label: 'text-rose-600 dark:text-rose-400', val: 'text-rose-700 dark:text-rose-300' },
    blue: { box: 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-800/60', label: 'text-blue-600 dark:text-blue-400', val: 'text-blue-700 dark:text-blue-300' },
    amber: { box: 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-800/60', label: 'text-amber-600 dark:text-amber-400', val: 'text-amber-700 dark:text-amber-300' },
  };

  const verify = async (status) => {
    setError('');
    try {
      await api.patch(`/coordinator/companies/${c.id}/verification`, { status, rejection_reason: status === 'rejected' ? reason : null });
      load(); onChanged();
    } catch (e) { setError(apiError(e)); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 mb-2 group cursor-pointer">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to companies directory
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Company Profile & Partnership</h1>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 space-y-6 dark:text-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-emerald-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 dark:from-emerald-800 dark:via-emerald-800 dark:to-emerald-800">{(c.company_name || '?').charAt(0).toUpperCase()}</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{c.company_name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{c.industry || 'Industry sector not specified'}</p>
            </div>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full font-bold border capitalize shrink-0 ${vCls[c.verification_status] || vCls.pending}`}>● {c.verification_status} Account</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            ['Headquarters Address', [c.address, c.city].filter(Boolean).join(', ') || '—'],
            ['Website', c.website ? `${c.website} ↗` : '—'],
            ['Primary Contact Person', c.contact_person || '—'],
            ['Contact Email', c.contact_email || '—'],
            ['Contact Phone', c.contact_phone || '—'],
            ['Login Account Email', c.user?.email || '—'],
          ].map(([label, val]) => (
            <div key={label} className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
              {label === 'Website' && c.website ? (
                <a href={c.website} target="_blank" rel="noreferrer" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-1 block truncate">{c.website}</a>
              ) : <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 break-words">{val}</p>}
            </div>
          ))}
        </div>

        {c.description && (
          <div className="pt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Company Overview</p>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{c.description}</div>
          </div>
        )}
      </div>

      {c.verification_status === 'pending' && (
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
          <div>
            <h3 className="text-lg font-bold text-amber-950 dark:text-amber-200">Company Verification Required</h3>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80">Confirm that this host training establishment meets university internship standards</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <button onClick={() => verify('verified')} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 transition-all text-sm cursor-pointer dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800 dark:hover:to-teal-800">✓ Verify & Approve Company</button>
            <div className="flex-1 flex flex-col sm:flex-row gap-2.5 items-end">
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejection or unaccredited status..." className={inputCls} />
              <button onClick={() => verify('rejected')} disabled={!reason.trim()} className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors shrink-0 cursor-pointer dark:bg-rose-700">Reject</button>
            </div>
          </div>
        </div>
      )}

      {(c.internship_postings || c.internshipPostings || []).length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 dark:text-gray-100">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">▦ Internship Vacancies ({(c.internship_postings || c.internshipPostings || []).length})</h3>
          <div className="space-y-3">
            {(c.internship_postings || c.internshipPostings || []).map((posting) => (
              <div key={posting.id} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{posting.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{posting.location || 'Location TBD'} • {posting.slots} slot{posting.slots !== 1 ? 's' : ''}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border capitalize ${pCls[posting.status] || pCls.pending}`}>{posting.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.total_entries > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 dark:text-gray-100">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"> Journal Quality Analysis (ML)</h3>
          <div className={`mb-4 p-4 rounded-xl border-2 ${toneCls.banner}`}>
            <p className={`text-sm font-bold ${toneCls.text}`}>{pct >= 30 ? '⚠️' : pct >= 15 ? '⚡' : '✓'} {statusLabel}</p>
            <p className={`text-xs ${toneCls.sub} mt-0.5`}>
              {pct >= 30 ? 'High percentage of unrelated journal entries detected. Students may be performing errands rather than meaningful internship work.'
                : pct >= 15 ? 'Some unrelated activities detected. Monitor ongoing journal entries.'
                : 'Journal entries show strong alignment with curriculum. Interns are engaged in course-related tasks.'}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              ['Total Entries', stats.total_entries, 'gray'], ['Related', stats.related_entries, 'emerald'], ['Unrelated', stats.unrelated_entries, 'rose'],
              ['Classified', stats.classified_entries, 'blue'], ['Flagged', stats.flagged_entries, 'amber'], ['Unrelated %', `${pct}%`, tone],
            ].map(([label, val, color]) => (
              <div key={label} className={`p-3.5 rounded-xl border ${metricTone[color].box}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${metricTone[color].label}`}>{label}</p>
                <p className={`text-2xl font-bold mt-1 ${metricTone[color].val}`}>{val}</p>
              </div>
            ))}
          </div>
          {stats.needs_review && (
            <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60">
              <p className="text-xs font-bold text-rose-900 dark:text-rose-200">⚠️ Recommended Action</p>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">This company has been automatically flagged for partnership review due to high unrelated journal percentage (&gt;30%). Consider conducting an internship quality audit or site visit.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CompaniesPanel() {
  const [companies, setCompanies] = useState(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [error, setError] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const load = useCallback(async (p = 1) => {
    try {
      const params = { page: p };
      if (debouncedSearch) params.search = debouncedSearch;
      if (status) params.status = status;
      const res = await api.get('/coordinator/companies', { params });
      const d = res.data.data;
      setCompanies(d.data || d || []);
      setTotal(d.total ?? (d.data || d || []).length);
      setPage(d.current_page || p);
      setLastPage(d.last_page || 1);
      setError('');
    } catch (e) { setError(apiError(e)); setCompanies([]); }
  }, [debouncedSearch, status]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(1); load(1); }, [debouncedSearch, status]);

  if (detailId) return <CompanyDetail id={detailId} onBack={() => { setDetailId(null); load(); }} onChanged={load} />;
  if (!companies) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">{error || 'Loading…'}</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Employer & Partner Network</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Verify registered companies, review host training establishments, and view active partnerships</p>
        </div>
        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50 self-start sm:self-auto">{total} Total {total === 1 ? 'Company' : 'Companies'}</span>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 sm:p-5 mb-6 flex flex-wrap gap-4 items-end dark:text-gray-100">
        <div className="flex-1 min-w-[240px]">
          <label className={labelCls}>Search Employers</label>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by company name, contact, industry..." className={inputCls} />
        </div>
        <div className="w-full sm:w-56">
          <label className={labelCls}>Verification Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            <option value="">All Statuses</option>
            {['pending', 'verified', 'rejected'].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {(search || status) && <button type="button" onClick={() => { setSearch(''); setStatus(''); }} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">Reset</button>}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden dark:text-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Company Profile</th><th className="px-6 py-4">Industry</th><th className="px-6 py-4">Location</th><th className="px-6 py-4">Verification</th><th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {companies.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">No companies found</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 max-w-sm mx-auto">No employer profiles matched the search criteria.</p>
                </td></tr>
              ) : companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm dark:from-emerald-800 dark:to-emerald-800">{(company.company_name || '?').charAt(0).toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white leading-tight">{company.company_name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5 truncate">{company.contact_email}</p>
                        {company.website && <a href={company.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline mt-0.5 font-medium truncate max-w-xs"><ExternalLink className="w-3 h-3 shrink-0" /><span>{hostOf(company.website)}</span></a>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-600 dark:text-gray-300">{company.industry || '—'}</td>
                  <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">
                    <div className="space-y-0.5">
                      {company.city || company.province ? (
                        <>
                          <p className="font-semibold text-gray-900 dark:text-white">{company.city}{company.province ? `, ${company.province}` : ''}</p>
                          {company.address && company.address !== 'Philippines' && <p className="text-[11px] text-gray-400 truncate max-w-[200px] dark:text-gray-400">{company.address}</p>}
                        </>
                      ) : company.address && company.address !== 'Philippines' ? (
                        <p className="font-medium text-gray-800 dark:text-gray-200">{company.address}</p>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px] italic">Not set (Action required)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${vCls[company.verification_status] || vCls.pending}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${company.verification_status === 'verified' ? 'bg-emerald-500' : company.verification_status === 'pending' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                      {company.verification_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setDetailId(company.id)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer">View <span>→</span></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {lastPage > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer">← Prev</button>
          <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {lastPage}</span>
          <button disabled={page >= lastPage} onClick={() => load(page + 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer">Next →</button>
        </div>
      )}
    </div>
  );
}
