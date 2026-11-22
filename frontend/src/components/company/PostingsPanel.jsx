import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import api from '../../api/client';
import { Notice, apiError, Pager, pageMeta } from '../ui';

const statusCls = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
  closed: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
};
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const emptyForm = {
  title: '', position: '', location: '', work_setup: 'on-site', slots: 1,
  required_course: '', required_year_level: '', required_hours: '', application_deadline: '',
  internship_start: '', skills_raw: '', is_paid: false, allowance: '',
  description: '', responsibilities: '', qualifications: '',
};

const inputCls = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:placeholder-gray-400';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5';

function PostingForm({ initial, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const skills = form.skills_raw.split(',').map((s) => s.trim()).filter(Boolean);

  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, required_skills: skills }); }} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 space-y-6 dark:text-gray-100">
      <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><span>▦</span> Role & Position Details</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Provide clear information about the internship role and expectations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className={labelCls}>Title <span className="text-rose-500 dark:text-rose-400">*</span></label>
          <input required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Full Stack Web Development Intern" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Position Role <span className="text-rose-500 dark:text-rose-400">*</span></label>
          <input required value={form.position} onChange={(e) => set('position', e.target.value)} placeholder="e.g. Software Engineer" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Location / City <span className="text-rose-500 dark:text-rose-400">*</span></label>
          <input required value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Makati City, Metro Manila" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Work Setup <span className="text-rose-500 dark:text-rose-400">*</span></label>
          <select required value={form.work_setup} onChange={(e) => set('work_setup', e.target.value)} className={inputCls}>
            <option value="on-site">On-site</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Available Slots <span className="text-rose-500 dark:text-rose-400">*</span></label>
          <input type="number" min="1" required value={form.slots} onChange={(e) => set('slots', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Preferred Degree / Course</label>
          <input value={form.required_course} onChange={(e) => set('required_course', e.target.value)} placeholder="e.g. BS Information Technology, BSCS" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Required Year Level</label>
          <select value={form.required_year_level} onChange={(e) => set('required_year_level', e.target.value)} className={inputCls}>
            <option value="">Any Year Level</option>
            {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Required Hours</label>
          <input type="number" min="1" value={form.required_hours} onChange={(e) => set('required_hours', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Application Deadline</label>
          <input type="date" value={form.application_deadline} onChange={(e) => set('application_deadline', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Internship Start Date</label>
          <input type="date" value={form.internship_start} onChange={(e) => set('internship_start', e.target.value)} className={inputCls} />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Required Skills <span className="text-gray-400 lowercase font-normal dark:text-gray-400">(comma-separated)</span></label>
          <input value={form.skills_raw} onChange={(e) => set('skills_raw', e.target.value)} placeholder="e.g. PHP, Laravel, MySQL, REST API, Tailwind CSS" className={inputCls} />
          <div className="flex flex-wrap gap-2 mt-2.5 min-h-[1.5rem]">
            {skills.map((s, i) => <span key={i} className="inline-flex items-center px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-200/50 dark:border-emerald-800/50"># {s}</span>)}
          </div>
        </div>
        <div className="md:col-span-2 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/70 dark:border-gray-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={!!form.is_paid} onChange={(e) => set('is_paid', e.target.checked)} className="w-5 h-5 rounded-lg border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500 dark:text-emerald-400" />
            <div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white block">This is a paid internship</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Offer financial compensation or monthly allowance</span>
            </div>
          </label>
          <div className="w-full sm:w-64">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">Monthly Allowance (₱)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-gray-400 font-semibold text-sm dark:text-gray-400">₱</span>
              <input type="number" min="0" step="0.01" value={form.allowance} onChange={(e) => set('allowance', e.target.value)} placeholder="0.00" className="w-full pl-8 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:placeholder:text-gray-400" />
            </div>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Job Description <span className="text-rose-500 dark:text-rose-400">*</span></label>
          <textarea required rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe the internship scope, team environment, and day-to-day impact..." className={inputCls} />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Key Responsibilities</label>
          <textarea rows={3} value={form.responsibilities} onChange={(e) => set('responsibilities', e.target.value)} placeholder="Outline specific tasks and deliverables expected from the intern..." className={inputCls} />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Qualifications & Preferred Background</label>
          <textarea rows={3} value={form.qualifications} onChange={(e) => set('qualifications', e.target.value)} placeholder="Highlight desired knowledge, mindset, and prerequisites..." className={inputCls} />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
        <button type="submit" disabled={saving} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 text-sm cursor-pointer disabled:opacity-60 dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800 dark:hover:to-emerald-800">
          {saving ? 'Saving…' : 'Submit for Review'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold px-6 py-2.5 rounded-xl text-sm cursor-pointer">Cancel</button>}
      </div>
    </form>
  );
}

export default function PostingsPanel() {
  const [postings, setPostings] = useState(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [trashedOnly, setTrashedOnly] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [view, setView] = useState('list'); // list | create | edit
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/company/postings', { params: { page, ...(trashedOnly ? { trashed: 1 } : {}) } });
      const meta = pageMeta(res.data.data);
      setPostings(meta.items);
      setLastPage(meta.lastPage);
      setTotal(meta.total);
    } catch (e) { setError(apiError(e)); setPostings([]); }
  }, [page, trashedOnly]);

  useEffect(() => { load(); }, [load]);

  if (!postings) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">Loading…</p>;

  const submit = async (form) => {
    setSaving(true); setError(''); setMessage('');
    try {
      const payload = { ...form, skills_raw: undefined };
      if (view === 'edit' && editing) {
        await api.patch(`/company/postings/${editing.id}`, payload);
        setMessage('Posting updated and submitted for review.');
      } else {
        await api.post('/company/postings', payload);
        setMessage('Posting submitted for review.');
      }
      setView('list');
      setEditing(null);
      await load();
    } catch (err) { setError(apiError(err)); }
    finally { setSaving(false); }
  };

  const remove = async (posting) => {
    if (!window.confirm('Move this posting to Trash? You can restore it later.')) return;
    setError('');
    try {
      await api.delete(`/company/postings/${posting.id}`);
      setMessage('Posting moved to Trash.');
      if (postings.length === 1 && page > 1) setPage(page - 1);
      await load();
    } catch (err) { setError(apiError(err)); }
  };

  const restore = async (posting) => {
    setRestoringId(posting.id);
    setError(''); setMessage('');
    try {
      await api.post(`/company/postings/${posting.id}/restore`);
      setMessage('Posting restored.');
      if (postings.length === 1 && page > 1) setPage(page - 1);
      await load();
    } catch (err) { setError(apiError(err)); }
    finally { setRestoringId(null); }
  };

  const startEdit = (posting) => {
    setEditing(posting);
    setView('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToList = () => { setView('list'); setEditing(null); };

  if (view !== 'list') {
    const initial = view === 'edit' && editing
      ? { ...emptyForm, ...editing, skills_raw: (editing.required_skills || []).join(', '), application_deadline: editing.application_deadline?.slice?.(0, 10) || '', internship_start: editing.internship_start?.slice?.(0, 10) || '' }
      : emptyForm;
    return (
      <div className="max-w-4xl mx-auto">
        <button onClick={backToList} className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 mb-5 cursor-pointer dark:hover:text-emerald-300">
          <ArrowLeft className="w-4 h-4" /> Back to Postings
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6">{view === 'edit' ? 'Edit Posting' : 'Create New Posting'}</h1>
        <Notice message={message} error={error} />
        <PostingForm initial={initial} onSubmit={submit} onCancel={backToList} saving={saving} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{trashedOnly ? 'Deleted Internship Postings' : 'Internship Postings'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your available positions, track applicant intake, and update posting statuses</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            {total} {trashedOnly ? 'deleted' : 'total'} posting{total !== 1 ? 's' : ''}
          </span>
          <button type="button" aria-pressed={trashedOnly} onClick={() => { setTrashedOnly(!trashedOnly); setPage(1); setError(''); setMessage(''); }} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
            {trashedOnly ? 'Back to Postings' : 'Trash'}
          </button>
          <button onClick={() => { setTrashedOnly(false); setPage(1); setView('create'); }} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:-translate-y-0.5 text-sm cursor-pointer dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800 dark:hover:to-emerald-800">
            <Plus className="w-4 h-4" /> New Posting
          </button>
        </div>
      </div>

      <Notice message={message} error={error} />

      {postings.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-12 text-center dark:text-gray-100">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{trashedOnly ? 'Trash is empty' : 'No postings yet'}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">{trashedOnly ? 'Deleted postings will appear here so you can restore them.' : 'Create your first internship posting to start receiving applications from qualified candidates.'}</p>
          <button onClick={() => { setTrashedOnly(false); setView('create'); }} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all text-sm cursor-pointer dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800 dark:hover:to-emerald-800">
            <Plus className="w-4 h-4" /> Create Your First Posting
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden dark:text-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Title & Details</th>
                  <th className="px-6 py-4">Available Slots</th>
                  <th className="px-6 py-4">{trashedOnly ? 'Deleted On' : 'Application Deadline'}</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {postings.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <h4 className="font-bold text-gray-900 dark:text-white leading-snug">{p.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{p.location || 'Location TBD'}</span>
                        <span>•</span>
                        <span className="font-medium capitalize">{p.work_setup}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {p.slots} slot{p.slots > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-600 dark:text-gray-400">{(trashedOnly ? p.deleted_at : p.application_deadline) ? fmt(trashedOnly ? p.deleted_at : p.application_deadline) : <span className="text-gray-400 dark:text-gray-400">—</span>}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${statusCls[p.status] || statusCls.draft}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${p.status === 'approved' ? 'bg-emerald-500' : p.status === 'pending' ? 'bg-amber-500' : 'bg-gray-400'}`}></span>
                        {p.deleted_at ? 'Deleted' : p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.deleted_at ? (
                          <button disabled={restoringId === p.id} onClick={() => restore(p)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40">
                            {restoringId === p.id ? 'Restoring...' : 'Restore'}
                          </button>
                        ) : (
                          <>
                        <button onClick={() => startEdit(p)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">Edit</button>
                        <button onClick={() => remove(p)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer">Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pager page={page} lastPage={lastPage} total={total} onChange={setPage} noun="postings" className="mt-4" />
    </div>
  );
}
