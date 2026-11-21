import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Notice, apiError } from '../ui';

const inputCls = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:placeholder-gray-400';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5';
const cardCls = 'bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 space-y-5 dark:text-gray-100';
const h2Cls = 'text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2';

export default function ProfilePanel() {
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState(null);
  const [logo, setLogo] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/profile/company')
      .then((res) => {
        const c = res.data.data;
        setCompany(c);
        setForm({
          company_name: c.company_name || '', industry: c.industry || '', website: c.website || '',
          facebook_page: c.facebook_page || '', address: c.address || '', city: c.city || '',
          province: c.province || '', description: c.description || '', contact_person: c.contact_person || '',
          contact_phone: c.contact_phone || '', contact_email: c.contact_email || '',
        });
      })
      .catch((e) => setError(apiError(e)));
  }, []);

  if (!form) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">{error || 'Loading…'}</p>;

  const set = (k, v) => setForm({ ...form, [k]: v });
  const logoUrl = company?.logo_path ? `/storage/${company.logo_path}` : null;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
      if (logo) fd.append('logo', logo);
      await api.put('/profile/company', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage('Company profile saved successfully.');
      setLogo(null);
      const res = await api.get('/profile/company');
      setCompany(res.data.data);
    } catch (err) { setError(apiError(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Company Profile & Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your public employer profile, location, and coordinator contact details</p>
      </div>

      <Notice message={message} error={error} />

      <form onSubmit={submit} className="space-y-6">
        <div className={cardCls}>
          <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
            <h2 className={h2Cls}>▦ General Company Details</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Information displayed on your internship vacancy postings</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className={labelCls}>Company Name <span className="text-rose-500 dark:text-rose-400">*</span></label>
              <input required value={form.company_name} onChange={(e) => set('company_name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Industry Sector <span className="text-rose-500 dark:text-rose-400">*</span></label>
              <input required value={form.industry} onChange={(e) => set('industry', e.target.value)} placeholder="e.g. Information Technology & Services" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Official Website <span className="text-rose-500 dark:text-rose-400">*</span></label>
              <input type="url" required value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://company.example.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Facebook Page <span className="text-gray-400 lowercase font-normal dark:text-gray-400">(optional)</span></label>
              <input type="url" value={form.facebook_page} onChange={(e) => set('facebook_page', e.target.value)} placeholder="https://facebook.com/your-company" className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Full Office Address <span className="text-rose-500 dark:text-rose-400">*</span></label>
              <input required value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Building, Street, Barangay" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>City / Municipality <span className="text-rose-500 dark:text-rose-400">*</span></label>
              <input required value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Bongabong or Calapan City" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Province / State <span className="text-rose-500 dark:text-rose-400">*</span></label>
              <input required value={form.province} onChange={(e) => set('province', e.target.value)} placeholder="e.g. Oriental Mindoro" className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>About the Company / Overview</label>
              <textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Brief overview of the company, mission, work culture..." className={`${inputCls} py-3`} />
            </div>
          </div>
        </div>

        <div className={cardCls}>
          <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
            <h2 className={h2Cls}>▦ Liaison & Brand Asset</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">HR contact and company visual logo</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Primary Contact Person</label>
              <input value={form.contact_person} onChange={(e) => set('contact_person', e.target.value)} placeholder="e.g. Maria Santos (HR Manager)" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Contact Phone / Mobile</label>
              <input value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} placeholder="+63 912 345 6789" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Contact Email Address</label>
              <input type="email" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} placeholder="careers@company.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Upload Company Logo</label>
              {(logoUrl || logo) && (
                <img src={logo ? URL.createObjectURL(logo) : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || ''}${logoUrl}`} alt="logo" className="w-16 h-16 object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1 mb-2 dark:text-gray-100" />
              )}
              <input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] || null)} className="w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950/60 dark:file:text-emerald-300 hover:file:bg-emerald-100 transition-all dark:text-gray-400" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:-translate-y-0.5 text-sm cursor-pointer disabled:opacity-60 dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800 dark:hover:to-emerald-800">
            <span>✓</span> {saving ? 'Saving…' : 'Save Company Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
