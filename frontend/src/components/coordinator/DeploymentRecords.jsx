import { useState } from 'react';
import api from '../../api/client';
import { apiError, Notice, pageMeta, Pager } from '../ui';

export default function DeploymentRecords({ studentId, placement, onReviewed }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('attendance');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [review, setReview] = useState(null);
  const [reason, setReason] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [saving, setSaving] = useState(false);
  const load = async (nextTab = tab, nextPage = page) => {
    try {
      const endpoint = nextTab === 'attendance' ? '/coordinator/students/' + studentId + '/attendance' : '/coordinator/journals';
      const res = await api.get(endpoint, { params: { student_id: studentId, placement_id: placement.id, page: nextPage } });
      setError('');
      setData(nextTab === 'attendance' ? res.data.data : res.data.data.entries);
    } catch (e) { setError(apiError(e)); }
  };
  const submit = async (decision) => {
    setSaving(true); setError('');
    try {
      await api.patch('/coordinator/attendance/' + review.id + '/review', { decision, reason, ...(timeOut ? { time_out: timeOut } : {}) });
      setReview(null); setReason(''); await load(); onReviewed?.();
    } catch (e) { setError(apiError(e)); }
    finally { setSaving(false); }
  };
  const paged = pageMeta(data);
  return (
    <div className="mt-4 text-sm">
      <button type="button" className="font-semibold text-emerald-700 dark:text-emerald-300" onClick={() => { setOpen(!open); if (!open) load(); }}>
        {open ? 'Hide deployment records' : 'View attendance and journals'}
      </button>
      {open && <div className="mt-3 space-y-3">
        <div className="flex gap-3">
          {['attendance', 'journals'].map((value) => <button key={value} type="button"
            className={tab === value ? 'font-bold text-emerald-700 dark:text-emerald-300 capitalize' : 'capitalize'}
            onClick={() => { setTab(value); setPage(1); setData(null); setReview(null); load(value, 1); }}>{value}</button>)}
        </div>
        <Notice error={error} />
        {error && <button type="button" onClick={() => load()}>Retry</button>}
        {!data && !error && <p>Loading records...</p>}
        {data && paged.items.length === 0 && <p className="text-gray-500">No records for this deployment.</p>}
        {paged.items.map((item) => <div key={item.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          {tab === 'journals' ? <>
            <p className="font-semibold">{item.title} | {item.entry_date?.slice(0, 10)}</p>
            <p className="mt-2 whitespace-pre-wrap">{item.content}</p>
            {item.reflection && <p className="mt-2 whitespace-pre-wrap text-gray-500">{item.reflection}</p>}
          </> : <>
            <p className="font-semibold">{item.date?.slice(0, 10)} | {item.time_in || '-'} to {item.time_out || 'Pending time-out'}</p>
            <p className="text-xs mt-1">{item.review_decision === 'rejected' ? 'Rejected' : item.time_in_approved_at && item.time_out_approved_at ? (item.hours_rendered || 0) + 'h credited' : 'Pending approval'}</p>
            {item.review_reason && <p className="text-xs mt-1">Review: {item.review_reason}</p>}
            {['pulled_out', 'transferred'].includes(placement.status) && !item.review_decision && !(item.time_in_approved_at && item.time_out_approved_at) &&
              <button type="button" className="mt-2 font-semibold text-emerald-700 dark:text-emerald-300" onClick={() => {
                setReview(item); setReason(''); setTimeOut(item.time_out?.slice(0, 5) || '');
              }}>Review pending attendance</button>}
          </>}
        </div>)}
        {data && <Pager {...paged} onChange={(value) => { setPage(value); setData(null); load(tab, value); }} />}
        {review && <div className="rounded-xl border border-amber-300 p-4 space-y-3">
          <p className="font-bold">Finalize attendance | {review.date?.slice(0, 10)}</p>
          <label className="block">Verified time-out (for approval)
            <input type="time" className="block mt-1 rounded-lg border p-2 dark:bg-gray-800" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} />
          </label>
          <label className="block">Review reason
            <textarea className="block w-full mt-1 rounded-lg border p-2 dark:bg-gray-800" required maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <p className="text-xs">Approval credits verified hours to this deployment and updates the student's overall balance. This decision is final.</p>
          <div className="flex gap-4">
            <button type="button" disabled={saving || !reason.trim() || !timeOut} onClick={() => submit('approved')} className="text-emerald-700 font-bold disabled:opacity-40">Approve</button>
            <button type="button" disabled={saving || !reason.trim()} onClick={() => submit('rejected')} className="text-rose-700 font-bold disabled:opacity-40">Reject</button>
            <button type="button" disabled={saving} onClick={() => setReview(null)}>Cancel</button>
          </div>
        </div>}
      </div>}
    </div>
  );
}
