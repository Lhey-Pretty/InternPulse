import React, { useState } from 'react';
import api from '../api/client';
import { Field, inputCls, btnPrimary, btnGhost, Notice, apiError } from './ui';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ChangePasswordModal({ onClose, required = false }) {
  const { user, updateUser, logout } = useAuth();
  const requiresCurrentPassword = user?.auth_provider !== 'google';
  const [form, setForm] = useState({ current_password: '', email: user?.email || '', password: '', password_confirmation: '', code: '' });
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    try {
      if (required && user?.role === 'coordinator') {
        if (!form.code) throw new Error('Request an email verification code first.');
        await api.post('/auth/first-login-setup', form);
        setNotice({ message: 'Email verified and account setup completed.' });
      } else {
        await api.post('/auth/change-password', form);
        setNotice({ message: 'Password changed successfully.' });
      }
      setForm({ current_password: '', email: user?.email || '', password: '', password_confirmation: '', code: '' });
      updateUser({ email: form.email || user?.email, password_change_required: false, must_change_password: false, password_changed_at: new Date().toISOString() });
    } catch (err) {
      setNotice({ error: apiError(err, 'Failed to change password.') });
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationCode = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const { code, password, password_confirmation, ...request } = form;
      const response = await api.post('/auth/first-login-setup', request);
      setNotice({ message: response.data.message || 'Verification code sent. Check your new email.' });
    } catch (err) {
      setNotice({ error: apiError(err, 'Could not send verification code.') });
    } finally { setLoading(false); }
  };

  const cancel = async () => {
    if (required) {
      await logout();
      window.location.assign('/login');
      return;
    }
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-sm w-full dark:text-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Change Password</h3>
          {!required && <button onClick={cancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer dark:text-gray-400">
            <X className="w-5 h-5" />
          </button>}
        </div>
        <form onSubmit={submit} className="space-y-3">
          {required && <p className="text-sm text-amber-700 dark:text-amber-300">Your password must be changed before you can continue.</p>}
          <Notice message={notice?.message} error={notice?.error} />
          {required && user?.role === 'coordinator' && <Field label="New Email Address"><div className="flex gap-2"><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} /><button type="button" disabled={loading || !form.email || !form.current_password} onClick={sendVerificationCode} className="shrink-0 rounded-xl bg-emerald-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{loading ? 'Sending…' : 'Send Code'}</button></div></Field>}
          {requiresCurrentPassword && <Field label="Current Password">
            <input type="password" required value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })} className={inputCls} />
          </Field>}
          {required && user?.role === 'coordinator' && <Field label="Email Verification Code"><input inputMode="numeric" maxLength={6} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputCls} placeholder="Enter code after requesting it" /></Field>}
          <Field label="New Password">
            <input type="password" required minLength={8} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Confirm New Password">
            <input type="password" required value={form.password_confirmation}
              onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} className={inputCls} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? 'Saving…' : 'Update Password'}
            </button>
            <button type="button" onClick={cancel} className={btnGhost}>Cancel</button>
          </div>
        </form>
        {required && notice?.message && <button type="button" onClick={onClose} className={`${btnPrimary} w-full mt-3`}>Continue</button>}
      </div>
    </div>
  );
}
