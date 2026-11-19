import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, Field, Badge, EmptyState, Notice, Pager, apiError, inputCls, btnPrimary, btnGhost } from '../ui';

const emptyConfirm = { start_date: '', end_date: '', required_hours: '', coordinator_notes: '' };
const emptyCreate = { student_profile_id: '', internship_posting_id: '', reason: '' };
const STATUS_FILTERS = [
  ['pending', 'Pending'],
  ['confirmed', 'Confirmed'],
  ['rejected', 'Rejected'],
];
const badgeTone = { pending: 'amber', confirmed: 'green', rejected: 'red' };
const nameOf = (s) => s?.full_name?.trim() || `${s?.first_name || ''} ${s?.last_name || ''}`.trim() || 'Student';

export default function RecommendationsPanel({ presetStudentId, onPresetConsumed }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('pending');
  const [notice, setNotice] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [confirmForm, setConfirmForm] = useState(emptyConfirm);
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [options, setOptions] = useState({ students: [], postings: [] });

  const load = useCallback((p = page) => {
    setLoading(true);
    return api.get('/coordinator/recommendations', { params: { page: p, status } })
      .then((res) => {
        const payload = res.data.data;
        const rows = payload?.data || (Array.isArray(payload) ? payload : []);
        setItems(rows);
        setLastPage(payload?.last_page || 1);
        setTotal(payload?.total ?? rows.length);
        if (payload?.current_page && payload.current_page !== page) setPage(payload.current_page);
      })
      .catch((err) => { setItems([]); setNotice({ error: apiError(err) }); })
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (presetStudentId) {
      openCreate(String(presetStudentId));
      onPresetConsumed?.();
    }
  }, [presetStudentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOptions = () => {
    if (options.students.length) return;
    api.get('/coordinator/recommendation-options')
      .then((res) => setOptions(res.data.data || { students: [], postings: [] }))
      .catch(() => {});
  };

  const openCreate = (studentProfileId = '') => {
    loadOptions();
    setCreating(true);
    setCreateForm({ ...emptyCreate, student_profile_id: studentProfileId });
  };

  const create = async () => {
    try {
      await api.post('/coordinator/recommendations', createForm);
      setNotice({ message: 'Placement recommendation created.' });
      setCreating(false);
      setCreateForm(emptyCreate);
      setPage(1);
      load(1);
    } catch (err) {
      setNotice({ error: apiError(err) });
    }
  };

  const confirm = async (rec) => {
    try {
      await api.post(`/coordinator/recommendations/${rec.id}/confirm`, confirmForm);
      setNotice({ message: 'Placement confirmed and created.' });
      setConfirming(null);
      setConfirmForm(emptyConfirm);
      load();
    } catch (err) {
      setNotice({ error: apiError(err) });
    }
  };

  const reject = async (rec) => {
    try {
      await api.patch(`/coordinator/recommendations/${rec.id}/reject`, { reason: rejectReason });
      setNotice({ message: 'Recommendation rejected.' });
      setRejecting(null);
      setRejectReason('');
      load();
    } catch (err) {
      setNotice({ error: apiError(err) });
    }
  };

  const unplaced = options.students || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Placement Recommendations</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Recommend a company posting to an unplaced student, then confirm it to create the placement.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setStatus(key); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${status === key ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Notice message={notice?.message} error={notice?.error} />

      <Card className="p-5">
        <button onClick={() => (creating ? setCreating(false) : openCreate())} className="w-full flex items-center justify-between text-left cursor-pointer">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">+ New Placement Recommendation</h3>
          <span className="text-xs font-semibold text-emerald-600">{creating ? 'Cancel' : 'Create'}</span>
        </button>
        {creating && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 border-t border-gray-100 dark:border-gray-800 pt-4">
            <Field label="Student">
              <select value={createForm.student_profile_id} onChange={(e) => setCreateForm({ ...createForm, student_profile_id: e.target.value })} className={inputCls}>
                <option value="">Select student…</option>
                {(options.students || []).map((s) => <option key={s.id} value={s.id}>{nameOf(s)} {s.student_id_number ? `(${s.student_id_number})` : ''}</option>)}
              </select>
            </Field>
            <Field label="Approved Posting">
              <select value={createForm.internship_posting_id} onChange={(e) => setCreateForm({ ...createForm, internship_posting_id: e.target.value })} className={inputCls}>
                <option value="">Select posting…</option>
                {(options.postings || []).map((p) => <option key={p.id} value={p.id}>{p.title} — {p.company_profile?.company_name || p.companyProfile?.company_name || ''}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Reason / Notes (optional)">
                <textarea rows={2} value={createForm.reason} onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })} className={inputCls} placeholder="Why this student for this posting…" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <button onClick={create} disabled={!createForm.student_profile_id || !createForm.internship_posting_id} className={btnPrimary + ' disabled:opacity-50'}>Submit Recommendation</button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Students without an active placement</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">These students still need a company assignment.</p>
          </div>
          <span className="text-xs font-semibold text-gray-500">{unplaced.length}</span>
        </div>
        {unplaced.length === 0 ? (
          <p className="text-xs text-gray-400">{options.students.length ? 'Every active student already has a placement.' : 'Loading students…'}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unplaced.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => openCreate(String(s.id))}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-emerald-500 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                <span>{nameOf(s)}</span>
                <span className="text-emerald-600">Recommend →</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {loading ? (
        <Card className="p-6 text-sm text-gray-400">Loading recommendations…</Card>
      ) : !items.length ? (
        <EmptyState text={`No ${status} placement recommendations.`} />
      ) : items.map((rec) => (
        <Card key={rec.id} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                {nameOf(rec.student_profile || rec.studentProfile)} → {rec.internship_posting?.title || 'Posting'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {rec.internship_posting?.company_profile?.company_name}
                {rec.requested_start_date && ` · proposed ${rec.requested_start_date} → ${rec.requested_end_date} · ${rec.requested_required_hours}h`}
              </p>
              {rec.reason && <p className="text-xs text-gray-400 mt-1 italic">{rec.reason}</p>}
              {rec.coordinator_notes && <p className="text-xs text-gray-400 mt-1">Notes: {rec.coordinator_notes}</p>}
            </div>
            <Badge tone={badgeTone[rec.status] || 'slate'}>{rec.status || 'pending'}</Badge>
          </div>

          {rec.status !== 'pending' ? null : confirming === rec.id ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 border-t border-gray-100 dark:border-gray-800 pt-4">
              <Field label="Start Date"><input type="date" value={confirmForm.start_date} onChange={(e) => setConfirmForm({ ...confirmForm, start_date: e.target.value })} className={inputCls} /></Field>
              <Field label="End Date"><input type="date" value={confirmForm.end_date} onChange={(e) => setConfirmForm({ ...confirmForm, end_date: e.target.value })} className={inputCls} /></Field>
              <Field label="Required Hours"><input type="number" min="1" value={confirmForm.required_hours} onChange={(e) => setConfirmForm({ ...confirmForm, required_hours: e.target.value })} className={inputCls} /></Field>
              <Field label="Notes"><input value={confirmForm.coordinator_notes} onChange={(e) => setConfirmForm({ ...confirmForm, coordinator_notes: e.target.value })} className={inputCls} /></Field>
              <div className="sm:col-span-2 flex gap-2">
                <button onClick={() => confirm(rec)} className={btnPrimary}>Confirm & Create Placement</button>
                <button onClick={() => setConfirming(null)} className={btnGhost}>Cancel</button>
              </div>
            </div>
          ) : rejecting === rec.id ? (
            <div className="mt-4 flex gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
              <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason (optional)" className={inputCls} />
              <button onClick={() => reject(rec)} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 cursor-pointer shrink-0">Reject</button>
              <button onClick={() => setRejecting(null)} className={btnGhost}>Cancel</button>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setConfirming(rec.id); setConfirmForm({ ...emptyConfirm, start_date: rec.requested_start_date || '', end_date: rec.requested_end_date || '', required_hours: rec.requested_required_hours || '' }); }} className={btnPrimary}>Confirm</button>
              <button onClick={() => setRejecting(rec.id)} className="rounded-lg border border-rose-200 dark:border-rose-900 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer">Reject</button>
            </div>
          )}
        </Card>
      ))}

      <Pager page={page} lastPage={lastPage} total={total} onChange={setPage} noun="recommendations" />
    </div>
  );
}
