import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import api from '../../api/client';
import { apiError } from '../ui';

const studentOf = (r) => r.student || {};
const postingOf = (r) => r.posting || {};
const companyOf = (r) => r.company || {};
const nameOf = (s) => s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || '—';

const scoreBadge = (score) => score >= 75
  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-600/20'
  : score >= 50
    ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-600/20'
    : 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 ring-1 ring-gray-600/20';

const rankGradient = ['bg-amber-400 text-white shadow-amber-400/30', 'bg-slate-300 text-slate-800', 'bg-amber-700 text-white', 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'];

export default function MlDashboardPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/ml-dashboard').then((res) => setData(res.data.data)).catch((e) => { setError(apiError(e)); setData({ stats: {}, recommendations: [], company_performance: [] }); });
  }, []);

  if (!data) return <p className="py-12 text-center text-slate-500">{error || 'Loading…'}</p>;
  const stats = data.stats || {};
  const recs = data.recommendations || [];
  const perf = data.company_performance || [];

  const mlStats = [
    ['Unplaced Candidates', stats.unplaced_students ?? 0, 'from-amber-500 to-orange-600', 'shadow-amber-500/20'],
    ['Partner Companies', stats.partner_companies ?? 0, 'from-blue-600 to-emerald-600', 'shadow-blue-500/20'],
    ['Avg System Rating', `${stats.avg_system_rating ?? 0}/5`, 'from-emerald-600 to-teal-600', 'shadow-emerald-500/20'],
    ['Total Placements', stats.total_placements ?? 0, 'from-emerald-600 to-pink-600', 'shadow-emerald-500/20'],
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 rounded-2xl shadow-xl p-6 sm:p-8 text-white">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide uppercase mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Predictive Intelligence Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Matching & Performance Analytics</h1>
            <p className="mt-1 text-emerald-100 text-sm max-w-xl">Automated student competency scoring, internship alignment algorithms, partner ratings, and market skill gap forecasting.</p>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold self-start">Algorithm Active</span>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {mlStats.map(([label, val, gradient, shadow]) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex items-center justify-between group">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{typeof val === 'number' ? val.toLocaleString() : val}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center text-lg shadow-md ${shadow}`}>•</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Placement Recommendations */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">▦ Internship Posting Suggestions</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Suggested approved internship postings for students without an active placement.</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recs.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">No internship postings available</p>
                <p className="text-xs text-gray-400 mt-1">Matching scores appear only after an eligible partner company publishes an approved posting.</p>
              </div>
            ) : recs.map((rec, i) => (
              <div key={i} className="flex items-center justify-between py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 px-2 rounded-xl transition-colors">
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{nameOf(studentOf(rec))}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1.5">
                    <span>{studentOf(rec).course}</span><span>→</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{companyOf(rec).company_name}</span>
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{postingOf(rec).title}</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate mt-0.5 font-medium">Verified partner company</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${scoreBadge(rec.score)}`}>{rec.score}% match</span>
              </div>
            ))}
          </div>
        </div>

        {/* Company Performance */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">▦ Company Performance Ranking</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Calculated from student evaluation responses and supervisor ratings.</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {perf.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">No evaluation data available</p>
                <p className="text-xs text-gray-400 mt-1">Evaluations will aggregate here once submitted.</p>
              </div>
            ) : perf.map((company, i) => (
              <div key={company.id || i} className="flex items-center gap-3 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 px-2 rounded-xl transition-colors">
                <span className={`w-6 h-6 rounded-lg text-xs flex items-center justify-center font-bold shrink-0 shadow-sm ${rankGradient[i] || rankGradient[3]}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{company.company_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{company.intern_count} intern{company.intern_count !== 1 ? 's' : ''} evaluated</p>
                </div>
                <div className="text-right shrink-0 flex items-center gap-1.5">
                  <div className="flex text-amber-400 text-xs">
                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(company.avg_eval_rating) ? 'fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />)}
                  </div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">{Number(company.avg_eval_rating).toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
