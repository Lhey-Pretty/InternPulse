import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { apiError } from '../ui';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const studentOf = (e) => e.student_profile || e.studentProfile || {};
const nameOf = (e) => studentOf(e).full_name || `${studentOf(e).first_name || ''} ${studentOf(e).last_name || ''}`.trim() || '—';

const recCls = {
  highly_recommended: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  recommended: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  needs_improvement: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  not_recommended: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
};

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

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Renders the official OJT Performance Rating Sheet in a new window and
// opens the print dialog. Kept in the SPA so the app never needs a Blade page.
const printEvaluation = (ev) => {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) {
    alert('Please allow pop-ups for this site to print the evaluation form.');
    return;
  }

  const scores = CRITERIA.map(([key]) => Number(ev[key]) || 0);
  const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const rows = CRITERIA.map(([key, label], i) =>
    `<tr><td class="num">${i + 1}</td><td>${esc(label)}</td><td class="score">${esc(ev[key] ?? '—')}</td></tr>`
  ).join('');
  const comments = [
    ['Strengths', ev.strengths],
    ['Areas for Improvement', ev.areas_for_improvement],
    ['General Comments', ev.general_comments],
  ].filter(([, v]) => v).map(([label, v]) => `<h3>${label}</h3><p>${esc(v)}</p>`).join('');

  win.document.write(`<!doctype html>
<html><head><meta charset="utf-8" /><title>OJT Evaluation - ${esc(nameOf(ev))}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Georgia,'Times New Roman',serif;color:#111;margin:32px;font-size:13px}
  .head{text-align:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:18px}
  .head h1{margin:0;font-size:17px;letter-spacing:.5px}
  .head h2{margin:4px 0 0;font-size:13px;font-weight:normal;text-transform:uppercase;letter-spacing:1px}
  .meta{display:flex;flex-wrap:wrap;gap:6px 28px;margin-bottom:16px}
  .meta p{margin:0}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #333;padding:6px 8px;text-align:left}
  th{background:#eee;font-size:12px;text-transform:uppercase;letter-spacing:.4px}
  td.num,td.score{text-align:center;width:60px}
  .summary{display:flex;gap:24px;margin-top:14px;justify-content:flex-end;font-weight:bold}
  h3{margin:16px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
  p{margin:0 0 8px;line-height:1.5}
  .sign{margin-top:44px;display:flex;justify-content:space-between;gap:60px}
  .sign div{flex:1;border-top:1px solid #111;padding-top:4px;text-align:center;font-size:12px}
  @page{size:A4;margin:16mm}
</style></head>
<body>
  <div class="head">
    <h1>Mindoro State University</h1>
    <h2>On-the-Job Training Performance Rating Sheet</h2>
  </div>
  <div class="meta">
    <p><strong>Student:</strong> ${esc(nameOf(ev))}</p>
    ${ev.agency_address ? `<p><strong>Agency:</strong> ${esc(ev.agency_address)}</p>` : ''}
    ${ev.inclusive_training_period ? `<p><strong>Training Period:</strong> ${esc(ev.inclusive_training_period)}</p>` : ''}
    <p><strong>Evaluation:</strong> ${esc(ev.evaluation_period || 'final')}</p>
  </div>
  <table>
    <thead><tr><th class="num">No.</th><th>Criteria</th><th class="score">Rating (1-5)</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="summary">
    <span>Average: ${average.toFixed(2)}</span>
    <span>Equivalent Rating: ${esc(ev.equivalent_rating ?? '—')}</span>
    ${ev.grade_description ? `<span>Descriptive Rating: ${esc(ev.grade_description)}</span>` : ''}
  </div>
  ${comments}
  ${ev.recommendation ? `<h3>Recommendation</h3><p>${esc(String(ev.recommendation).replace(/_/g, ' '))}</p>` : ''}
  <div class="sign">
    <div>${esc(ev.rated_by_name || 'Rating Supervisor')}</div>
    <div>Student Trainee</div>
  </div>
</body></html>`);

  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
};

export default function EvaluationsPanel() {
  const [evaluations, setEvaluations] = useState(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [error, setError] = useState('');
  const [selectedEval, setSelectedEval] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
    api.get('/company/evaluations', { params: { page: 1, ...(debouncedSearch ? { search: debouncedSearch } : {}) } })
      .then((res) => {
        const d = res.data.data;
        setEvaluations(d.data || d || []);
        setPage(d.current_page || 1);
        setLastPage(d.last_page || 1);
      })
      .catch((e) => { setError(apiError(e)); setEvaluations([]); });
  }, [debouncedSearch]);

  if (!evaluations) return <p className="py-12 text-center text-slate-500">{error || 'Loading…'}</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Intern Evaluations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">OJT completion evaluations submitted by your mentors</p>
        </div>
        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50 self-start sm:self-auto">
          {evaluations?.length || 0} Total Evaluation{evaluations?.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="mb-4">
        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by student name..." className="w-full sm:max-w-sm px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Intern Name</th>
                <th className="px-6 py-4">Evaluation</th>
                <th className="px-6 py-4">Rating (Equiv. / Points)</th>
                <th className="px-6 py-4">Recommendation</th>
                <th className="px-6 py-4 text-right">Submitted Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {evaluations.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">No evaluations found</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-sm mx-auto">Submitted OJT completion evaluations will appear here.</p>
                </td></tr>
              ) : evaluations.map((ev) => {
                const eq = ev.equivalent_rating;
                const rating = eq != null ? Number(eq) : Number(ev.overall_rating || 0);
                const rec = ev.recommendation || '';
                return (
                  <tr key={ev.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors cursor-pointer" onClick={() => setSelectedEval(ev)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                          {(studentOf(ev).first_name || nameOf(ev) || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">{nameOf(ev)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 capitalize">OJT Completion</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {eq != null ? (
                          <>
                            <span className={`text-sm font-extrabold ${rating >= 90 ? 'text-emerald-600 dark:text-emerald-400' : rating >= 80 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-500'}`}>{rating}</span>
                            <span className="text-xs text-gray-400">/ 100</span>
                            <span className="text-xs text-gray-400 ml-1">({ev.total_points}/60 pts)</span>
                          </>
                        ) : (
                          <>
                            <span className={`text-sm font-extrabold ${rating >= 4 ? 'text-emerald-600 dark:text-emerald-400' : rating >= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>{rating.toFixed(1)}</span>
                            <span className="text-xs text-gray-400">/ 5.0</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${recCls[rec] || 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {rec ? rec.replace(/_/g, ' ') : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-gray-500 dark:text-gray-400">{fmt(ev.submitted_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {/* Evaluation Detail Modal */}
      {selectedEval && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedEval(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 border-b border-emerald-700">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">OJT Performance Evaluation</h2>
                  <p className="text-emerald-100 text-sm mt-1">Student: {nameOf(selectedEval)}</p>
                </div>
                <button onClick={() => setSelectedEval(null)} className="text-white/80 hover:text-white text-2xl leading-none">&times;</button>
              </div>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Points</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedEval.total_points || 0}<span className="text-sm text-gray-400 ml-1">/ 60</span></p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Equivalent Rating</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{selectedEval.equivalent_rating || 0}<span className="text-sm text-gray-400 ml-1">/ 100</span></p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Overall Rating</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedEval.overall_rating || 0}<span className="text-sm text-gray-400 ml-1">/ 5.0</span></p>
                </div>
              </div>

              {/* Criteria Scores */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Performance Criteria</h3>
                <div className="space-y-3">
                  {CRITERIA.map(([key, label], idx) => {
                    const score = selectedEval[key] || 0;
                    const pct = (score / 5) * 100;
                    return (
                      <div key={key} className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-2 rounded-full transition-all ${score >= 4 ? 'bg-emerald-500' : score >= 3 ? 'bg-blue-500' : score >= 2 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white w-8 text-right">{score}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comments */}
              {(selectedEval.strengths || selectedEval.areas_for_improvement || selectedEval.general_comments) && (
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Comments & Feedback</h3>
                  
                  {selectedEval.strengths && (
                    <div>
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Strengths</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900/50">{selectedEval.strengths}</p>
                    </div>
                  )}

                  {selectedEval.areas_for_improvement && (
                    <div>
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">Areas for Improvement</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-100 dark:border-amber-900/50">{selectedEval.areas_for_improvement}</p>
                    </div>
                  )}

                  {selectedEval.general_comments && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">General Comments</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">{selectedEval.general_comments}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Recommendation */}
              {selectedEval.recommendation && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Recommendation</p>
                  <span className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold border capitalize ${recCls[selectedEval.recommendation] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                    {selectedEval.recommendation.replace(/_/g, ' ')}
                  </span>
                </div>
              )}

              {/* Footer Info */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                {selectedEval.rated_by_name && <p><span className="font-semibold">Rated by:</span> {selectedEval.rated_by_name}</p>}
                {selectedEval.inclusive_training_period && <p><span className="font-semibold">Training Period:</span> {selectedEval.inclusive_training_period}</p>}
                {selectedEval.agency_address && <p><span className="font-semibold">Agency:</span> {selectedEval.agency_address}</p>}
                <p><span className="font-semibold">Submitted:</span> {fmt(selectedEval.submitted_at)}</p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800/80 backdrop-blur-sm px-8 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => printEvaluation(selectedEval)}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                <span></span> Print Evaluation Form
              </button>
              <button onClick={() => setSelectedEval(null)} className="px-6 py-2 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                Close
              </button>
            </div>
          </div>
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
