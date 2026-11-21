import React, { useMemo, useState } from 'react';
import api from '../../api/client';
import { apiError } from '../ui';

const CRITERIA = [
  ['comprehension', 'Comprehension', 'Ability to take vital and instant decisions in the work as shown by the correct application of theory and new information.'],
  ['work_habits', 'Work Habits and Attitude', 'Ability to analyze the job to be done, plan the processes necessary to carry it out, and complete the task laid out.'],
  ['work_quality', 'Quality of Work', 'Measure in terms of accuracy, final appearance of the output, and the effectiveness with which necessary tools and equipment are used.'],
  ['work_quantity', 'Quantity of Work', 'Finish the volume of work required/assigned under normal condition and meet the quantity standard set for the job.'],
  ['cooperation', 'Cooperation', 'Demonstrate willingness to work with and for others. Work smoothly with others and observe company policies.'],
  ['attendance_punctuality', 'Attendance and Punctuality', 'Report/attend to work/task regularly. Consider frequency of absences as well as lateness.'],
  ['judgment', 'Judgment', 'Show flexibility in dealing with specific situations; demonstrate sense of accountability for actions and decisions made.'],
  ['attitude', 'Attitude', 'Exhibit maturity in dealing with criticisms; demonstrate sense of accountability for actions and decisions made.'],
  ['safety', 'Safety', 'Carry out instructions correctly and observe awareness in using the right tools/instruments/attire in the performance of tasks.'],
  ['honesty_dependability', 'Honesty and Dependability', 'Honesty and integrity beyond reproach. Can be depended on to carry tasks with less supervision.'],
  ['leadership', 'Leadership', 'Demonstrate consistency in assuming responsibilities and show ability to influence others.'],
  ['personal_characteristics', 'Personal Characteristics', 'Always looks clean and neat, handles work in order of priority, observes good housekeeping, honest in all dealings.'],
];

const RECOMMENDATIONS = [
  ['highly_recommended', 'Highly Recommended'],
  ['recommended', 'Recommended'],
  ['needs_improvement', 'Needs Improvement'],
  ['not_recommended', 'Not Recommended'],
];

function toEquivalent(total) {
  if (total >= 60) return 100;
  if (total === 59) return 99;
  if (total >= 57) return 98;
  if (total >= 55) return 97;
  if (total >= 53) return 96;
  if (total >= 51) return 95;
  if (total >= 49) return 94;
  if (total >= 47) return 93;
  if (total >= 45) return 92;
  if (total >= 43) return 91;
  if (total >= 41) return 90;
  if (total >= 39) return 89;
  if (total >= 37) return 88;
  if (total >= 35) return 87;
  if (total >= 33) return 86;
  if (total >= 31) return 85;
  if (total >= 29) return 84;
  if (total >= 27) return 83;
  if (total >= 25) return 82;
  if (total >= 23) return 81;
  if (total >= 21) return 80;
  if (total >= 19) return 79;
  if (total >= 17) return 78;
  if (total >= 15) return 77;
  if (total >= 13) return 76;
  return 75;
}

const gradeLabel = (eq) => eq >= 96 ? 'Excellent' : eq >= 90 ? 'Very Satisfactory' : eq >= 84 ? 'Satisfactory' : eq >= 78 ? 'Needs Improvement' : 'Poor';

const cardCls = 'bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 shadow-sm space-y-6 dark:text-gray-100';
const h2Cls = 'text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2';
const subCls = 'text-xs text-gray-500 dark:text-gray-400 mt-1';
const inputCls = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5';

export function EvaluationForm({ placementId, onSaved, onCancel, readOnly = false, initialEvaluation = null }) {
  const [scores, setScores] = useState(Object.fromEntries(CRITERIA.map(([k]) => [k, initialEvaluation?.[k] ?? 3])));
  const [form, setForm] = useState({
    strengths: initialEvaluation?.strengths || '', areas_for_improvement: initialEvaluation?.areas_for_improvement || '', general_comments: initialEvaluation?.general_comments || '',
    recommendation: initialEvaluation?.recommendation || '', rated_by_name: initialEvaluation?.rated_by_name || '', inclusive_training_period: initialEvaluation?.inclusive_training_period || '', agency_address: initialEvaluation?.agency_address || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const total = useMemo(() => CRITERIA.reduce((s, [k]) => s + Number(scores[k] || 0), 0), [scores]);
  const eq = toEquivalent(total);
  const grade = gradeLabel(eq);

  const submit = async (e) => {
    e.preventDefault();
    if (readOnly) return;
    setSaving(true); setError('');
    try {
      await api.post(`/company/interns/${placementId}/evaluations`, { ...scores, ...form });
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {readOnly && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">Read-only evaluation preview. The administrator has not enabled editing, or the intern has not completed the required hours.</div>}
      {error && <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl p-4 text-sm text-rose-700 dark:text-rose-300">{error}</div>}

      {/* Scale legend */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl px-5 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
        <span>5 — Excellent</span><span>4 — Very Satisfactory</span><span>3 — Satisfactory</span><span>2 — Needs Improvement</span><span>1 — Poor</span>
      </div>

      {/* Criteria */}
      <div className={cardCls}>
        <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
          <h2 className={h2Cls}>▦ Performance Criteria</h2>
          <p className={subCls}>12 official criteria — each rated 1 to 5. Maximum total: 60 points.</p>
        </div>
        <div className="space-y-4">
          {CRITERIA.map(([field, label, desc], i) => (
            <div key={field} className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80">
              <div className="flex items-start justify-between mb-1 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{i + 1}. {label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5 leading-snug">{desc}</p>
                </div>
                {(!readOnly || initialEvaluation) && <span className="shrink-0 text-sm font-extrabold w-10 text-center px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">{scores[field]}</span>}
              </div>
              {(!readOnly || initialEvaluation) && <input type="range" disabled={readOnly} min="1" max="5" step="1" value={scores[field]} onChange={(e) => setScores({ ...scores, [field]: Number(e.target.value) })} className="w-full accent-emerald-600 cursor-pointer h-2 rounded-lg mt-2 bg-gray-200 dark:bg-gray-700 disabled:cursor-not-allowed" />}
              <div className="flex justify-between text-[10px] font-medium text-gray-400 dark:text-gray-400 mt-1">
                <span>1 — Poor</span><span>2 — Needs Improvement</span><span>3 — Satisfactory</span><span>4 — Very Satisfactory</span><span>5 — Excellent</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score summary */}
      {(!readOnly || initialEvaluation) && <div className={cardCls}>
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">▦ Score Summary</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl py-4 px-2 border border-gray-100 dark:border-gray-800">
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{total}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">Total Points<br /><span className="font-normal">(max 60)</span></p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl py-4 px-2 border border-gray-100 dark:border-gray-800">
            <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{eq}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">Equivalent Rating<br /><span className="font-normal">(75–100 scale)</span></p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl py-4 px-2 border border-gray-100 dark:border-gray-800">
            <p className="text-lg font-extrabold text-purple-600 dark:text-purple-400">{grade}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">Grade Description</p>
          </div>
        </div>
      </div>}

      {/* Rating sheet details */}
      <div className={cardCls}>
        <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
          <h2 className={h2Cls}>▦ Rating Sheet Details</h2>
          <p className={subCls}>Details printed on the official OJT Performance Rating Sheet</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Rated By (Supervisor Name)</label>
            <input readOnly={readOnly} value={form.rated_by_name} onChange={(e) => setForm({ ...form, rated_by_name: e.target.value })} placeholder="Supervisor's full name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Inclusive Training Period</label>
            <input readOnly={readOnly} value={form.inclusive_training_period} onChange={(e) => setForm({ ...form, inclusive_training_period: e.target.value })} placeholder="e.g. June 1 – August 31, 2025" className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Address of the Agency / Company</label>
          <input readOnly={readOnly} value={form.agency_address} onChange={(e) => setForm({ ...form, agency_address: e.target.value })} placeholder="Complete address of the host training establishment" className={inputCls} />
        </div>
      </div>

      {/* Remarks & recommendation */}
      <div className={cardCls}>
        <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
          <h2 className={h2Cls}>▦ Remarks & Recommendation</h2>
        </div>
        <div>
          <label className={labelCls}>Key Strengths</label>
          <textarea readOnly={readOnly} rows={3} value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} placeholder="Highlight where the intern excelled..." className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Areas for Improvement</label>
          <textarea readOnly={readOnly} rows={3} value={form.areas_for_improvement} onChange={(e) => setForm({ ...form, areas_for_improvement: e.target.value })} placeholder="Constructive advice on skills or habits to develop..." className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>General Comments</label>
          <textarea readOnly={readOnly} rows={3} value={form.general_comments} onChange={(e) => setForm({ ...form, general_comments: e.target.value })} placeholder="Overall summary of the student's internship performance..." className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Overall Recommendation</label>
          <select disabled={readOnly} value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} className={inputCls}>
            <option value="">Select recommendation</option>
            {RECOMMENDATIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
        {onCancel && <button type="button" onClick={onCancel} className="w-full sm:w-auto text-center px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">Cancel</button>}
        {!readOnly && <button type="submit" disabled={saving} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-7 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:-translate-y-0.5 text-sm cursor-pointer disabled:opacity-60 dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800 dark:hover:to-emerald-800">
          <span>✓</span> {saving ? 'Submitting…' : initialEvaluation ? 'Update OJT Completion Evaluation' : 'Submit OJT Completion Evaluation'}
        </button>}
      </div>
    </form>
  );
}
