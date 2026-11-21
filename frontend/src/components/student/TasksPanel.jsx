import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import api from '../../api/client';
import { Notice, apiError } from '../ui';

const ORDER = ['pending', 'in_progress', 'overdue', 'completed'];
const labels = { pending: 'Pending Review', in_progress: 'In Progress', overdue: 'Overdue', completed: 'Completed' };
const configs = {
  pending: { headerBg: 'bg-gray-50 dark:bg-gray-800/60', badge: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200', title: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-400' },
  in_progress: { headerBg: 'bg-blue-50/70 dark:bg-blue-950/30', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300', title: 'text-blue-900 dark:text-blue-200', dot: 'bg-blue-500' },
  overdue: { headerBg: 'bg-rose-50/70 dark:bg-rose-950/30', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300', title: 'text-rose-900 dark:text-rose-200', dot: 'bg-rose-500' },
  completed: { headerBg: 'bg-emerald-50/70 dark:bg-emerald-950/30', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300', title: 'text-emerald-900 dark:text-emerald-200', dot: 'bg-emerald-500' },
};

export default function TasksPanel() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [forms, setForms] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (p = page, search = debouncedSearch) => {
    try {
      const res = await api.get('/student/tasks', { params: { page: p, ...(search ? { search } : {}) } });
      const d = res.data.data;
      setData(d);
      setPage(d.current_page || p);
      setLastPage(d.last_page || 1);
    } catch (e) { setError(apiError(e)); }
  }, [page, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => { load(1, debouncedSearch); }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">Loading…</p>;

  const hasPlacement = !!data.placement;
  const tasks = data.tasks || [];
  const groups = ORDER.reduce((acc, s) => {
    const list = tasks.filter((t) => t.status === s);
    // 'overdue' group: pending/in_progress tasks past due (blade groups by status incl. overdue)
    if (s === 'overdue') return acc;
    if (list.length) acc[s] = list;
    return acc;
  }, {});
  const overdue = tasks.filter((t) => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date(new Date().toDateString()));
  if (overdue.length) groups.overdue = overdue;

  const setForm = (id, patch) => setForms((prev) => ({ ...prev, [id]: { student_notes: '', output_file: null, ...prev[id], ...patch } }));

  const update = async (task, status) => {
    setError(''); setMessage('');
    const f = forms[task.id] || {};
    try {
      const fd = new FormData();
      fd.append('status', status);
      if (f.student_notes) fd.append('student_notes', f.student_notes);
      if (f.output_file) fd.append('output_file', f.output_file);
      await api.patch(`/student/tasks/${task.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage('Task updated.');
      setForms((prev) => { const n = { ...prev }; delete n[task.id]; return n; });
      await load();
    } catch (err) { setError(apiError(err)); }
  };

  if (!hasPlacement) {
    return <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm dark:text-gray-100">
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No Active Internship Placement</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">Your assigned tasks and deliverables from your company mentor will be tracked here.</p>
    </div>;
  }
  if (tasks.length === 0) {
    return <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center shadow-sm dark:text-gray-100">
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No Tasks Assigned Yet</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">You're all caught up! Once your company supervisor assigns new tasks or deliverables, they will appear here.</p>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search tasks by title..." className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:placeholder:text-gray-400" />
      </div>
      <Notice message={message} error={error} />
      {ORDER.filter((s) => groups[s]).map((status) => {
        const cfg = configs[status];
        const list = groups[status].filter((t) => status !== 'overdue' || (t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date(new Date().toDateString())));
        const unique = [...new Map(list.map((t) => [t.id, t])).values()];
        return (
          <div key={status} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden dark:text-gray-100">
            <div className={`px-6 py-4 border-b border-gray-100 dark:border-gray-800 ${cfg.headerBg} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                <h2 className={`text-sm font-extrabold uppercase tracking-wider ${cfg.title}`}>{labels[status]}</h2>
              </div>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${cfg.badge}`}>{unique.length}</span>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800/80">
              {unique.map((task) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date(new Date().toDateString()) && task.status !== 'completed';
                const f = forms[task.id] || {};
                return (
                  <div key={task.id} className="p-6 hover:bg-gray-50/40 dark:hover:bg-gray-800/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2.5">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{task.title}</h3>
                        {task.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">{task.description}</p>}
                      </div>
                      {task.due_date && (
                        <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${isOverdue ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                          Due {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {isOverdue && <span className="text-[10px] uppercase font-black tracking-wider text-rose-600 dark:text-rose-400">(Overdue)</span>}
                        </span>
                      )}
                    </div>

                    {task.supervisor_feedback && (
                      <div className="my-4 p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-blue-600 dark:text-blue-400 block mb-1">Supervisor Feedback:</span>
                        <p className="leading-relaxed">{task.supervisor_feedback}</p>
                      </div>
                    )}

                    {task.status !== 'completed' ? (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-stretch md:items-end gap-3.5">
                        <div className="flex-1 min-w-0">
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Progress Notes</label>
                          <input type="text" value={f.student_notes || ''} onChange={(e) => setForm(task.id, { student_notes: e.target.value })}
                            placeholder="Add deliverables summary, links, or notes..."
                            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-gray-100 dark:placeholder:text-gray-400" />
                        </div>
                        <div className="shrink-0">
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Deliverable File</label>
                          <input type="file" onChange={(e) => setForm(task.id, { output_file: e.target.files?.[0] || null })}
                            className="text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-100 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-200 cursor-pointer dark:text-gray-400" />
                        </div>
                        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                          {task.status !== 'in_progress' && (
                            <button onClick={() => update(task, 'in_progress')} className="border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-semibold px-4 py-2.5 rounded-xl text-xs cursor-pointer">In Progress</button>
                          )}
                          <button onClick={() => update(task, 'completed')} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-500/20 cursor-pointer dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800 dark:hover:to-teal-800">Mark Complete</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Completed{task.completed_at ? ` on ${new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {lastPage > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => load(page - 1, searchTerm)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">← Prev</button>
          <span className="text-sm text-gray-500 dark:text-gray-400 px-3">Page {page} of {lastPage}</span>
          <button disabled={page >= lastPage} onClick={() => load(page + 1, searchTerm)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">Next →</button>
        </div>
      )}
    </div>
  );
}
