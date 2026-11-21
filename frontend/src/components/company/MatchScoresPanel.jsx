import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { apiError } from '../ui';

const studentOf = (a) => a.student_profile || a.studentProfile || {};
const postingOf = (a) => a.internship_posting || a.internshipPosting || {};
const nameOf = (a) => studentOf(a).full_name || `${studentOf(a).first_name || ''} ${studentOf(a).last_name || ''}`.trim() || '—';
const initialOf = (a) => (studentOf(a).first_name || nameOf(a) || '?').charAt(0).toUpperCase();

const appStatusCls = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  shortlisted: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  interview: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
};

export default function MatchScoresPanel({ onReview }) {
  const [apps, setApps] = useState(null);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/company/match-scores', { params: { page, per_page: 10 } })
      .then((res) => {
        const result = res.data.data;
        setApps(result?.data?.data || result?.data || []);
        setPageInfo({
          currentPage: result?.data?.current_page || page,
          lastPage: result?.data?.last_page || 1,
          total: result?.total ?? result?.data?.total ?? 0,
        });
      })
      .catch((e) => { setError(apiError(e)); setApps([]); });
  }, [page]);

  if (!apps) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">{error || 'Loading…'}</p>;
  const total = pageInfo?.total ?? apps.length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Candidate Match Scores</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Skill and course alignment scores across all active applicants for your positions</p>
        </div>
        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50 self-start sm:self-auto">{total} Scored Candidate{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Algorithm insight */}
      <div className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#064e26] via-[#0b6333] to-[#043319] text-white p-6 shadow-lg shadow-emerald-950/15">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-200 border border-white/10">Smart Matching Engine</span>
            <h3 className="text-lg font-bold text-white">How match scores are calculated</h3>
            <p className="text-xs text-emerald-200/90 max-w-2xl leading-relaxed">Scores combine <strong>70% skill alignment</strong> (matching student declared competencies with posting requirements) and <strong>30% academic curriculum fit</strong> (degree course compatibility).</p>
          </div>
          <div className="shrink-0 flex items-center gap-2 text-xs font-semibold text-white/90">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">≥75% Excellent</span>
            <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300">50-74% Moderate</span>
          </div>
        </div>
      </div>

      {apps.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-12 text-center dark:text-gray-100">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No applicants to evaluate</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">When candidates submit applications for your internship postings, their match scores will be analyzed here.</p>
          {onReview && <button onClick={() => onReview('postings')} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800 dark:hover:to-emerald-800">View Your Postings</button>}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden dark:text-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Applicant</th><th className="px-6 py-4">Applied Position</th><th className="px-6 py-4">Overall Match</th><th className="px-6 py-4">Skills Matched</th><th className="px-6 py-4">Course Fit</th><th className="px-6 py-4">Application Status</th><th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {apps.map((app) => {
                  const score = app.computed_score ?? app.match_score ?? app.matchScore ?? 0;
                  const matched = app.matched_count ?? (app.match_details?.matched_skills?.length ?? 0);
                  const totalReq = app.total_required ?? (postingOf(app).required_skills?.length ?? 0);
                  const courseFit = app.course_match ?? app.courseMatch;
                  return (
                    <tr key={app.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm dark:from-emerald-800 dark:to-emerald-800">{initialOf(app)}</div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white leading-tight">{nameOf(app)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{studentOf(app).course}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="font-medium text-gray-800 dark:text-gray-200 text-xs block truncate max-w-xs">{postingOf(app).title}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-16 bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                            <div className={`h-2.5 rounded-full ${score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-gray-400'}`} style={{ width: `${score}%` }}></div>
                          </div>
                          <span className={`font-extrabold text-sm ${score >= 75 ? 'text-emerald-600 dark:text-emerald-400' : score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>{score}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{matched}</span>
                          <span className="text-gray-400 dark:text-gray-400">/</span>
                          <span>{totalReq} skills</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {courseFit ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60">Aligned</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">Alternative</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${appStatusCls[app.status] || appStatusCls.pending}`}>{app.status}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {onReview ? (
                          <button onClick={() => onReview('applicants', app)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer">
                            Review Candidate <span>→</span>
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pageInfo && pageInfo.lastPage > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800 px-5 py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {pageInfo.currentPage} of {pageInfo.lastPage} · {total} candidates
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={pageInfo.currentPage <= 1}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >Previous</button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(pageInfo.lastPage, current + 1))}
                  disabled={pageInfo.currentPage >= pageInfo.lastPage}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >Next</button>
              </div>
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
