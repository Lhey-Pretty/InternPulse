import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import api, { downloadFile } from '../../api/client';
import { apiError, Pager, useDebounced } from '../ui';
import { OJT_PROGRAMS, OJT_PROGRAM_LABELS } from '../../constants/ojtPrograms';

const ROLES = ['student', 'company', 'coordinator', 'admin'];
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const roleCls = {
  student: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-blue-600/20',
  company: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-1 ring-emerald-600/20',
  coordinator: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-1 ring-emerald-600/20',
  admin: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 ring-1 ring-rose-600/20',
};
const inputCls = 'w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5';
const thCls = 'px-6 py-4';
const tdCls = 'px-6 py-4';
const theadCls = 'border-b border-gray-100 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400';

function UserForm({ user, onDone, onCancel, currentUserId }) {
  const isEdit = !!user;
  const isPlaceholder = !!(user?.coordinator_profile?.is_placeholder || user?.coordinatorProfile?.is_placeholder);
  const [form, setForm] = useState({
    name: user?.name || '', email: user?.email || '', password: '',
    role: user?.role || 'student', program: user?.coordinator_profile?.program || user?.coordinatorProfile?.program || '', is_active: user ? (user.is_active ? '1' : '0') : '1',
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name || name.length > 255) {
      setError('Enter a name between 1 and 255 characters.');
      return;
    }
    if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address with no more than 255 characters.');
      return;
    }
    if ((!isEdit || form.password || (isPlaceholder && form.is_active === '1')) && (form.password.length < 8 || form.password.length > 255)) {
      setError('Password must be between 8 and 255 characters.');
      return;
    }
    if (isPlaceholder && form.is_active === '1' && (!form.password || form.name.toLowerCase().startsWith('unassigned ') || form.email.toLowerCase().endsWith('.invalid'))) {
      setError('Replace the placeholder name and email, and set an initial password before activating this coordinator account.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/admin/users/${user.id}`, {
          name, email, role: form.role,
          ...(form.role === 'coordinator' ? { program: form.program } : {}),
          is_active: form.is_active === '1',
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        await api.post('/admin/users', { name, email, password: form.password, role: form.role, ...(form.role === 'coordinator' ? { program: form.program } : {}) });
      }
      onDone();
    } catch (err) { setError(apiError(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <button onClick={onCancel} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>
      <div>
        {isEdit && <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-semibold tracking-wide uppercase mb-1">✎ Account Settings</div>}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? `Edit User: ${user.name}` : 'Create New User'}</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{isEdit ? 'Update profile details, role assignment, active status, or reset credentials.' : 'Directly provision an account with defined system role and credentials.'}</p>
      </div>
      {error && <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm font-semibold">{error}</div>}
      {isPlaceholder && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">This is a reserved program coordinator account. Enter the assigned coordinator’s name, real email, and initial password before activating it.</div>}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-7">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelCls}>Full Name *</label>
            <input required minLength={1} maxLength={255} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Maria Santos" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email Address *</label>
            <input required type="email" maxLength={255} autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@institution.edu.ph" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{isEdit && !isPlaceholder ? <>New Password <span className="text-gray-400 font-normal lowercase">(leave blank to keep current password)</span></> : 'Initial Password *'}</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} minLength={8} maxLength={255} autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder={isEdit && !isPlaceholder ? 'Enter new password to reset...' : 'Set an initial password'} required={!isEdit || (isPlaceholder && form.is_active === '1')} className={`${inputCls} pr-11`} />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-emerald-600 cursor-pointer">
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Assigned System Role *</label>
            <select required value={form.role} onChange={(e) => set('role', e.target.value)} className={inputCls}>
              {ROLES.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          {form.role === 'coordinator' && (
            <div>
              <label className={labelCls}>Assigned OJT Program *</label>
              <select required value={form.program} onChange={(e) => set('program', e.target.value)} className={inputCls}>
                <option value="">Select the coordinator's program</option>
                {OJT_PROGRAMS.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
              </select>
              <p className="mt-1.5 text-xs text-gray-500">Each OJT program can have one assigned coordinator account. Coordinators can still view all students.</p>
            </div>
          )}
          {isEdit && (
            <div>
              <label className={labelCls}>Account Status *</label>
              <select value={form.is_active} onChange={(e) => set('is_active', e.target.value)} className={inputCls}>
                <option value="1">Active (Enabled)</option>
                <option value="0">Inactive (Deactivated)</option>
              </select>
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
            <button type="button" onClick={onCancel} className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPanel({ currentUserId, onChanged }) {
  const [users, setUsers] = useState(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [inactiveOnly, setInactiveOnly] = useState(false);
  const debouncedSearch = useDebounced(search);
  const applied = useMemo(() => ({ search: debouncedSearch, role, inactiveOnly }), [debouncedSearch, role, inactiveOnly]);
  const [view, setView] = useState('list'); // list | create | edit
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async (p = 1, f = applied) => {
    try {
      const res = await api.get('/admin/users', {
        params: { page: p, ...(f.search ? { search: f.search } : {}), ...(f.role ? { role: f.role } : {}), ...(f.inactiveOnly ? { inactive_only: 1 } : {}) },
      });
      const d = res.data.data;
      setUsers(d.data || d || []);
      setTotal(d.total ?? (d.data || d || []).length);
      setPage(d.current_page || p);
      setLastPage(d.last_page || 1);
    } catch (e) { setError(apiError(e)); setUsers([]); }
  }, [applied]);

  useEffect(() => { load(1); }, [applied, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = async () => { await load(page); onChanged?.(); };

  const toggleActive = async (u) => {
    try {
      await api.patch(`/admin/users/${u.id}`, { name: u.name, email: u.email, role: u.role, is_active: !u.is_active });
      await refresh();
    } catch (e) { setError(apiError(e)); }
  };

  const remove = async (u) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${u.name}?`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      await refresh();
    } catch (e) { setError(apiError(e)); }
  };

  const exportCsv = async () => {
    try {
      await downloadFile('/admin/users/export', {
        params: { ...(applied.search ? { search: applied.search } : {}), ...(applied.role ? { role: applied.role } : {}) },
        filename: 'internpulse-users.csv',
      });
    } catch (e) { setError(apiError(e)); }
  };

  if (view === 'create') return <UserForm onDone={() => { setView('list'); refresh(); }} onCancel={() => setView('list')} currentUserId={currentUserId} />;
  if (view === 'edit' && editing) return <UserForm user={editing} onDone={() => { setView('list'); refresh(); }} onCancel={() => { setView('list'); setEditing(null); }} currentUserId={currentUserId} />;
  if (!users) return <p className="py-12 text-center text-slate-500">{error || 'Loading…'}</p>;

  const hasFilters = applied.search || applied.role || applied.inactiveOnly;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide uppercase mb-1"> Identity & Access</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Accounts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage students, company admins, coordinators, and system administrators</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCsv} className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all duration-200 text-sm cursor-pointer">
            <span>⬇ Export CSV</span>
          </button>
          <button onClick={() => setView('create')} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:-translate-y-0.5 text-sm cursor-pointer">
            <span>+ Add User</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[220px]">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all" />
            </div>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3.5 py-2 focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all">
              <option value="">All Roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
            </select>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer select-none px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <input type="checkbox" checked={inactiveOnly} onChange={(e) => setInactiveOnly(e.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
              <span>Inactive only</span>
            </label>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasFilters && <button type="button" onClick={() => { setSearch(''); setRole(''); setInactiveOnly(false); }} className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer">Reset</button>}
          </div>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm font-semibold">{error}</div>}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={theadCls}>
                <th className={thCls}>User</th><th className={thCls}>Role</th><th className={thCls}>Status</th><th className={thCls}>Date Joined</th><th className={`${thCls} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {users.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">No users found</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Try adjusting your filters or search keywords.</p>
                </td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className={`hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors ${!u.is_active ? 'opacity-65' : ''}`}>
                  <td className={tdCls}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center text-sm shadow-sm ring-2 ring-white dark:ring-gray-800">{(u.name || '?').charAt(0).toUpperCase()}</div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white leading-tight flex items-center gap-2">
                          <span>{u.name}</span>
                          {u.id === currentUserId && <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded font-semibold">You</span>}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`${tdCls} whitespace-nowrap`}>
                    <div className="flex flex-col items-start gap-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${roleCls[u.role] || roleCls.student}`}>{u.role}</span>
                      {u.role === 'coordinator' && (u.coordinator_profile?.program || u.coordinatorProfile?.program) && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{OJT_PROGRAM_LABELS[u.coordinator_profile?.program || u.coordinatorProfile?.program] || (u.coordinator_profile?.program || u.coordinatorProfile?.program)}</span>
                      )}
                      {u.role === 'coordinator' && (u.coordinator_profile?.is_placeholder || u.coordinatorProfile?.is_placeholder) && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">Unassigned account</span>
                      )}
                      {u.role === 'coordinator' && !(u.coordinator_profile?.program || u.coordinatorProfile?.program) && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">Program not assigned</span>
                      )}
                    </div>
                  </td>
                  <td className={`${tdCls} whitespace-nowrap`}>
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Active</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Inactive</span>
                    )}
                  </td>
                  <td className={`${tdCls} whitespace-nowrap text-xs text-gray-500 dark:text-gray-400`}>{fmt(u.created_at)}</td>
                  <td className={`${tdCls} whitespace-nowrap text-right`}>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditing(u); setView('edit'); }} className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer">Edit</button>
                      {u.id !== currentUserId && (
                        <>
                          <button onClick={() => (u.coordinator_profile?.is_placeholder || u.coordinatorProfile?.is_placeholder) ? (setEditing(u), setView('edit')) : toggleActive(u)} className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${u.is_active ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40' : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'}`}>
                            {(u.coordinator_profile?.is_placeholder || u.coordinatorProfile?.is_placeholder) ? 'Set up' : u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => remove(u)} className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer">Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pager page={page} lastPage={lastPage} total={total} onChange={(p) => load(p)} noun="users" />
    </div>
  );
}
