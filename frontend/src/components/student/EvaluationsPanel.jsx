import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { EmptyState, apiError } from '../ui';

const CRITERIA = [
  ['comprehension', 'Comprehension'],
  ['work_habits', 'Work Habits and Attitude'],
  ['work_quality', 'Quality of Work'],
  ['work_quantity', 'Quantity of Work'],
  ['cooperation', 'Cooperation'],
  ['attendance_punctuality', 'Attendance and Punctuality'],
  ['judgment', 'Judgment'],
  ['attitude', 'Attitude'],
  ['safety', 'Safety'],
  ['honesty_dependability', 'Honesty and Dependability'],
  ['leadership', 'Leadership'],
  ['personal_characteristics', 'Personal Characteristics'],
];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

export default function EvaluationsPanel() {
  const [evaluations, setEvaluations] = useState(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
    api.get('/student/evaluations', { params: { page: 1, ...(debouncedSearch ? { search: debouncedSearch } : {}) } })
      .then((res) => {
        const d = res.data.data;
        setEvaluations(d.data || d || []);
        setPage(d.current_page || 1);
        setLastPage(d.last_page || 1);
      })
      .catch((e) => { setError(apiError(e)); setEvaluations([]); });
  }, [debouncedSearch]);

  if (!evaluations) return <p className="py-12 text-center text-slate-500">Loading…</p>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Supervisor Evaluations</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Formal performance appraisals, competency ratings, and feedback submitted by your company mentor.</p>
      </div>

      <div className="mb-4">
        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by company name..." className="w-full sm:max-w-sm px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
      </div>

      {evaluations.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No Evaluations on Record Yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">Your OJT completion evaluation will appear here once submitted by your designated company supervisor.</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {evaluations.map((ev) => {
            const placement = ev.internship_placement || ev.internshipPlacement;
            const posting = placement?.internship_posting || placement?.internshipPosting;
            const company = posting?.company_profile?.company_name || posting?.companyProfile?.company_name || posting?.company?.name;
            const rating = Number(ev.overall_rating || 0);
            return (
              <div key={ev.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-sm hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                      OJT {(ev.evaluation_period || 'final').replace('_', ' ')} Review
                    </div>
                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">{company || posting?.title || 'Internship Evaluation'}</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Evaluated on {fmtDate(ev.submitted_at || ev.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-center p-3 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-blue-50/50 dark:from-gray-800 dark:to-gray-800/60 border border-emerald-100/60 dark:border-gray-700">
                    <div className="text-right">
                      <p className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">{rating || '—'}</p>
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Out of 5.0</p>
                    </div>
                    <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
                    <div>
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-gray-900 shadow-sm text-emerald-700 dark:text-emerald-300">{ev.grade_description || ''}</span>
                    </div>
                  </div>
                </div>

                <div className="py-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">Competency Criteria Breakdown</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {CRITERIA.map(([field, label]) => {
                      const score = Number(ev[field] || 0);
                      const bar = score >= 4 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : score >= 3 ? 'bg-gradient-to-r from-emerald-500 to-blue-500' : 'bg-gradient-to-r from-amber-500 to-orange-500';
                      const text = score >= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500';
                      return (
                        <div key={field} className="p-3 rounded-xl bg-gray-50/60 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80">
                          <div className="flex justify-between items-center text-xs mb-1.5">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{label}</span>
                            <span className={`font-black ${text}`}>{score || '—'} / 5.0</span>
                          </div>
                          <div className="h-2 bg-gray-200/70 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${(score / 5) * 100}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3.5 pt-2">
                  {ev.strengths && (
                    <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block mb-1.5">Key Strengths</span>
                      <p className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed">{ev.strengths}</p>
                    </div>
                  )}
                  {ev.areas_for_improvement && (
                    <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block mb-1.5">Areas for Improvement</span>
                      <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed">{ev.areas_for_improvement}</p>
                    </div>
                  )}
                  {ev.general_comments && (
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 block mb-1.5">General Comments</span>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{ev.general_comments}</p>
                    </div>
                  )}
                </div>

                {ev.recommendation && (
                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Supervisor Recommendation:</span>
                    <span className="font-bold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 capitalize">{String(ev.recommendation).replace(/_/g, ' ')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lastPage > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">← Prev</button>
          <span className="text-sm text-gray-500 dark:text-gray-400 px-3">Page {page} of {lastPage}</span>
          <button disabled={page >= lastPage} onClick={() => setPage(page + 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">Next →</button>
        </div>
      )}
    </div>
  );
}
