import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { apiError } from '../ui';
import { useAuth } from '../../context/AuthContext';
import ChangePasswordModal from '../ChangePasswordModal';

const inputCls = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5';

export default function ProfilePanel() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [securityMessage, setSecurityMessage] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  useEffect(() => {
    api.get('/coordinator/profile')
      .then((res) => {
        const p = res.data.data || {};
        setProfile(p);
        setForm({
          first_name: p.first_name || '', last_name: p.last_name || '', middle_name: p.middle_name || '',
          employee_id: p.employee_id || '', department: p.department || '', phone_number: p.phone_number || '',
        });
      })
      .catch((e) => setError(apiError(e)));
  }, []);

  if (!form) return <p className="py-12 text-center text-slate-500">{error || 'Loading…'}</p>;
  const set = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const res = await api.put('/coordinator/profile', form);
      const savedProfile = res.data.data || {};
      const fullName = [savedProfile.first_name, savedProfile.middle_name, savedProfile.last_name]
        .filter(Boolean)
        .join(' ');
      updateUser({ name: fullName });
      setProfile(savedProfile);
      setMessage('Profile updated successfully.');
    } catch (err) { setError(apiError(err)); }
    finally { setSaving(false); }
  };

  const submitEmail = async (e) => {
    e.preventDefault();
    setEmailSaving(true); setSecurityError(''); setSecurityMessage('');
    try {
      const res = await api.post('/auth/change-email', { email, current_password: currentPassword });
      const updatedEmail = res.data.data?.email || email;
      setEmail(updatedEmail);
      setCurrentPassword('');
      updateUser({ email: updatedEmail });
      setSecurityMessage('Sign-in email updated successfully.');
    } catch (err) { setSecurityError(apiError(err, 'Could not update sign-in email.')); }
    finally { setEmailSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Coordinator Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Update your administrative coordinator credentials and contact information</p>
      </div>

      {(message || error) && <div className={`rounded-xl border p-4 text-sm font-semibold ${message ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'}`}>{message || error}</div>}

      <form onSubmit={submit} className="space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 space-y-5">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">▦ Personal & Department Information</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Information used in correspondence with students and host companies</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>First Name <span className="text-rose-500">*</span></label>
              <input required value={form.first_name} onChange={(e) => set('first_name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Last Name <span className="text-rose-500">*</span></label>
              <input required value={form.last_name} onChange={(e) => set('last_name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Middle Name</label>
              <input value={form.middle_name} onChange={(e) => set('middle_name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Employee ID Number</label>
              <input value={form.employee_id} onChange={(e) => set('employee_id', e.target.value)} placeholder="e.g. EMP-2024-001" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Contact Phone Number</label>
              <input value={form.phone_number} onChange={(e) => set('phone_number', e.target.value)} placeholder="+63 912 345 6789" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Academic Department / College</label>
              <input value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="e.g. College of Information and Communications Technology" className={inputCls} />
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:-translate-y-0.5 text-sm cursor-pointer disabled:opacity-60">
            <span>✓</span> {saving ? 'Saving…' : 'Save Profile Settings'}
          </button>
        </div>
      </form>
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 space-y-5">
        <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sign-in & Security</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use a personal email and a unique, strong password for your account.</p>
        </div>
        {(securityMessage || securityError) && <div className={`rounded-xl border p-3 text-sm font-semibold ${securityMessage ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'}`}>{securityMessage || securityError}</div>}
        <form onSubmit={submitEmail} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <div>
            <label className={labelCls}>Sign-in Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} autoComplete="email" />
          </div>
          <div>
            <label className={labelCls}>Current Password</label>
            <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} autoComplete="current-password" />
          </div>
          <button type="submit" disabled={emailSaving} className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold disabled:opacity-60">{emailSaving ? 'Saving…' : 'Update Email'}</button>
        </form>
        <div className="flex items-center justify-between gap-4 border-t border-gray-100 dark:border-gray-800 pt-5">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Password</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Change it regularly and do not reuse another account’s password.</p>
          </div>
          <button type="button" onClick={() => setPasswordModalOpen(true)} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">Change Password</button>
        </div>
      </section>
      {passwordModalOpen && <ChangePasswordModal onClose={() => setPasswordModalOpen(false)} />}
    </div>
  );
}
