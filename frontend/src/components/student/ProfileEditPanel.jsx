import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, Field, inputCls, btnPrimary, btnGhost, Notice, apiError } from '../ui';
import { OJT_PROGRAMS } from '../../constants/ojtPrograms';
import { OJT_SECTIONS } from '../../constants/ojtSections';

const fields = [
  ['first_name', 'First Name', true],
  ['middle_name', 'Middle Name', false],
  ['last_name', 'Last Name', true],
  ['student_id_number', 'Student ID Number', false],
  ['year_level', 'Year Level', false],
  ['section', 'Section', false],
  ['phone_number', 'Phone Number', false],
  ['address', 'Address', false],
  ['career_interests', 'Career Interests', false],
];

export default function ProfileEditPanel({ onSaved }) {
  const [form, setForm] = useState(null);
  const [bio, setBio] = useState('');
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/profile/student').then((res) => {
      const p = res.data.data || {};
      setForm(Object.fromEntries(fields.map(([k]) => [k, p[k] || ''])));
      setBio(p.bio || '');
    }).catch(() => setForm({}));
  }, []);

  if (!form) return null;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    try {
      await api.put('/profile/student', { ...form, bio });
      setNotice({ message: 'Profile updated successfully.' });
      onSaved?.();
    } catch (err) {
      setNotice({ error: apiError(err, 'Failed to update profile.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Edit Profile</h3>
      <p className="text-xs text-gray-500 mb-4">Update your academic and contact information.</p>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Notice message={notice?.message} error={notice?.error} />
        <Field label="OJT Program" htmlFor="profile-course">
          <select id="profile-course" required value={form.course || ''} onChange={(e) => setForm({ ...form, course: e.target.value, program: e.target.value })} className={inputCls}>
            <option value="">Select your OJT program</option>
            {OJT_PROGRAMS.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
          </select>
        </Field>
        {fields.map(([key, label, required]) => (
          <Field key={key} label={label} htmlFor={`profile-${key}`}>
            {key === 'section' ? (
              <select id={`profile-${key}`} required={required} value={form[key] || ''}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={inputCls}>
                <option value="">Select section</option>
                {OJT_SECTIONS.map((section) => <option key={section} value={section}>{section}</option>)}
              </select>
            ) : (
              <input id={`profile-${key}`} required={required} value={form[key] || ''}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={inputCls} />
            )}
          </Field>
        ))}
        <div className="sm:col-span-2">
          <Field label="Bio" htmlFor="profile-bio">
            <textarea id="profile-bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="sm:col-span-2 flex gap-2">
          <button type="submit" disabled={loading} className={btnPrimary}>{loading ? 'Saving…' : 'Save Profile'}</button>
        </div>
      </form>
    </Card>
  );
}
