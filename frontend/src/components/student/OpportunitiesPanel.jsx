import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import api from '../../api/client';
import { Field, Notice, apiError, pageMeta, Pager } from '../ui';

const attrs = (p) => p.attributes || p;

export default function OpportunitiesPanel() {
  const [postings, setPostings] = useState(null);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('');
  const [workSetup, setWorkSetup] = useState('');
  const [detail, setDetail] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get('/internships', { params: { page } }).catch(() => ({ data: { data: [] } })),
      api.get('/applications').catch(() => ({ data: { data: { data: [] } } })),
    ]).then(([p, a]) => {
      const meta = pageMeta(p.data.data);
      setPostings(meta.items);
      setLastPage(meta.lastPage);
      setTotal(meta.total);
      const apps = pageMeta(a.data.data).items;
      setAppliedIds(new Set(apps.map((x) => x.internship_posting_id || x.internship_posting?.id).filter(Boolean)));
    });
  }, [page]);

  const filtered = useMemo(() => {
    if (!postings) return [];
    const q = search.toLowerCase();
    return postings.filter((p) => {
      const a = attrs(p);
      const company = p.company?.name || a.company_name || '';
      if (q && !`${a.title || ''} ${company} ${a.location || ''}`.toLowerCase().includes(q)) return false;
      if (course && !(a.required_course || '').toLowerCase().includes(course.toLowerCase())) return false;
      if (workSetup && (a.work_setup || a.workSetup || '') !== workSetup) return false;
      return true;
    });
  }, [postings, search, course, workSetup]);

  const apply = async (posting) => {
    setError(''); setMessage('');
    try {
      await api.post('/applications', { internship_posting_id: posting.id, cover_letter: coverLetter || null });
      setMessage('Application submitted successfully.');
      setAppliedIds((prev) => new Set([...prev, posting.id]));
      setDetail(null);
      setCoverLetter('');
    } catch (err) { setError(apiError(err)); }
  };

  if (!postings) return <p className="py-12 text-center text-slate-500">Loading…</p>;

  const d = detail ? attrs(detail) : null;
  const dCompany = detail?.company?.name || d?.company_name || '';
  const dApplied = detail && appliedIds.has(detail.id);

  return (
    <div>
      {/* Filters */}
      <form onSubmit={(e) => e.preventDefault()} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 sm:p-6 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by job title, company, or location..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
          </div>
          <div className="w-full md:w-36">
            <input type="text" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Course (BSIT)" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
          </div>
          <div className="w-full md:w-36">
            <select value={workSetup} onChange={(e) => setWorkSetup(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
              <option value="">All Setups</option>
              <option value="on-site">On-site</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(search || course || workSetup) && <button type="button" onClick={() => { setSearch(''); setCourse(''); setWorkSetup(''); }} className="border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium px-4 py-2.5 rounded-xl text-sm cursor-pointer">Reset</button>}
          </div>
        </div>
      </form>

      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Showing <span className="text-gray-900 dark:text-white font-extrabold">{filtered.length}</span> available internship{filtered.length !== 1 ? 's' : ''}
      </p>

      <Notice message={message} error={error} />

      {filtered.length === 0 ? (
        <div className="col-span-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No Matching Internships Found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-5">Try adjusting your search criteria, keyword query, or removing filter restrictions.</p>
          <button onClick={() => { setSearch(''); setCourse(''); setWorkSetup(''); }} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">Clear all filters →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((posting) => {
            const a = attrs(posting);
            const company = posting.company?.name || a.company_name || 'MinSU Partner Company';
            const applied = appliedIds.has(posting.id);
            const skills = a.required_skills || a.skills || [];
            return (
              <div key={posting.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div>
                  <div className="flex items-start gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-gray-800 dark:to-gray-700 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-base font-extrabold shrink-0 border border-emerald-200/40 dark:border-gray-700 shadow-sm">
                      {(company || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight truncate">
                        <button onClick={() => { setDetail(posting); setCoverLetter(''); }} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left cursor-pointer">{a.title}</button>
                      </h3>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate mt-0.5">{company}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {a.location && <span className="text-[11px] font-medium px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg">{a.location}</span>}
                    {(a.work_setup || a.workSetup) && <span className="text-[11px] font-medium px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg capitalize">{a.work_setup || a.workSetup}</span>}
                    {a.is_paid !== false && a.isPaid !== false && <span className="text-[11px] font-semibold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg">Paid Allowance</span>}
                    {a.required_course && <span className="text-[11px] font-medium px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg">{a.required_course}</span>}
                  </div>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {skills.slice(0, 4).map((s, i) => <span key={i} className="text-[11px] px-2 py-0.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-md">{s}</span>)}
                      {skills.length > 4 && <span className="text-[11px] px-1.5 py-0.5 text-gray-400 font-semibold">+{skills.length - 4} more</span>}
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2.5">
                  <button onClick={() => { setDetail(posting); setCoverLetter(''); }} className="flex-1 text-center text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer">Details</button>
                  {applied ? (
                    <div className="flex-1 text-center text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 py-2.5 rounded-xl">Applied</div>
                  ) : (
                    <button onClick={() => { setDetail(posting); setCoverLetter(''); }} className="flex-1 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer">Apply Now</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pager page={page} lastPage={lastPage} total={total} onChange={setPage} noun="internships" className="mt-2" />

      {/* Detail modal */}
      {detail && d && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-8 space-y-6">
              <button onClick={() => setDetail(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer"><ArrowLeft className="w-4 h-4" />Back to Internships</button>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-emerald-600/30 shrink-0">{(dCompany || 'C').charAt(0).toUpperCase()}</div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">{d.title}</h1>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{dCompany}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {d.location && <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl">{d.location}</span>}
                {(d.work_setup || d.workSetup) && <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl capitalize">{d.work_setup || d.workSetup}</span>}
                {d.is_paid !== false && d.isPaid !== false && <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl">₱{d.allowance || 0}/mo allowance</span>}
                {d.required_hours && <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-xl">{d.required_hours}h required</span>}
                {d.slots && <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl">{d.slots} slot{d.slots > 1 ? 's' : ''} open</span>}
              </div>

              {d.application_deadline && (
                <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300 font-medium">
                  <span>Application Deadline: <strong>{new Date(d.application_deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></span>
                </div>
              )}

              <div className="space-y-6 pt-2">
                {d.description && <div><h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Role Overview</h3><div className="p-5 rounded-2xl bg-gray-50/60 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800"><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{d.description}</p></div></div>}
                {d.responsibilities && <div><h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Responsibilities & Key Tasks</h3><div className="p-5 rounded-2xl bg-gray-50/60 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800"><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{d.responsibilities}</p></div></div>}
                {d.qualifications && <div><h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Qualifications & Prerequisites</h3><div className="p-5 rounded-2xl bg-gray-50/60 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800"><p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{d.qualifications}</p></div></div>}
                {(d.required_skills || []).length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Required & Desired Skills</h3>
                    <div className="flex flex-wrap gap-2">{d.required_skills.map((s, i) => <span key={i} className="text-xs font-semibold px-3 py-1.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl">{s}</span>)}</div>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                {dApplied ? (
                  <div className="p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-300 font-bold shrink-0">✓</span>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">You have applied for this position</p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5 capitalize">Track it in My Applications</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Apply for this Internship</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Attach an optional cover letter highlighting why you are an ideal fit.</p>
                    <div className="space-y-4">
                      <Field label="Cover Letter"><textarea rows={4} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} placeholder="Introduce yourself, your academic background, and relevant project experience..." className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent leading-relaxed" /></Field>
                      <button onClick={() => apply(detail)} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 text-sm cursor-pointer">Submit Application</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
