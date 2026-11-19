import React, { useEffect, useState } from 'react';
import { Award, BarChart3, TrendingUp, Target, Star } from 'lucide-react';
import api from '../../api/client';
import { apiError } from '../ui';

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

export default function EvaluationSummaryPanel() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/student/evaluation-summary')
      .then((res) => {
        setSummary(res.data.data);
      })
      .catch((e) => {
        setError(apiError(e));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-12 text-center text-slate-500">Loading summary…</p>;

  if (!summary || summary.total_evaluations === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Evaluation Data Yet</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Your performance summary will appear here once your supervisor completes your OJT evaluation.
        </p>
      </div>
    );
  }

  const avgRating = summary.average_overall_rating || 0;
  const criteriaAverages = summary.criteria_averages || {};
  
  // Sort criteria by average score to find strengths and weaknesses
  const sortedCriteria = CRITERIA.map(([field, label]) => ({
    field,
    label,
    avg: Number(criteriaAverages[field] || 0)
  })).filter(c => c.avg > 0).sort((a, b) => b.avg - a.avg);

  const strengths = sortedCriteria.slice(0, 3);
  const weaknesses = sortedCriteria.slice(-3).reverse();

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Performance Evaluation Summary
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Aggregate statistics and performance insights across {summary.total_evaluations} evaluation{summary.total_evaluations > 1 ? 's' : ''}
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {/* Overall Performance Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-3">
              <Star className="w-3.5 h-3.5" />
              Overall Performance
            </div>
            <h3 className="text-4xl sm:text-5xl font-black mb-2">{avgRating.toFixed(2)} / 5.0</h3>
            <p className="text-emerald-100 text-sm">{summary.grade_description || 'Performance Rating'}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-4 border-white/30">
              <Award className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Total Evaluations
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{summary.total_evaluations}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Average Equiv. Rating
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">
            {(summary.average_equivalent_rating || 0).toFixed(0)}%
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Highest Rating
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">
            {(summary.highest_overall_rating || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Criteria Performance */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
          Performance by Criteria (Average Scores)
        </h3>
        <div className="space-y-4">
          {CRITERIA.map(([field, label]) => {
            const avg = Number(criteriaAverages[field] || 0);
            const percentage = (avg / 5) * 100;
            const barColor = avg >= 4 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : avg >= 3 ? 'bg-gradient-to-r from-blue-500 to-emerald-500' : 'bg-gradient-to-r from-amber-500 to-orange-500';
            return (
              <div key={field}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white">
                    {avg.toFixed(2)} / 5.0
                  </span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Strengths */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Strengths</h3>
          </div>
          <div className="space-y-3">
            {strengths.map((criterion, idx) => (
              <div 
                key={criterion.field} 
                className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {criterion.label}
                  </span>
                </div>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {criterion.avg.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Areas for Growth */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Areas for Growth</h3>
          </div>
          <div className="space-y-3">
            {weaknesses.map((criterion, idx) => (
              <div 
                key={criterion.field} 
                className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-600 dark:bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {criterion.label}
                  </span>
                </div>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                  {criterion.avg.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
