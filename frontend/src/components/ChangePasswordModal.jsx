import React, { useState } from 'react';
import api from '../api/client';
import { Field, inputCls, btnPrimary, btnGhost, Notice, apiError } from './ui';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ChangePasswordModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const requiresCurrentPassword = user?.auth_provider !== 'google';
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    try {
      await api.post('/auth/change-password', form);
      setNotice({ message: 'Password changed successfully.' });
      setForm({ current_password: '', password: '', password_confirmation: '' });
      updateUser({ password_change_required: false, must_change_password: false, password_changed_at: new Date().toISOString() });
    } catch (err) {
      setNotice({ error: apiError(err, 'Failed to change password.') });
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => onClose?.();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-sm w-full dark:text-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Change Password</h3>
          <button onClick={cancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer dark:text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Notice message={notice?.message} error={notice?.error} />
          {requiresCurrentPassword && <Field label="Current Password">
            <input type="password" required value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })} className={inputCls} />
          </Field>}
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
      </div>
    </div>
  );
}
