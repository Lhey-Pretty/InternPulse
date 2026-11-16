import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Briefcase, Building2, Calendar, ChevronRight, Clock,
  MapPin, Monitor, Search, Sparkles, Users, Wallet,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { apiError, useDebounced } from '../components/ui';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const inputCls = 'w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5';

function Header() {
  const { user } = useAuth();
  return (
    <header className="border-b border-gray-100 dark:border-gray-800/50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-5 h-16 flex items-center justify-between gap-2 sm:gap-4">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/images/minsu-logo.png" alt="MinSU Seal" className="w-8 h-8 object-contain" />
          <span className="whitespace-nowrap text-sm font-bold tracking-tight text-gray-900 dark:text-white sm:text-base"><span className="hidden sm:inline">MinSU </span>InternPulse</span>
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to={`/${user.role}/dashboard`} className="text-sm font-semibold bg-[#009688] hover:bg-[#00897b] text-white px-5 py-2 rounded-xl transition-all">Open Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="whitespace-nowrap rounded-xl px-2.5 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white sm:px-4">Log in</Link>
              <Link to="/register" className="whitespace-nowrap rounded-xl bg-[#009688] px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-[#00897b] sm:px-5">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function PostingCard({ posting }) {
  const a = posting.attributes || {};
  const company = posting.company || {};
  return (
    <Link
      to={`/internships/${posting.id}`}
      className="group flex min-w-0 flex-col rounded-2xl border border-gray-100 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-800 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md shadow-emerald-500/20">
            {(company.name || a.company || 'C').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 break-words font-bold leading-snug text-gray-900 transition-colors group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">{a.title}</p>
            <p className="mt-0.5 line-clamp-2 break-words text-sm text-gray-600 dark:text-gray-400">{company.name || 'MinSU partner company'}</p>
          </div>
        </div>
        {a.isPaid && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Wallet className="w-3 h-3" /> Paid
          </span>
        )}
      </div>

      <p className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{a.description}</p>

      <div className="mb-4 grid min-w-0 grid-cols-1 gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-gray-400 sm:grid-cols-2">
        <span className="flex min-w-0 items-start gap-2 break-words"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{a.location || 'Location not specified'}</span>
        <span className="flex min-w-0 items-start gap-2 break-words"><Monitor className="mt-0.5 h-4 w-4 shrink-0" />{a.workSetup || 'On-site'}</span>
        <span className="flex min-w-0 items-start gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0" />{a.slots} slot{a.slots > 1 ? 's' : ''}</span>
        <span className="inline-flex items-center gap-1 text-sm"><Clock className="w-3.5 h-3.5" />{a.requiredHours ? `${a.requiredHours} hrs` : 'Hours not specified'}</span>
      </div>

      {(a.requiredSkills || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(a.requiredSkills || []).slice(0, 4).map((s, i) => (
            <span key={i} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">{s}</span>
          ))}
          {(a.requiredSkills || []).length > 4 && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">+{a.requiredSkills.length - 4} more</span>
          )}
        </div>
      )}

      <div className="flex flex-col items-start justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800 sm:flex-row sm:items-center">
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400"><Calendar className="h-4 w-4 shrink-0" />{a.applicationDeadline ? `Deadline: ${fmtDate(a.applicationDeadline)}` : 'Deadline not specified'}</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:gap-2 transition-all">
          View Details <ChevronRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  );
}

export function InternshipsList() {
  const [postings, setPostings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [error, setError] = useState('');

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page: p };
      if (q.trim()) params.title = `*${q.trim()}*`;
      const res = await api.get('/internships', { params });
      setPostings(res.data.data || []);
      setLastPage(Number(res.data.meta?.last_page || 1));
      setPage(p);
    } catch {
      setError('Unable to load internship postings. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <Header />
      <main className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-5 sm:py-12">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 px-4 py-1.5 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Mindoro State University · Bongabong Campus
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">Find Internship</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400 sm:text-base">Browse approved internship postings from MinSU partner companies. Log in to apply.</p>
        </div>

        <div className="flex gap-3 mb-8 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <label className="sr-only" htmlFor="internship-search">Search internships by title</label>
            <input id="internship-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, e.g. Web Developer…" className={`${inputCls} pl-11`} />
          </div>
        </div>

        {error ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-8 text-center dark:border-rose-900 dark:bg-gray-900">
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{error}</p>
            <button type="button" onClick={() => load(1)} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Try again</button>
          </div>
        ) : loading || !postings ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{[...Array(6)].map((_, i) => <div key={i} className="h-64 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-pulse" />)}</div>
        ) : postings.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-14">
            <Briefcase className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No internship postings found</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Check back later or try a different search.</p>
            {search && <button type="button" onClick={() => setSearch('')} className="mt-4 min-h-11 text-sm font-semibold text-emerald-700 underline dark:text-emerald-400">Clear search</button>}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {postings.map((p) => <PostingCard key={p.id} posting={p} />)}
            </div>
            {lastPage > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 disabled:opacity-40 cursor-pointer">Previous</button>
                <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {lastPage}</span>
                <button disabled={page >= lastPage} onClick={() => load(page + 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 disabled:opacity-40 cursor-pointer">Next</button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export function InternshipDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [posting, setPosting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPosting = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/internships/${id}`);
      setPosting(res.data.data);
    } catch (requestError) {
      setError(apiError(requestError, 'Unable to load this internship posting.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadPosting(); }, [loadPosting]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
        <Header />
        <div className="max-w-3xl mx-auto px-5 py-20 text-center">
          <p role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">{error}</p>
          <button type="button" onClick={loadPosting} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Try again</button>
          <Link to="/internships" className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" /> Back to listings</Link>
        </div>
      </div>
    );
  }

  if (loading || !posting) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
        <Header />
        <div className="max-w-3xl mx-auto px-5 py-20"><div className="h-96 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-pulse" /></div>
      </div>
    );
  }

  const a = posting.attributes || {};
  const company = posting.company || {};
  const applyTo = !user ? '/login' : user.role === 'student' ? '/student/dashboard?tab=opportunities' : `/${user.role}/dashboard`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      <Header />
      <main className="mx-auto min-w-0 max-w-3xl px-4 py-8 sm:px-5 sm:py-10">
        <Link to="/internships" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 mb-6"><ArrowLeft className="w-4 h-4" /> Back to Find Internship</Link>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-700 to-teal-700 px-6 sm:px-8 py-6">
            <p className="text-emerald-100 text-xs font-medium mb-1">{company.name || 'MinSU partner company'}{company.industry ? ` · ${company.industry}` : ''}</p>
            <h1 className="break-words text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{a.title}</h1>
            <p className="text-emerald-100 text-sm mt-1">{a.position || a.title}</p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
              {[
                { icon: <MapPin className="w-4 h-4" />, label: 'Location', value: a.location || '—' },
                { icon: <Monitor className="w-4 h-4" />, label: 'Work Setup', value: a.workSetup || 'On-site' },
                { icon: <Users className="w-4 h-4" />, label: 'Slots', value: `${a.slots || 0} slot${a.slots > 1 ? 's' : ''}` },
                { icon: <Clock className="w-4 h-4" />, label: 'Required Hours', value: a.requiredHours ? `${a.requiredHours} hrs` : 'Not specified' },
              ].map((f, i) => (
                <div key={i} className="min-w-0 rounded-xl border border-gray-100 bg-gray-50 p-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">{f.icon}<span>{f.label}</span></p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{f.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {a.isPaid && <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"><Wallet className="w-3.5 h-3.5" /> Paid Internship{a.allowance ? ` · ₱${Number(a.allowance).toLocaleString()}/mo` : ''}</span>}
              {a.requiredCourse && <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">{a.requiredCourse}</span>}
              {a.requiredYearLevel && <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{a.requiredYearLevel}</span>}
              {a.applicationDeadline && <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"><Calendar className="h-4 w-4" />Apply by {fmtDate(a.applicationDeadline)}</span>}
            </div>

            {a.description && (
              <div>
                <h2 className={labelCls}>Job Description</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{a.description}</p>
              </div>
            )}
            {a.responsibilities && (
              <div>
                <h2 className={labelCls}>Key Responsibilities</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{a.responsibilities}</p>
              </div>
            )}
            {a.qualifications && (
              <div>
                <h2 className={labelCls}>Qualifications & Preferred Background</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{a.qualifications}</p>
              </div>
            )}
            {(a.requiredSkills || []).length > 0 && (
              <div>
                <h2 className={labelCls}>Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {a.requiredSkills.map((s, i) => <span key={i} className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">{s}</span>)}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Building2 className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Posted by {company.name || 'MinSU partner company'} · MinSU Bongabong Campus OJT Program</p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-gradient-to-r from-emerald-700 to-teal-700 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-white">Interested in this role?</h3>
            <p className="text-emerald-100 text-sm mt-1">{user ? (user.role === 'student' ? 'Head to Opportunities to review the match score and apply.' : 'Head to your dashboard for more details.') : 'Log in or create an account to submit your application.'}</p>
          </div>
          <Link to={applyTo} className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-6 py-3 rounded-xl text-sm hover:bg-emerald-50 transition-all shadow-lg shrink-0">
            {user ? (user.role === 'student' ? 'View in Opportunities' : 'Go to Dashboard') : 'Log in to Apply'} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
