import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { apiError } from '../ui';

export default function SettingsPanel() {
  const [groups, setGroups] = useState(null);
  const [values, setValues] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/settings')
      .then((res) => {
        const list = res.data.data || [];
        const grouped = {};
        const vals = {};
        list.forEach((s) => {
          (grouped[s.group || 'general'] = grouped[s.group || 'general'] || []).push(s);
          vals[s.key] = s.value;
        });
        setGroups(grouped);
        setValues(vals);
      })
      .catch((e) => setError(apiError(e)));
  }, []);

  if (!groups) return <p className="py-12 text-center text-slate-500">{error || 'Loading…'}</p>;
  const groupKeys = Object.keys(groups);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      await api.put('/admin/settings', { settings: values });
      setMessage('Settings saved successfully.');
    } catch (err) { setError(apiError(err)); }
    finally { setSaving(false); }
  };

  const inputBase = 'w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide uppercase mb-1">⚙️ System Configuration</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Global Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Customize platform configuration, academic year defaults, notification rules, and operational thresholds</p>
      </div>

      {(message || error) && <div className={`rounded-xl border p-4 text-sm font-semibold ${message ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'}`}>{message || error}</div>}

      <form onSubmit={submit} className="space-y-6">
        {groupKeys.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">No settings configured yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Default platform settings will be loaded via the database seeder.</p>
          </div>
        ) : groupKeys.map((group) => (
          <div key={group} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-7 space-y-5">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white capitalize flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">▦</span>
                  {group.replace(/_/g, ' ')} Settings
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Parameters relating to {group.replace(/_/g, ' ')} operations.</p>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{groups[group].length} items</span>
            </div>
            <div className="space-y-4 pt-1">
              {groups[group].map((setting) => (
                <div key={setting.key}>
                  <label className={labelCls}>{setting.label || setting.key}</label>
                  {setting.key === 'login_max_attempts' && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Failed password attempts allowed before sign-in is temporarily locked. Choose 1 to 20 attempts.</p>}
                  {setting.key === 'login_cooldown_minutes' && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">How long a locked account must wait before another sign-in attempt. Choose 1 to 10,080 minutes.</p>}
                  {setting.key === 'password_expiry_days' && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Require password users to change their password after this many days. Set 0 to disable expiration.</p>}
                  {setting.key === 'google_auth_enabled' && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Requires GOOGLE_CLIENT_ID in backend/.env. Google sign-in is only for existing accounts with a matching verified email.</p>}
                  {setting.key === 'password_auth_enabled' && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Enable single-factor email and password sign-in.</p>}
                  {setting.type === 'textarea' ? (
                    <textarea rows={3} value={values[setting.key] ?? ''} onChange={(e) => setValues({ ...values, [setting.key]: e.target.value })} className={inputBase} />
                  ) : setting.type === 'boolean' ? (
                    <select value={values[setting.key] ?? '0'} onChange={(e) => setValues({ ...values, [setting.key]: e.target.value })} className={inputBase}>
                      <option value="1">Enabled</option>
                      <option value="0">Disabled</option>
                    </select>
                  ) : (
                    <input type={setting.type === 'number' ? 'number' : 'text'} min={setting.key === 'password_expiry_days' ? 0 : setting.key === 'login_max_attempts' || setting.key === 'login_cooldown_minutes' ? 1 : undefined} max={setting.key === 'password_expiry_days' ? 3650 : setting.key === 'login_max_attempts' ? 20 : setting.key === 'login_cooldown_minutes' ? 10080 : undefined} value={values[setting.key] ?? ''} onChange={(e) => setValues({ ...values, [setting.key]: e.target.value })} className={inputBase} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {groupKeys.length > 0 && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="submit" disabled={saving} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
