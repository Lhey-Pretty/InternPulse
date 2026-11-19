import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import api from '../../api/client';
import { apiError } from '../ui';

const STATUS_FILTERS = [
  ['all', 'All Companies'], ['pending', 'Pending Review'], ['verified', 'Verified'], ['rejected', 'Rejected'],
];
const statusCls = {
  verified: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-600/20',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-600/20',
  rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 ring-1 ring-rose-600/20',
};
const postingCls = {
  approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-600/20',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-600/20',
  rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 ring-1 ring-rose-600/20',
};
const inputCls = 'w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5';
const cardCls = 'bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4';
const sectionHead = (color, title, sub) => (
  <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
    <h2 className={`text-base font-bold text-gray-900 dark:text-white flex items-center gap-2`}>
      <span className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center text-xs`}></span>
      {title}
    </h2>
    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
  </div>
);
const StarRow = ({ avg }) => (
  <div className="flex items-center gap-1.5">
    <div className="flex text-amber-400 text-sm">
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4" fill={i <= Math.round(avg) ? 'currentColor' : 'none'} strokeWidth={1.5} />)}
    </div>
    <span className="font-bold text-xs text-gray-700 dark:text-gray-300">({Number(avg || 0).toFixed(1)})</span>
  </div>
);

function CompanyForm({ company, onDone, onCancel }) {
  const isEdit = !!company;
  const [f, setF] = useState({
    name: company?.user?.name || '', email: company?.user?.email || '', password: '',
    is_temporary: company?.user?.is_temporary ? '1' : '0',
    access_starts_at: company?.user?.access_starts_at ? company.user.access_starts_at.slice(0, 16) : '',
    access_ends_at: company?.user?.access_ends_at ? company.user.access_ends_at.slice(0, 16) : '',
    company_name: company?.company_name || '', industry: company?.industry || '', description: company?.description || '',
    program: company?.program || '',
    address: company?.address || '', city: company?.city || '', province: company?.province || '',
    website: company?.website || '', contact_person: company?.contact_person || '',
    contact_phone: company?.contact_phone || '', contact_email: company?.contact_email || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    const payload = { ...f, is_temporary: f.is_temporary === '1', access_starts_at: f.access_starts_at || null, access_ends_at: f.access_ends_at || null };
    try {
      if (isEdit) {
        const { name: _name, email: _email, password: _password, ...rest } = payload;
        await api.patch(`/admin/companies/${company.id}`, rest);
      } else {
        await api.post('/admin/companies', payload);
      }
      onDone();
    } catch (err) { setError(apiError(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={onCancel} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Back to Companies
      </button>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Company Profile' : 'Register New Company'}</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{isEdit ? 'Update company profile details and temporary access settings.' : 'Create a verified or temporary partner company account and profile.'}</p>
      </div>
      {error && <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm font-semibold">{error}</div>}
      <form onSubmit={submit} className="space-y-6">
        {!isEdit && (
          <div className={cardCls}>
            {sectionHead('bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400', 'Login Credentials', 'The credentials this company representative will use to log into the portal.')}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="md:col-span-2"><label className={labelCls}>Account / Admin Name *</label><input required value={f.name} onChange={(e) => set('name', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Login Email Address *</label><input required type="email" value={f.email} onChange={(e) => set('email', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Initial Password *</label><input required type="password" minLength={8} maxLength={255} autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} className={inputCls} /><p className="mt-1 text-xs text-gray-500">Use at least 8 characters with uppercase and lowercase letters, a number, and a symbol.</p></div>
            </div>
          </div>
        )}
        <div className={cardCls}>
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs"></span>
                Temporary Access Window
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Restrict login access to specific internship semester dates.</p>
            </div>
            <button type="button" onClick={() => set('is_temporary', f.is_temporary === '1' ? '0' : '1')}
              className={`relative w-11 h-6 rounded-full transition-colors ${f.is_temporary === '1' ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
              <span className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 dark:border-gray-600 rounded-full h-5 w-5 transition-all ${f.is_temporary === '1' ? 'translate-x-5' : ''}`}></span>
            </button>
          </div>
          {f.is_temporary === '1' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div><label className={labelCls}>Access Starts At</label><input type="datetime-local" value={f.access_starts_at} onChange={(e) => set('access_starts_at', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Access Ends At</label><input type="datetime-local" value={f.access_ends_at} onChange={(e) => set('access_ends_at', e.target.value)} className={inputCls} /></div>
            </div>
          )}
        </div>
        <div className={cardCls}>
          {sectionHead('bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400', 'Company Details & Profile', 'Primary information displayed on student job listings and partner rosters.')}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div><label className={labelCls}>Assigned Program *</label><select required value={f.program} onChange={(e) => set('program', e.target.value)} className={inputCls}><option value="">Select program</option>{['BSIT','BSCPE','BSHM','BSTM','BSCRIM','FISHERIES','POLSCI','BEED','BSED_MATH','BSED_SCIENCE','BSED_ENGLISH'].map((program) => <option key={program} value={program}>{program.replaceAll('_', ' ')}</option>)}</select></div>
            <div className="md:col-span-2"><label className={labelCls}>Company Name *</label><input required value={f.company_name} onChange={(e) => set('company_name', e.target.value)} placeholder="Acme Corporation" className={inputCls} /></div>
            <div><label className={labelCls}>Industry Sector</label><input value={f.industry} onChange={(e) => set('industry', e.target.value)} placeholder="Information Technology, Healthcare, etc." className={inputCls} /></div>
            <div><label className={labelCls}>Contact Person</label><input value={f.contact_person} onChange={(e) => set('contact_person', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Contact Phone</label><input value={f.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Contact Email</label><input type="email" value={f.contact_email} onChange={(e) => set('contact_email', e.target.value)} className={inputCls} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Office Address *</label><input required value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, Building, Barangay" className={inputCls} /></div>
            <div><label className={labelCls}>City</label><input value={f.city} onChange={(e) => set('city', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Province</label><input value={f.province} onChange={(e) => set('province', e.target.value)} className={inputCls} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Website URL</label><input type="url" value={f.website} onChange={(e) => set('website', e.target.value)} placeholder="https://example.com" className={inputCls} /></div>
            <div className="md:col-span-2"><label className={labelCls}>Company Overview / Description</label><textarea rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Brief introduction about company culture and student internship openings..." className={inputCls} /></div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Company'}
          </button>
        </div>
      </form>
    </div>
  );
}

function CompanyDetail({ company, onBack, onEdit }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admin/companies/${company.id}`);
      const d = res.data.data;
      setDetail(d);
    } catch (e) { setError(apiError(e)); }
  }, [company.id]);

  useEffect(() => { load(); }, [load]);

  const act = async (fn, payload) => { await fn(payload); await load(); };
  const verify = (status) => act(() => api.patch(`/admin/companies/${company.id}/verification`, { status }));
  const toggleActive = () => act(() => api.patch(`/admin/companies/${company.id}/toggle-active`));
  const reject = async () => {
    if (!rejectReason.trim()) return;
    await act(() => api.patch(`/admin/companies/${company.id}/verification`, { status: 'rejected', rejection_reason: rejectReason }));
    setRejectOpen(false); setRejectReason('');
  };

  if (!detail) return <p className="py-12 text-center text-slate-500">{error || 'Loading…'}</p>;
  const c = detail.company;
  const avg = detail.average_rating || 0;
  const dist = detail.rating_distribution || {};
  const joined = c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';
  const details = [
    ['Office Address', [c.address, c.city, c.province].filter(Boolean).join(', ')],
    ['Contact Person', c.contact_person], ['Contact Email', c.contact_email], ['Contact Phone', c.contact_phone],
    ['Website', c.website], ['Account Email', c.user?.email],
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Companies
        </button>
        <button onClick={() => onEdit(c)} className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
          Edit Profile
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-7 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-600 text-white font-extrabold text-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">{(c.company_name || '?').charAt(0).toUpperCase()}</div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">{c.company_name}</h1>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2"><span>{c.industry || 'General Industry'}</span><span>•</span><span>Joined {joined}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize ${statusCls[c.verification_status] || statusCls.pending}`}>{c.verification_status}</span>
            {!c.user?.is_active && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 ring-1 ring-rose-600/20">Deactivated</span>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 pt-6 text-sm">
          {details.filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="bg-gray-50/70 dark:bg-gray-800/40 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800/80">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{label}</p>
              {label === 'Website'
                ? <a href={value} target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium break-all text-xs">{value}</a>
                : label.includes('Email')
                  ? <a href={`mailto:${value}`} className="text-gray-800 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium break-all text-xs">{value}</a>
                  : <p className="text-gray-900 dark:text-white font-medium text-xs break-words">{value}</p>}
            </div>
          ))}
        </div>
        {c.description && (
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">About Company</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{c.description}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">Access Configuration</h3>
          {c.user?.is_temporary ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/30">
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Account Access Type</span>
                <span className="text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/50 px-2.5 py-0.5 rounded-full">Temporary</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"><p className="text-[11px] font-semibold uppercase text-gray-400">Access Starts</p><p className="font-medium text-gray-800 dark:text-gray-200 mt-1">{c.user.access_starts_at ? new Date(c.user.access_starts_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}</p></div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"><p className="text-[11px] font-semibold uppercase text-gray-400">Access Ends</p><p className="font-medium text-gray-800 dark:text-gray-200 mt-1">{c.user.access_ends_at ? new Date(c.user.access_ends_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}</p></div>
              </div>
            </div>
          ) : <p className="text-xs text-gray-400">Permanent access — no time restrictions.</p>}
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">Company Feedback & Rating</h3>
          {(detail.rating_count || 0) > 0 ? (
            <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center gap-4">
              <div className="text-center shrink-0">
                <p className="text-4xl font-extrabold text-amber-500 tracking-tight">{avg.toFixed(1)}</p>
                <div className="flex text-amber-400 text-xs justify-center mt-1">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-3.5 h-3.5" fill={i <= Math.round(avg) ? 'currentColor' : 'none'} />)}</div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{detail.rating_count} review{detail.rating_count !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex-1 space-y-1.5 text-xs">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="w-3 text-gray-500 dark:text-gray-400 font-medium text-right">{star}</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${detail.rating_count ? ((dist[star] || 0) / detail.rating_count) * 100 : 0}%` }}></div>
                    </div>
                    <span className="w-3 text-[11px] text-gray-400 text-right">{dist[star] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">No ratings yet</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Student evaluations will appear here once submitted.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        {c.verification_status === 'pending' ? (
          <div className="flex items-center gap-2">
            <button onClick={() => verify('verified')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-all cursor-pointer">✓ Approve</button>
            <button onClick={() => setRejectOpen(!rejectOpen)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 transition-colors cursor-pointer">✕ Reject</button>
          </div>
        ) : <span />}
        <button onClick={toggleActive} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${c.user?.is_active ? 'border-rose-200 text-rose-600 dark:border-rose-800 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30' : 'border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${c.user?.is_active ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
          {c.user?.is_active ? 'Deactivate' : 'Activate'}
        </button>
      </div>
      {rejectOpen && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs px-3 py-1.5 focus:ring-2 focus:ring-rose-500 dark:text-white" />
          <button onClick={reject} className="bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer">Confirm Reject</button>
        </div>
      )}

      {(c.internship_postings || []).length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Internship Postings</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{c.internship_postings.length} Total</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {c.internship_postings.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3.5 px-2 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{p.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2"><span>{p.location}</span><span>•</span><span>{p.slots} slots</span></p>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${postingCls[p.status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 ring-1 ring-gray-600/20'}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompaniesPanel() {
  const [view, setView] = useState('list'); // list | create | edit | detail
  const [companies, setCompanies] = useState(null);
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async (p = page, s = status) => {
    try {
      const res = await api.get('/admin/companies', { params: { status: s, page: p } });
      const d = res.data.data;
      setCompanies(d.data || []);
      setPage(d.current_page || p);
      setLastPage(d.last_page || 1);
    } catch (e) { setError(apiError(e)); setCompanies([]); }
  }, [page, status]);

  useEffect(() => { load(1); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const back = () => { setView('list'); setSelected(null); setEditing(null); load(1); };
  const openDetail = (c) => { setSelected(c); setView('detail'); };
  const openEdit = (c) => { setEditing(c); setView('edit'); };
  const openCreate = () => setView('create');

  if (view === 'create') return <CompanyForm onDone={back} onCancel={back} />;
  if (view === 'edit' && editing) return <CompanyForm company={editing} onDone={back} onCancel={back} />;
  if (view === 'detail' && selected) return <CompanyDetail company={selected} onBack={back} onEdit={openEdit} />;
  if (!companies) return <p className="py-12 text-center text-slate-500">{error || 'Loading…'}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide uppercase mb-1"> Partner Directory</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Verify, review, and manage registered industry partner accounts</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:-translate-y-0.5 text-sm cursor-pointer">
          <span>+ Add Company</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl w-fit border border-gray-200/60 dark:border-gray-700/60">
        {STATUS_FILTERS.map(([s, label]) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${status === s ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {error && <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm font-semibold">{error}</div>}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
                <th className="px-6 py-4">Company Details</th><th className="px-6 py-4">Contact Person</th><th className="px-6 py-4">Rating</th><th className="px-6 py-4">Verification</th><th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {companies.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">No companies found</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">There are no companies matching the selected filter.</p>
                </td></tr>
              ) : companies.map((c) => {
                const avg = c.ratings_avg_average_rating || 0;
                return (
                  <tr key={c.id} className={`hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors ${!c.user?.is_active ? 'opacity-60 bg-gray-50/40 dark:bg-gray-900/40' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm mt-0.5">{(c.company_name || '?').charAt(0).toUpperCase()}</div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white leading-snug">{c.company_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.industry || 'General Industry'}</p>
                          {c.rejection_reason && (
                            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200/50 dark:border-rose-800/50">⚠ Reason: {c.rejection_reason}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white text-xs">{c.contact_person || '—'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.user?.email}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {avg > 0 ? <StarRow avg={avg} /> : <span className="text-gray-400 text-xs italic">No ratings</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusCls[c.verification_status] || statusCls.pending}`}>{c.verification_status}</span>
                        {!c.user?.is_active && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 ring-1 ring-rose-600/20">Deactivated</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right align-top whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                        <button onClick={() => openDetail(c)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"> Details</button>
                        <button onClick={() => openEdit(c)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors cursor-pointer">✎ Edit</button>
                        {c.verification_status === 'pending' && (
                          <button onClick={async () => { await api.patch(`/admin/companies/${c.id}/verification`, { status: 'verified' }); load(1); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-all cursor-pointer">✓ Approve</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {lastPage > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer">← Prev</button>
          <span className="text-sm text-gray-500">Page {page} of {lastPage}</span>
          <button disabled={page >= lastPage} onClick={() => load(page + 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer">Next →</button>
        </div>
      )}
    </div>
  );
}
