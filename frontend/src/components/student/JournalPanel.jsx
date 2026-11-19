import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, Check, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { Badge, btnGhost, btnPrimary, Card, EmptyState, Field, inputCls, Notice, apiError, pageMeta, Pager } from '../ui';

const MOODS = {
  excellent: { label: 'Great' },
  good: { label: 'Good' },
  neutral: { label: 'Okay' },
  difficult: { label: 'Tough' },
  challenging: { label: 'Hard' },
};

const moodBadge = {
  excellent: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
  good: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  difficult: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
  challenging: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '';
const fmtShort = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
const emptyForm = { entry_date: new Date().toISOString().slice(0, 10), title: '', content: '', reflection: '', mood: 'good' };

export default function JournalPanel() {
  const [data, setData] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [activities, setActivities] = useState(['']);
  const [activitiesEditable, setActivitiesEditable] = useState(true);
  const [viewing, setViewing] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/student/journals', { params: { page } });
      setData(res.data.data);
    } catch (e) {
      setError(apiError(e));
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  if (!data) return <p className="py-12 text-center text-slate-500">Loading…</p>;

  const placement = data.placement;
  const pagedEntries = pageMeta(data.entries);
  const entries = pagedEntries.items;
  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = entries.filter(e => e.entry_date?.slice(0, 10) === today);

  if (!placement) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Active Placement</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">Your daily journals will be tracked here once your internship assignment begins.</p>
      </div>
    );
  }

  const hasStarted = new Date(placement.start_date) <= new Date(new Date().toDateString());
  const companyName = placement.company_name || placement.internship_posting?.company_profile?.company_name || 'Partner Company';

  const openCreate = () => { setEditing(null); setForm(emptyForm); setActivities(['']); setActivitiesEditable(true); setShowForm(true); setError(''); setMessage(''); };
  const openEdit = (entry) => {
    setEditing(entry);
    setForm({ entry_date: entry.entry_date?.slice(0, 10), title: entry.title, content: entry.content, reflection: entry.reflection || '', mood: entry.mood || 'neutral' });
    setActivities((entry.content || '').split(/\r?\n/).filter((line) => line.trim()).length ? (entry.content || '').split(/\r?\n/).filter((line) => line.trim()) : ['']);
    setActivitiesEditable(false);
    setShowForm(true); setError(''); setMessage('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const content = activities.map((activity) => activity.trim()).filter(Boolean).join('\n');
    if (!content) {
      setError('Add at least one activity before saving.');
      return;
    }
    const payload = { ...form, content };
    try {
      if (editing) {
        await api.patch(`/student/journals/${editing.id}`, payload);
        setMessage('Journal entry updated.');
      } else {
        await api.post('/student/journals', payload);
        setMessage('Journal entry saved.');
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  };

  return (
    <div>
      {/* Header banner */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2.5 h-2.5 rounded-full ${hasStarted ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{companyName}</h2>
            {!hasStarted && <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Starts {fmtShort(placement.start_date)}</span>}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Training Period: {fmtShort(placement.start_date)} – {fmtShort(placement.end_date)}</p>
        </div>
        <div>
          {!hasStarted ? (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 text-xs font-semibold cursor-not-allowed shadow-sm">
              <Lock className="w-4 h-4" /><span>Starts {fmtShort(placement.start_date)} (Disabled)</span>
            </div>
          ) : (
            <button onClick={openCreate} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer">
              <Plus className="w-4 h-4" /><span>{todayEntries.length > 0 ? 'Add Another Line' : "Write Today's Entry"}</span>
            </button>
          )}
        </div>
      </div>

      <Notice message={message} error={error} />

      {entries.length === 0 ? (
        !hasStarted ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
              <CalendarDays className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">OJT Training Period Not Yet Started</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-5 leading-relaxed">
              Your placement is confirmed at <strong className="text-gray-800 dark:text-gray-200">{companyName}</strong>. Your approved training period begins on <span className="font-bold text-emerald-700 dark:text-emerald-400">{fmtDate(placement.start_date)}</span>. Daily journal writing will unlock automatically once your training begins.
            </p>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-xs font-semibold cursor-not-allowed">
              <Lock className="w-4 h-4" /><span>Journal Writing Disabled Until {fmtShort(placement.start_date)}</span>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No Journal Entries Yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">Keep an active record of your daily tasks, achievements, and lessons learned during internship.</p>
            <button onClick={openCreate} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 cursor-pointer">
              <span>Create First Entry</span><ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const mood = entry.mood || 'neutral';
            const isToday = entry.entry_date?.slice(0, 10) === new Date().toISOString().slice(0, 10);
            const canEdit = entry.entry_date?.slice(0, 10) === new Date().toISOString().slice(0, 10);
            return (
              <div key={entry.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-900 transition-all">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0 border border-emerald-100 dark:border-emerald-900/60 shadow-sm"><BookOpen className="w-5 h-5" /></div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{entry.title}</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" /><span>{fmtDate(entry.entry_date)}</span>
                        {isToday && <Badge tone="green">Today</Badge>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {entry.mood && <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${moodBadge[mood] || moodBadge.neutral}`}>{mood}</span>}
                    {canEdit && <button onClick={() => openEdit(entry)} className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors cursor-pointer" title="Edit"><Pencil className="w-4 h-4" /></button>}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">{entry.content}</p>
                {entry.supervisor_remarks && (
                  <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-lg px-3 py-2">
                    <strong>Supervisor:</strong> {entry.supervisor_remarks}
                  </p>
                )}
                <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Recorded {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ''}</span>
                  <button onClick={() => setViewing(entry)} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer">View Full Entry →</button>
                </div>
              </div>
            );
          })}
          <Pager page={pagedEntries.page} lastPage={pagedEntries.lastPage} total={pagedEntries.total} onChange={setPage} noun="entries" />
        </div>
      )}

      {/* Create/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={submit} className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 p-7 shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? 'Edit Journal Entry' : "Daily Accomplishment Entry"}</h2>
            <p className="text-xs text-gray-500 mt-1 mb-5">Record your daily tasks, achievements, and reflective learnings.</p>
            <Notice message={message} error={error} />
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Entry Date *">
                  <input type="date" required value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
                </Field>
                <Field label="How Was Your Day?">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {Object.entries(MOODS).map(([mood, { label }]) => (
                      <label key={mood} className="cursor-pointer text-center">
                        <input type="radio" name="mood" value={mood} checked={form.mood === mood} onChange={() => setForm({ ...form, mood })} className="hidden peer" />
                        <div className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-950/60 peer-checked:text-emerald-600 dark:peer-checked:text-emerald-400 hover:border-gray-300 transition-all">
                          <span className="block text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
              <Field label="Entry Title *">
                <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Implemented backend authentication & attended sprint review"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
              </Field>
              <section aria-labelledby="activities-label">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 id="activities-label" className="text-sm font-semibold text-gray-800 dark:text-gray-200">Activities & Responsibilities <span className="text-rose-500">*</span></h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Write each task as a separate note.</p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {editing && <button type="button" onClick={() => setActivitiesEditable((editable) => !editable)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
                      {activitiesEditable ? <><Check className="h-4 w-4" /> Done</> : <><Pencil className="h-3.5 w-3.5" /> Edit notes</>}
                    </button>}
                    <button type="button" onClick={() => { setActivitiesEditable(true); setActivities((items) => [...items, '']); }} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950">
                      <Plus className="h-4 w-4" /> Add note
                    </button>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                  <div className="pointer-events-none absolute inset-y-0 left-10 border-l border-rose-200/80 dark:border-rose-900/70" />
                  {activities.map((activity, index) => (
                    <div key={index} className="relative flex items-start gap-3 border-b border-dashed border-gray-200 px-3 py-2.5 last:border-b-0 dark:border-gray-700">
                      <span className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 font-mono text-[11px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">{String(index + 1).padStart(2, '0')}</span>
                      {activitiesEditable ? (
                        <textarea rows={Math.min(4, Math.max(1, activity.split(/\r?\n/).length))} required={index === 0} value={activity} onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`; }} onChange={(e) => setActivities((items) => items.map((item, itemIndex) => itemIndex === index ? e.target.value : item))}
                          placeholder={index === 0 ? 'Describe a task, project, or responsibility...' : 'Add another activity...'}
                          className="min-h-8 flex-1 resize-none overflow-hidden border-0 bg-transparent px-0 py-1 text-sm leading-relaxed text-gray-800 outline-none placeholder:text-gray-400 focus:ring-0 dark:text-gray-100 dark:placeholder:text-gray-500" />
                      ) : (
                        <p className="min-h-8 flex-1 whitespace-pre-wrap py-1 text-sm leading-relaxed text-gray-800 dark:text-gray-100">{activity}</p>
                      )}
                      {activitiesEditable && activities.length > 1 && <button type="button" aria-label={`Remove note ${index + 1}`} onClick={() => setActivities((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="mt-1 rounded-md p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40" title="Remove note"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  ))}
                </div>
              </section>
              <Field label="Reflections & Key Takeaways">
                <textarea rows={3} value={form.reflection} onChange={(e) => setForm({ ...form, reflection: e.target.value })}
                  placeholder="What challenged you today? What new insight or skill did you gain?"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent leading-relaxed" />
              </Field>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="submit" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 text-sm cursor-pointer">Save Journal Entry</button>
                <button type="button" onClick={() => setShowForm(false)} className={btnGhost}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* View full entry modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setViewing(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 p-7 shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/60"><BookOpen className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{viewing.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{fmtDate(viewing.entry_date)}</p>
                </div>
              </div>
              {viewing.mood && <Badge tone={viewing.mood === 'excellent' ? 'green' : viewing.mood === 'good' ? 'blue' : viewing.mood === 'neutral' ? 'slate' : viewing.mood === 'difficult' ? 'amber' : 'red'}>{viewing.mood}</Badge>}
            </div>
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Activities & Responsibilities</p>
                <ol className="space-y-2">
                  {(viewing.content || '').split(/\r?\n/).filter((activity) => activity.trim()).map((activity, index) => (
                    <li key={index} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-800/40">
                      <span className="mt-0.5 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-300">{String(index + 1).padStart(2, '0')}</span>
                      <span className="whitespace-pre-wrap">{activity}</span>
                    </li>
                  ))}
                </ol>
              </div>
              {viewing.reflection && <div><p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Reflections & Key Takeaways</p><p className="whitespace-pre-wrap">{viewing.reflection}</p></div>}
              {viewing.supervisor_remarks && <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40"><p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Supervisor Remarks</p><p>{viewing.supervisor_remarks}</p></div>}
            </div>
            <div className="mt-6 flex justify-end"><button onClick={() => setViewing(null)} className={btnGhost}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
