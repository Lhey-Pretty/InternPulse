import React, { useEffect, useState } from 'react';
import { Edit2, ArrowDown, ArrowUp, Save, X, Eye, EyeOff } from 'lucide-react';
import api from '../../api/client';
import { apiError } from '../ui';

export default function EvaluationCriteriaPanel() {
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ label: '', description: '', order: 1, is_active: true });
  const [type, setType] = useState('student'); // 'student' or 'company'

  const load = async (criteriaType = type) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/evaluation-criteria', { params: { type: criteriaType } });
      setCriteria(res.data.data || []);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [type]);

  const startEdit = (criterion) => {
    setEditing(criterion.id);
    setEditForm({
      label: criterion.label,
      description: criterion.description || '',
      order: criterion.order,
      is_active: criterion.is_active,
    });
    setError('');
    setMessage('');
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm({ label: '', description: '', order: 1, is_active: true });
  };

  const saveEdit = async (criterion) => {
    if (!editForm.label.trim()) {
      setError('Label is required');
      return;
    }
    
    try {
      await api.patch(`/admin/evaluation-criteria/${criterion.id}`, editForm);
      setMessage('Criterion updated successfully');
      setEditing(null);
      await load();
    } catch (e) {
      setError(apiError(e));
    }
  };

  const toggleStatus = async (criterion) => {
    try {
      await api.patch(`/admin/evaluation-criteria/${criterion.id}/toggle`);
      setMessage(`Criterion ${criterion.is_active ? 'deactivated' : 'activated'} successfully`);
      await load();
    } catch (e) {
      setError(apiError(e));
    }
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const newCriteria = [...criteria];
    [newCriteria[index - 1], newCriteria[index]] = [newCriteria[index], newCriteria[index - 1]];
    newCriteria.forEach((c, i) => c.order = i + 1);
    setCriteria(newCriteria);
    saveOrder(newCriteria);
  };

  const moveDown = (index) => {
    if (index === criteria.length - 1) return;
    const newCriteria = [...criteria];
    [newCriteria[index], newCriteria[index + 1]] = [newCriteria[index + 1], newCriteria[index]];
    newCriteria.forEach((c, i) => c.order = i + 1);
    setCriteria(newCriteria);
    saveOrder(newCriteria);
  };

  const saveOrder = async (reorderedCriteria) => {
    try {
      await api.post('/admin/evaluation-criteria/reorder', {
        type: type,
        criteria: reorderedCriteria.map((c, i) => ({ id: c.id, order: i + 1 })),
      });
      setMessage('Order updated successfully');
    } catch (e) {
      setError(apiError(e));
    }
  };

  if (loading) return <div className="animate-pulse space-y-3" role="status" aria-label="Loading evaluation criteria">{[0, 1, 2].map((item) => <div key={item} className="h-28 rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900" />)}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          Evaluation criteria
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure the scoring standards used in student and company evaluations.
        </p>
      </div>

      {/* Tabs for Student vs Company */}
      <div role="tablist" aria-label="Evaluation criteria type" className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
        <button
          role="tab"
          aria-selected={type === 'student'}
          onClick={() => { setType('student'); setEditing(null); setMessage(''); setError(''); }}
          className={`whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            type === 'student'
              ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Student Evaluation Criteria
        </button>
        <button
          role="tab"
          aria-selected={type === 'company'}
          onClick={() => { setType('company'); setEditing(null); setMessage(''); setError(''); }}
          className={`whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            type === 'company'
              ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Company Evaluation Criteria
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 dark:border-emerald-800 p-4 text-sm text-emerald-800 dark:text-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/50 dark:border-rose-800 p-4 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-gray-800/50">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {criteria.length} {criteria.length === 1 ? 'criterion' : 'criteria'}
          </p>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            {criteria.filter(c => c.is_active).length} active
          </span>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {criteria.map((criterion, index) => (
            <div
              key={criterion.id}
              className={`px-4 py-4 transition-colors sm:px-5 ${!criterion.is_active ? 'bg-gray-50/60 dark:bg-gray-800/30' : 'hover:bg-gray-50/70 dark:hover:bg-gray-800/30'}`}
            >
              {editing === criterion.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
                        Criterion Label *
                      </label>
                      <input
                        type="text"
                        value={editForm.label}
                        onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        placeholder="e.g., Comprehension"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
                        Field Name (System)
                      </label>
                      <input
                        type="text"
                        value={criterion.field_name}
                        disabled
                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
                      Description / Guidance
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      rows={3}
                      placeholder="Provide guidance on how to evaluate this criterion..."
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.is_active}
                        onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => saveEdit(criterion)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold text-sm transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                  <div className="flex shrink-0 items-center gap-1 pt-0.5">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      aria-label={`Move ${criterion.label} up`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === criteria.length - 1}
                      aria-label={`Move ${criterion.label} down`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {criterion.order}
                          </span>
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{criterion.label}</h3>
                          {!criterion.is_active && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Field: <code className="font-mono">{criterion.field_name}</code></p>
                      </div>
                    </div>

                    {criterion.description && (
                      <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                        {criterion.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => startEdit(criterion)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => toggleStatus(criterion)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          criterion.is_active
                            ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        {criterion.is_active ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            Activate
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
