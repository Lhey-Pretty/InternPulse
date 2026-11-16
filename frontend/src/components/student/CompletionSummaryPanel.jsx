import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import api from '../../api/client';
import { apiError } from '../ui';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
const placementOf = (s) => s.placement?.internship_posting || s.placement?.internshipPosting || {};

export default function CompletionSummaryPanel({ onNavigate }) {
  const [summaries, setSummaries] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/student/completion-summary')
      .then((res) => setSummaries(res.data.data || []))
      .catch((e) => { setError(apiError(e)); setSummaries([]); });
  }, []);

  if (!summaries) return <p className="py-12 text-center text-slate-500">Loading…</p>;

  const statusCls = {
    active: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
    completed: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
    terminated: 'bg-rose-500/20 text-rose-200 border-rose-400/30',
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Internship Completion Summary</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Comprehensive audit of rendered OJT hours, supervisor appraisals, submitted logs, and graduation clearance.</p>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {summaries.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No Internship Records Found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">Your cumulative completion metrics will be calculated once an internship placement is started.</p>
        </div>
      ) : (
        <div className="w-full space-y-6">
          {summaries.map((s, i) => {
            const pl = s.placement;
            const posting = placementOf(s);
            const company = posting.company_profile?.company_name || posting.companyProfile?.company_name || posting.company?.name || 'Company';
            const stClass = statusCls[pl.status] || 'bg-white/20 text-white border-white/20';
            const completionPct = Math.min(100, Math.max(0, Number(s.completion_pct) || 0));
            return (
              <div key={pl.id || i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="bg-gradient-to-r from-[#064e26] via-[#0b6333] to-[#043319] p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-emerald-200 text-xs font-semibold mb-1 flex items-center gap-1.5">
                      <span>{fmt(pl.start_date)} – {fmt(pl.end_date)}</span>
                    </p>
                    <h3 className="text-xl font-extrabold text-white leading-tight">{posting.title || 'Internship'}</h3>
                    <p className="text-emerald-200 text-sm mt-0.5 font-medium">{company}</p>
                  </div>
                  <span className={`inline-flex self-start sm:self-center text-xs px-3.5 py-1.5 rounded-full font-bold uppercase tracking-wider border backdrop-blur-md ${stClass}`}>{pl.status}</span>
                </div>

                <div className="p-5 sm:p-7 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-center">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">OJT Hours</p>
                      <p className="text-lg font-black text-blue-950 dark:text-blue-200">{s.rendered_hours} / {s.required_hours}h</p>
                      <p className="text-xs text-blue-500 font-semibold mt-0.5">{s.completion_pct}% complete</p>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-center">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Attendance</p>
                      <p className="text-lg font-black text-emerald-950 dark:text-emerald-200">{s.present_days} / {s.attendance_days}</p>
                      <p className="text-xs text-emerald-500 font-semibold mt-0.5">days present</p>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-center">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Tasks Done</p>
                      <p className="text-lg font-black text-emerald-950 dark:text-emerald-200">{s.completed_tasks} / {s.total_tasks}</p>
                      <p className="text-xs text-emerald-500 font-semibold mt-0.5">completed</p>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-center">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Weekly Logs</p>
                      <p className="text-lg font-black text-amber-950 dark:text-amber-200">{s.weekly_logs}</p>
                      <p className="text-xs text-amber-500 font-semibold mt-0.5">submitted</p>
                    </div>
                  </div>

                  <section aria-label="OJT hours progress" className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/30 px-5 py-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100">OJT hours progress</p>
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{s.rendered_hours} of {s.required_hours} hours <span className="ml-1 text-gray-500">({completionPct}%)</span></p>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" role="progressbar" aria-valuenow={completionPct} aria-valuemin="0" aria-valuemax="100" aria-label={`${completionPct}% of required OJT hours completed`}>
                      <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500" style={{ width: `${completionPct}%` }} />
                    </div>
                  </section>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">OJT Completion Evaluation</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.final_rating ? 'Submitted by supervisor' : 'Pending submission'}</p>
                      </div>
                      {s.final_rating ? (
                        <div className="text-right">
                          <span className={`text-2xl font-black ${s.final_rating >= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>{s.final_rating}</span>
                          <span className="text-xs text-gray-400">/ 5.0</span>
                        </div>
                      ) : (
                        <span className="text-xl font-bold text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </div>
                  </div>

                  {s.recommendation && (
                    <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-3">
                      <span className="text-xl">✓</span>
                      <p className="text-sm text-emerald-900 dark:text-emerald-200">
                        <span className="font-bold">Supervisor Endorsement:</span>{' '}
                        <span className="font-semibold capitalize">{String(s.recommendation).replace(/_/g, ' ')}</span>
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold ${s.completion_pct >= 100 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        <span>{s.completion_pct >= 100 ? '✓' : '○'}</span> Hours Target
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold ${s.final_rating ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        <span>{s.final_rating ? '✓' : '○'}</span> OJT Evaluation
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold ${s.company_rated ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'}`}>
                        <span>{s.company_rated ? '✓' : '!'}</span> Company Feedback
                      </span>
                    </div>
                    {!s.company_rated && pl.status === 'completed' && onNavigate && (
                      <button onClick={() => onNavigate('company')} className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer">
                        Rate Company Now <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
