import React, { useCallback, useEffect, useState } from 'react';
import { Award, BarChart3, TrendingUp, Target, Star, Users } from 'lucide-react';
import api from '../../api/client';
import { apiError } from '../ui';
import { EvaluationForm } from './EvaluationForm';

const studentOf = (placement) => placement?.student_profile || placement?.studentProfile || {};
const studentName = (student) => student?.full_name || `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || 'Intern';

export function StudentEvaluationForms() {
  const [placements, setPlacements] = useState([]);
  const [editingEnabled, setEditingEnabled] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => api.get('/company/evaluations', { params: { page: 1 } }).then((res) => {
    setPlacements(res.data.data?.placements || []);
  }).catch((e) => setError(apiError(e))), []);

  useEffect(() => {
    load();
    api.get('/evaluation-policy')
      .then((res) => setEditingEnabled(Boolean(res.data.data?.editing_enabled)))
      .catch(() => setEditingEnabled(false));
  }, [load]);

  const intern = studentOf(selectedPlacement);
  const evaluation = (selectedPlacement?.evaluations || []).find((ev) => (ev.evaluation_period || 'final') === 'final') || null;
  const requiredHours = Number(selectedPlacement?.required_hours) || 480;
  const renderedHours = Number(selectedPlacement?.rendered_hours) || 0;
  const readOnly = !editingEnabled || renderedHours < requiredHours;

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Student Evaluation Forms</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">View the evaluation form for each intern placed with your company. Editing and submission follow the administrator's settings and rendered-hours requirement.</p>
      </div>
      {error && <p className="px-6 pt-4 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {placements.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-400">No active or completed student placements found.</p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {placements.map((placement) => {
            const hours = Number(placement.rendered_hours) || 0;
            const target = Number(placement.required_hours) || 480;
            const hasEvaluation = (placement.evaluations || []).some((ev) => (ev.evaluation_period || 'final') === 'final');
            const editable = editingEnabled && hours >= target;
            return (
              <div key={placement.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{studentName(studentOf(placement))}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{placement.internship_posting?.title || placement.internshipPosting?.title || 'Internship'} · {hours} of {target} hours rendered</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${hasEvaluation ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'}`}>{hasEvaluation ? 'Submitted' : editable ? 'Ready to evaluate' : 'Preview only'}</span>
                  <button type="button" onClick={() => setSelectedPlacement(placement)} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950 cursor-pointer">View Evaluation Form</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPlacement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedPlacement(null)}>
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-gray-50 p-4 shadow-2xl dark:bg-gray-950 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">OJT Evaluation Form</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Student: {studentName(intern)}</p>
              </div>
              <button type="button" onClick={() => setSelectedPlacement(null)} className="rounded-lg px-3 py-1 text-2xl leading-none text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 dark:text-gray-400" aria-label="Close evaluation form">&times;</button>
            </div>
            <EvaluationForm placementId={selectedPlacement.id} initialEvaluation={evaluation} readOnly={readOnly} onCancel={() => setSelectedPlacement(null)} onSaved={async () => { setSelectedPlacement(null); await load(); }} />
          </div>
        </div>
      )}
    </section>
  );
}

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
    api.get('/company/evaluation-summary')
      .then((res) => {
        setSummary(res.data.data);
      })
      .catch((e) => {
        setError(apiError(e));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">Loading summary…</p>;

  if (!summary || summary.total_evaluations === 0) {
    return null;
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
          Intern Evaluation Summary
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Aggregate performance statistics across {summary.total_evaluations} evaluation{summary.total_evaluations > 1 ? 's' : ''} for {summary.total_interns_evaluated} intern{summary.total_interns_evaluated > 1 ? 's' : ''}
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {/* Overall Performance Card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl dark:from-blue-800 dark:to-indigo-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-3">
              <Star className="w-3.5 h-3.5" />
              Average Intern Performance
            </div>
            <h3 className="text-4xl sm:text-5xl font-black mb-2">{avgRating.toFixed(2)} / 5.0</h3>
            <p className="text-blue-100 text-sm">{summary.grade_description || 'Performance Rating'}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-4 border-white/30">
              <Award className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm dark:text-gray-100">
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

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm dark:text-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Interns Evaluated
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white">{summary.total_interns_evaluated}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm dark:text-gray-100">
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

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm dark:text-gray-100">
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
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-sm dark:text-gray-100">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
          Intern Performance by Criteria (Average Scores)
        </h3>
        <div className="space-y-4">
          {CRITERIA.map(([field, label]) => {
            const avg = Number(criteriaAverages[field] || 0);
            const percentage = (avg / 5) * 100;
            const barColor = avg >= 4 ? 'bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-800 dark:to-teal-800' : avg >= 3 ? 'bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-800 dark:to-indigo-800' : 'bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-800 dark:to-orange-800';
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
        {/* Top Performing Areas */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-sm dark:text-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Performing Areas</h3>
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

        {/* Areas Needing Attention */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-sm dark:text-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Areas Needing Attention</h3>
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
