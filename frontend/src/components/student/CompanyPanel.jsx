import React, { useCallback, useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import api from '../../api/client';
import { Badge, btnPrimary, Card, EmptyState, Field, inputCls, Notice, apiError } from '../ui';

const RATING_FIELDS = [
  ['work_environment', 'Work environment'],
  ['mentorship_quality', 'Mentorship quality'],
  ['learning_opportunities', 'Learning opportunities'],
  ['facilities', 'Facilities'],
  ['overall_experience', 'Overall experience'],
];

const emptyRating = Object.fromEntries(RATING_FIELDS.map(([k]) => [k, 4]));
const emptyRequest = { company_name: '', contact_email: '', website: '', reason: '' };

function RatingForm({ placement, existing, onSaved }) {
  const [form, setForm] = useState({ ...emptyRating, ...(existing || {}), feedback: existing?.feedback || '', would_recommend: existing?.would_recommend ?? true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post(`/student/placements/${placement.id}/company-rating`, form);
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {RATING_FIELDS.map(([key, label]) => (
          <Field key={key} label={label}>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, [key]: n })}
                  className="p-0.5"
                >
                  <Star className={`h-6 w-6 ${n <= Number(form[key]) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
          </Field>
        ))}
      </div>
      <Field label="Feedback (optional)">
        <textarea rows={2} maxLength={2000} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={!!form.would_recommend} onChange={(e) => setForm({ ...form, would_recommend: e.target.checked })} className="h-4 w-4 accent-green-800" />
        I would recommend this company to other students
      </label>
      <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : existing ? 'Update rating' : 'Submit rating'}</button>
    </form>
  );
}

export default function CompanyPanel() {
  const [placements, setPlacements] = useState([]);
  const [requests, setRequests] = useState([]);
  const [ratingFor, setRatingFor] = useState(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState(emptyRequest);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([
        api.get('/student/placements'),
        api.get('/student/company-requests'),
      ]);
      setPlacements(p.data.data || []);
      setRequests(r.data.data || []);
    } catch (e) {
      setError(apiError(e));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitRequest = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      await api.post('/student/company-requests', requestForm);
      setMessage('Company request submitted for campus review.');
      setRequestForm(emptyRequest);
      setShowRequestForm(false);
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  };

  const ratable = placements.filter((p) => ['active', 'completed'].includes(p.status));

  return (
    <div className="space-y-6">
      <Notice message={message} error={error} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Your placements</h3>
        </div>
        {ratable.length === 0 ? (
          <EmptyState text="No active or completed placements to evaluate." />
        ) : (
          <div className="space-y-3">
            {ratable.map((p) => {
              const posting = p.internship_posting || p.internshipPosting;
              const rating = p.company_rating || p.companyRating;
              const isRatingFor = ratingFor?.id === p.id;
              return (
                <Card key={p.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-900">{posting?.title || 'Placement'}</h4>
                      <p className="text-sm text-slate-500">{posting?.company_profile?.company_name || posting?.company?.name || ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={p.status === 'completed' ? 'green' : 'amber'}>{p.status}</Badge>
                      {rating && <Badge tone="blue">★ {rating.average_rating}</Badge>}
                      <button onClick={() => setRatingFor(isRatingFor ? null : p)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-green-600 hover:text-green-800">
                        {rating ? 'Edit rating' : 'Rate company'}
                      </button>
                    </div>
                  </div>
                  {isRatingFor && (
                    <RatingForm
                      placement={p}
                      existing={rating}
                      onSaved={() => { setRatingFor(null); load(); }}
                    />
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Company requests</h3>
            <p className="text-xs text-slate-500">Request a company that isn't on the portal yet.</p>
          </div>
          <button onClick={() => setShowRequestForm(!showRequestForm)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-green-600 hover:text-green-800">
            {showRequestForm ? 'Close' : 'New request'}
          </button>
        </div>

        {showRequestForm && (
          <Card className="mb-3">
            <form onSubmit={submitRequest} className="grid gap-3 sm:grid-cols-2">
              <Field label="Company name">
                <input required value={requestForm.company_name} onChange={(e) => setRequestForm({ ...requestForm, company_name: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Contact email">
                <input type="email" value={requestForm.contact_email} onChange={(e) => setRequestForm({ ...requestForm, contact_email: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Website">
                <input type="url" value={requestForm.website} onChange={(e) => setRequestForm({ ...requestForm, website: e.target.value })} className={inputCls} placeholder="https://…" />
              </Field>
              <Field label="Reason">
                <input value={requestForm.reason} onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })} className={inputCls} />
              </Field>
              <div className="sm:col-span-2">
                <button type="submit" className={btnPrimary}>Submit request</button>
              </div>
            </form>
          </Card>
        )}

        {requests.length === 0 ? (
          <EmptyState text="No company requests yet." />
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <Card key={r.id} className="!p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{r.company_name}</p>
                    <p className="text-xs text-slate-400">{r.contact_email || r.website || ''}</p>
                  </div>
                  <Badge tone={r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'amber'}>{r.status}</Badge>
                </div>
                {r.review_notes && <p className="mt-2 text-xs text-slate-500">Note: {r.review_notes}</p>}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
