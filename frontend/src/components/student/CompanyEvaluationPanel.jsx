import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import api from '../../api/client';
import { Field, Notice, apiError } from '../ui';

const CRITERIA = [
  ['work_environment', 'Workplace Environment & Culture', 'Physical/virtual setup, safety, culture, and day-to-day comfort.'],
  ['mentorship_quality', 'Mentorship & Leadership Guidance', 'Supervisor responsiveness, onboarding, feedback, and technical support.'],
  ['learning_opportunities', 'Learning & Skill Development', 'Relevance of assigned work to academic courses and practical career growth.'],
  ['facilities', 'Tools, Resources & Infrastructure', 'Access to necessary hardware, dev tools, software licenses, and materials.'],
  ['overall_experience', 'Overall Internship Satisfaction', 'General impression and fulfillment of your overall internship experience.'],
];

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
const placementOf = (p) => p.internship_posting || p.internshipPosting || {};
const companyOf = (p) => placementOf(p).company_profile?.company_name || placementOf(p).companyProfile?.company_name || placementOf(p).company?.name || 'Company';

export default function CompanyEvaluationPanel() {
  const [placements, setPlacements] = useState(null);
  const [ratingFor, setRatingFor] = useState(null);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editingEnabled, setEditingEnabled] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/student/placements');
      setPlacements(res.data.data || []);
    } catch (e) { setError(apiError(e)); setPlacements([]); }
    try {
      const policy = await api.get('/evaluation-policy');
      setEditingEnabled(Boolean(policy.data.data?.editing_enabled));
    } catch { setEditingEnabled(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!placements) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">Loading…</p>;

  const openRating = (p) => {
    const existing = p.company_rating || p.companyRating;
    setForm({
      work_environment: existing?.work_environment ?? 3,
      mentorship_quality: existing?.mentorship_quality ?? 3,
      learning_opportunities: existing?.learning_opportunities ?? 3,
      facilities: existing?.facilities ?? 3,
      overall_experience: existing?.overall_experience ?? 3,
      feedback: existing?.feedback || '',
      would_recommend: existing?.would_recommend ?? true,
    });
    setRatingFor(p);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!editingEnabled) return;
    setError('');
    try {
      await api.post(`/student/placements/${ratingFor.id}/company-rating`, form);
      setMessage('Company evaluation submitted.');
      setRatingFor(null);
      await load();
    } catch (err) { setError(apiError(err)); }
  };

  const ratingHoursComplete = ratingFor
    ? Number(ratingFor.rendered_hours || 0) >= Number(ratingFor.required_hours || 480)
    : false;
  const ratingCanEdit = Boolean(editingEnabled && ratingHoursComplete);

  const ratable = placements.filter((p) => ['active', 'completed'].includes(p.status));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Rate Internship Companies</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Share constructive feedback regarding mentorship quality, work environment, and learning opportunities.</p>
      </div>
      <Notice message={message} error={error} />

      {ratable.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm dark:text-gray-100">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No Placements Available to Evaluate</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">Company feedback evaluations are unlocked once you are placed with a host company.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ratable.map((p) => {
            const posting = placementOf(p);
            const rating = p.company_rating || p.companyRating;
            const company = companyOf(p);
            const requiredHours = Number(p.required_hours) || 480;
            const renderedHours = Number(p.rendered_hours) || 0;
            const hoursComplete = renderedHours >= requiredHours;
            const canEdit = editingEnabled && hoursComplete;
            return (
              <div key={p.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-all grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-5 dark:text-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex items-center justify-center text-xl font-extrabold shadow-lg shadow-emerald-600/30 shrink-0 dark:from-emerald-800 dark:to-emerald-800">
                    {(company || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{company}</h3>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{posting.title}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                      <span>{fmt(p.start_date)} – {fmt(p.end_date)}</span>
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0 pt-3 sm:pt-0 border-t sm:border-0 border-gray-100 dark:border-gray-800">
                  {rating ? (
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-500 text-lg dark:text-amber-400">★</span>
                        <span className="text-xl font-black text-gray-900 dark:text-white">{Number(rating.average_rating || 0).toFixed(1)}</span>
                        <span className="text-xs text-gray-400 font-normal dark:text-gray-400">/ 5.0</span>
                      </div>
                      <button onClick={() => openRating(p)} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">{canEdit ? 'Edit Rating' : 'View Evaluation'}</button>
                    </div>
                  ) : (
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold uppercase tracking-wider">Pending Rating</span>
                      <button onClick={() => openRating(p)} className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800">{canEdit ? 'Rate Company' : 'View Evaluation'} <ArrowRight className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
                {(!hoursComplete || !editingEnabled) && (
                  <p className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                    {!editingEnabled ? 'Evaluation editing is currently disabled by the administrator. You can view the form and any submitted responses.' : <>Complete your required rendered hours before you can submit or update a company evaluation. Progress: <strong>{renderedHours} of {requiredHours} hours.</strong></>}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Rating modal */}
      {ratingFor && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setRatingFor(null)}>
          <form onSubmit={submit} className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto dark:text-gray-100" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 sm:p-8 space-y-6">
              <div className="pb-6 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Rate {companyOf(ratingFor)}</h2>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{placementOf(ratingFor).title} • Started {new Date(ratingFor.start_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ratingCanEdit ? 'Score each dimension from 1.0 (Needs Improvement) to 5.0 (Exceptional).' : 'Read-only preview. Ratings become editable when the administrator enables evaluation editing and your required hours are complete.'}</p>
              </div>

              <div className="space-y-6">
                {CRITERIA.map(([field, label, desc]) => (
                  <div key={field} className="p-4 sm:p-5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-bold text-gray-800 dark:text-gray-200">{label}</label>
                      {(ratingCanEdit || ratingFor.company_rating || ratingFor.companyRating) && <span className="inline-flex items-center px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 font-black text-sm text-emerald-600 dark:text-emerald-400">{Number(form[field]).toFixed(1)} / 5</span>}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{desc}</p>
                    {ratingCanEdit ? <input type="range" min="1" max="5" step="0.5" value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-600" /> : <p className="text-sm text-gray-500 dark:text-gray-400">{ratingFor.company_rating || ratingFor.companyRating ? `${Number(form[field]).toFixed(1)} / 5` : 'Not rated yet'}</p>}
                    <div className="flex justify-between text-[11px] text-gray-400 font-medium mt-1.5 px-0.5 dark:text-gray-400">
                      <span>1.0 — Poor</span><span>3.0 — Average</span><span>5.0 — Excellent</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                <Field label="Detailed Student Feedback"><textarea rows={4} readOnly={!ratingCanEdit} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} placeholder="Highlight key highlights, strengths of your supervisor, or suggested enhancements for prospective interns..." className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent leading-relaxed dark:text-gray-100 dark:placeholder:text-gray-400" /></Field>
                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input type="checkbox" disabled={!ratingCanEdit} checked={!!form.would_recommend} onChange={(e) => setForm({ ...form, would_recommend: e.target.checked })} className="rounded-md border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500 w-5 h-5 dark:text-emerald-400" />
                    <div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white block">Recommend Company to Future Students</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Endorse this host organization as an exemplary internship partner.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                {ratingCanEdit && <button type="submit" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 text-sm cursor-pointer dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800 dark:hover:to-emerald-800">{(ratingFor.company_rating || ratingFor.companyRating) ? 'Update Evaluation' : 'Submit Evaluation'}</button>}
                <button type="button" onClick={() => setRatingFor(null)} className="border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold px-6 py-2.5 rounded-xl text-sm cursor-pointer">Cancel</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
