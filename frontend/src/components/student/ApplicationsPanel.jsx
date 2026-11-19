import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft, Search, XCircle, Building2, Briefcase, CalendarDays, Mail, MapPin, Phone, Globe, X } from 'lucide-react';
import api from '../../api/client';
import { Badge, Card, EmptyState, Notice, Pager, apiError } from '../ui';

const statusStyles = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
  shortlisted: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300',
  interview: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
  accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
  rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300',
  withdrawn: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function ApplicationsPanel({ onNavigate, hasAcceptedApplication, placement: initialPlacement }) {
  const [items, setItems] = useState(null);
  const [placement, setPlacement] = useState(initialPlacement || null);
  const [companyDetailsOpen, setCompanyDetailsOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [notice, setNotice] = useState(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = () => api.get('/applications', { params: { page } })
    .then((res) => {
      const meta = pageMeta(res.data.data);
      setItems(meta.items);
      setLastPage(meta.lastPage);
      setTotal(meta.total);
    })
    .catch(() => setItems([]));

  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let mounted = true;
    api.get('/placements', { params: { per_page: 10 } })
      .then((res) => {
        const records = pageMeta(res.data.data).items;
        const current = records.find((record) => ['active', 'on_hold'].includes(record.status));
        if (mounted && current) setPlacement(current);
      })
      .catch(() => {})
      .finally(() => { mounted = false; });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (initialPlacement && !placement) setPlacement(initialPlacement);
  }, [initialPlacement, placement]);

  const openDetail = async (app) => {
    try {
      const res = await api.get(`/applications/${app.id}`);
      setDetail(res.data.data);
    } catch { setDetail(app); }
  };

  const withdraw = async (app) => {
    if (!window.confirm('Are you sure you want to withdraw this application?')) return;
    try {
      await api.patch(`/applications/${app.id}/withdraw`);
      setNotice({ message: 'Application withdrawn.' });
      load();
      if (detail?.id === app.id) setDetail(null);
    } catch (err) {
      setNotice({ error: apiError(err) });
    }
  };

  if (!items) return <p className="py-12 text-center text-slate-500">Loading…</p>;

  const posting = detail?.internship_posting;
  const company = posting?.company_profile;
  const placementPosting = placement?.internship_posting || placement?.internshipPosting;
  const placementCompanyProfile = placementPosting?.company_profile || placementPosting?.companyProfile;
  const placementCompany = placementCompanyProfile?.company_name || placementCompanyProfile?.name;

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Internship Applications</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Track your application progress and company responses.</p>
        </div>
        {!hasAcceptedApplication && (
          <button onClick={() => onNavigate?.('opportunities')} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 cursor-pointer shrink-0">
            <span>Browse Internships</span>
          </button>
        )}
      </div>

      {placement && (
        <section className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900" aria-label="Current placement">
          <div className="h-1 bg-emerald-600" />
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Current placement</p>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold capitalize text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">{(placement.status || 'active').replace('_', ' ')}</span>
                </div>
                {placementCompany ? (
                  <button type="button" onClick={() => setCompanyDetailsOpen(true)} className="inline-flex max-w-full items-center gap-1 text-left text-base font-bold text-gray-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">
                    <span className="truncate">{placementCompany}</span><span aria-hidden="true" className="text-emerald-600">›</span>
                  </button>
                ) : (
                  <h3 className="truncate text-base font-bold text-gray-900 dark:text-white">Company information unavailable</h3>
                )}
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                  <Briefcase className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="truncate">{placementPosting?.title || 'Internship position'}</span>
                </p>
              </div>
            </div>
            {(placement.start_date || placement.end_date) && (
              <p className="inline-flex shrink-0 items-center gap-1.5 pl-[58px] text-xs text-gray-500 dark:text-gray-400 sm:pl-0">
                <CalendarDays className="h-3.5 w-3.5" />
                {fmt(placement.start_date)} – {fmt(placement.end_date)}
              </p>
            )}
          </div>
        </section>
      )}

      <Notice message={notice?.message} error={notice?.error} />

      {items.length === 0 && !placement ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{placement ? 'Placement Confirmed' : 'No Applications Submitted'}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">{placement ? 'Your assigned company and internship are shown above.' : "You haven't submitted any internship applications yet. Explore openings matched with your skills."}</p>
          {!hasAcceptedApplication && (
            <button onClick={() => onNavigate?.('opportunities')} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 cursor-pointer">
              <span>Find Placement Opportunities</span><ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : items.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/50">
                  {['Position & Company', 'Status', 'Date Applied', ''].map((h, i) => (
                    <th key={i} className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${i === 3 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/80">
                {items.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-gray-800 dark:to-gray-700 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-sm font-bold shrink-0 border border-emerald-200/40 dark:border-gray-700">
                          {(app.internship_posting?.company_profile?.company_name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <button onClick={() => openDetail(app)} className="font-bold text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 text-sm truncate block text-left cursor-pointer">
                            {app.internship_posting?.title}
                          </button>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{app.internship_posting?.company_profile?.company_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusStyles[app.status] || statusStyles.pending}`}>{app.status}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-medium">{fmt(app.applied_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2.5">
                        <button onClick={() => openDetail(app)} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer">Details →</button>
                        {['pending', 'shortlisted'].includes(app.status) && (
                          <button onClick={() => withdraw(app)} className="inline-flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"><XCircle className="w-3.5 h-3.5" />Withdraw</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-emerald-600/30 shrink-0">
                    {(company?.company_name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">{posting?.title}</h2>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{company?.company_name}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${statusStyles[detail.status] || statusStyles.pending}`}>{detail.status}</span>
              </div>

              {detail.rejection_reason && (
                <div className="p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60">
                  <h3 className="font-bold text-sm text-rose-800 dark:text-rose-300 mb-2">Feedback from Company</h3>
                  <p className="text-sm text-rose-700 dark:text-rose-300 leading-relaxed">{detail.rejection_reason}</p>
                </div>
              )}

              {detail.cover_letter && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2"><span className="w-1.5 h-4 rounded-full bg-emerald-600" />Cover Letter Submitted</h3>
                  <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                    <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line leading-relaxed">{detail.cover_letter}</p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400 dark:text-gray-500">
                <span>Submitted on {detail.applied_at ? new Date(detail.applied_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}</span>
                <button onClick={() => setDetail(null)} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-semibold cursor-pointer">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {companyDetailsOpen && placementCompanyProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={() => setCompanyDetailsOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="placement-company-title" className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-gray-50/80 p-6 dark:border-gray-800 dark:bg-gray-800/40">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"><Building2 className="h-6 w-6" /></div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Placement company</p>
                  <h2 id="placement-company-title" className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{placementCompany}</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{placementCompanyProfile.industry || 'Industry not provided'}</p>
                </div>
              </div>
              <button type="button" aria-label="Close company details" onClick={() => setCompanyDetailsOpen(false)} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-6 p-6">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Your internship</p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-white">{placementPosting?.title || 'Internship position'}</p>
                <p className="mt-1 text-sm capitalize text-gray-600 dark:text-gray-300">{(placement.status || 'active').replace('_', ' ')} · {fmt(placement.start_date)} – {fmt(placement.end_date)}</p>
              </div>
              {placementCompanyProfile.description && <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{placementCompanyProfile.description}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                {(placementCompanyProfile.contact_person || placementCompanyProfile.contactPerson) && <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contact person</p><p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{placementCompanyProfile.contact_person || placementCompanyProfile.contactPerson}</p></div>}
                {(placementCompanyProfile.contact_email || placementCompanyProfile.contactEmail) && <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><Mail className="h-3.5 w-3.5" />Email</p><p className="mt-1 break-all text-sm text-gray-900 dark:text-white">{placementCompanyProfile.contact_email || placementCompanyProfile.contactEmail}</p></div>}
                {(placementCompanyProfile.contact_phone || placementCompanyProfile.contactPhone) && <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><Phone className="h-3.5 w-3.5" />Phone</p><p className="mt-1 text-sm text-gray-900 dark:text-white">{placementCompanyProfile.contact_phone || placementCompanyProfile.contactPhone}</p></div>}
                {(placementCompanyProfile.location || placementCompanyProfile.address) && <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><MapPin className="h-3.5 w-3.5" />Address</p><p className="mt-1 text-sm text-gray-900 dark:text-white">{placementCompanyProfile.location || [placementCompanyProfile.address, placementCompanyProfile.city, placementCompanyProfile.province].filter(Boolean).join(', ')}</p></div>}
                {(placementCompanyProfile.website) && <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><Globe className="h-3.5 w-3.5" />Website</p><p className="mt-1 break-all text-sm text-gray-900 dark:text-white">{placementCompanyProfile.website}</p></div>}
              </div>
              <div className="flex justify-end border-t border-gray-100 pt-4 dark:border-gray-800"><button type="button" onClick={() => setCompanyDetailsOpen(false)} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800">Close</button></div>
            </div>
          </section>
        </div>
      )}
      {items.length > 0 && <Pager page={page} lastPage={lastPage} total={total} onChange={setPage} noun="applications" className="mt-4" />}
    </div>
  );
}
