import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import api from '../../api/client';
import { apiError, useDebounced } from '../ui';
import { OJT_PROGRAMS } from '../../constants/ojtPrograms';
import { useAuth } from '../../context/AuthContext';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtFull = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';
const isToday = (d) => d && d.slice(0, 10) === new Date().toISOString().slice(0, 10);
const studentName = (s) => s?.user?.name || s?.full_name || `${s?.first_name || ''} ${s?.last_name || ''}`.trim() || 'Student';
const postingOf = (e) => e.internship_placement?.internship_posting || e.internship_placement?.internshipPosting || e.internshipPlacement?.internship_posting || e.internshipPlacement?.internshipPosting || {};
const companyOf = (e) => postingOf(e).company_profile || postingOf(e).companyProfile || {};
const nlpOf = (e) => {
  const n = e.nlp_analysis || e.nlpAnalysis || {};
  return { is_course_related: n.is_course_related ?? true, flag_level: n.flag_level || 'Normal', confidence_score: n.confidence_score ?? 0.8 };
};

const inputCls = 'block w-full min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:bg-gray-900';
const labelCls = 'mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400';
const thCls = 'px-4 py-3.5';
const tdCls = 'px-4 py-3.5';
const theadCls = 'border-b border-gray-100 bg-gray-50/75 text-xs font-bold uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400';

function FlagBadge({ entry }) {
  const nlp = nlpOf(entry);
  const flag = (nlp.flag_level || '').toLowerCase();
  let cls = 'border-rose-200 bg-rose-100 text-rose-800', label = 'Unrelated';
  if (flag.includes('warning') || flag.includes('errand')) { cls = 'border-amber-200 bg-amber-100 text-amber-800'; label = 'Errand Flagged'; }
  else if (nlp.is_course_related) { cls = 'border-emerald-200 bg-emerald-100 text-emerald-800'; label = 'Course-Related'; }
  return (
    <div>
      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${cls}`}> {label}</span>
      <div className="mt-1 text-[11px] text-gray-400">Score: {Math.round((nlp.confidence_score || 0) * 100)}%</div>
    </div>
  );
}

function JournalDetail({ id, onBack }) {
  const [entry, setEntry] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/coordinator/journals/${id}`).then((res) => {
      const e = res.data.data;
      setEntry(e);
      setRemarks(e.supervisor_remarks || '');
    }).catch((e) => setError(apiError(e)));
  }, [id]);

  if (!entry) return <p className="py-12 text-center text-sm text-gray-500">{error || 'Loading…'}</p>;

  const student = entry.student_profile || entry.studentProfile || {};
  const posting = postingOf(entry);
  const company = companyOf(entry);
  const editable = isToday(entry.entry_date);

  const save = async () => {
    setError(''); setMessage('');
    try {
      await api.patch(`/coordinator/journals/${entry.id}/remarks`, { supervisor_remarks: remarks });
      setMessage('Coordinator remarks saved.');
      setEntry((prev) => ({ ...prev, supervisor_remarks: remarks, is_verified: true }));
    } catch (e) { setError(apiError(e)); }
  };

  return (
    <div>
      <div className="mb-6">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition mb-3 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Journal Monitoring
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">{entry.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Submitted by <strong className="text-gray-800 dark:text-gray-200">{studentName(student)}</strong>
              {' '}({student.course || 'N/A'}) on {fmtFull(entry.entry_date)}
            </p>
          </div>
          {entry.is_verified && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 self-start sm:self-auto">✓ Reviewed by Coordinator</span>
          )}
        </div>
      </div>

      {message && <div className="p-4 mb-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold">{message}</div>}
      {error && <div className="p-4 mb-6 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm font-semibold">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Reported Activities & Tasks</h2>
            <div className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-line bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-100 dark:border-gray-700">{entry.content}</div>
            {entry.reflection && (
              <>
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-6 mb-3">Student Confidential Reflection & Challenges</h2>
                <div className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-line bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800/60">{entry.reflection}</div>
              </>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">Coordinator Academic Notes & Counseling Remarks</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Add notes or advisories for the student. If errands are detected, record your counseling intervention here.</p>
            {editable ? (
              <>
                <textarea rows={4} required value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={1000}
                  placeholder="Type feedback, guidance, or counseling remarks for the intern..."
                  className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                <div className="flex justify-end mt-4">
                  <button onClick={save} disabled={!remarks.trim()} className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition cursor-pointer">
                    {entry.supervisor_remarks ? 'Update Coordinator Remarks' : 'Save Coordinator Remarks'}
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">This journal is read-only. Coordinator remarks can only be edited on the journal entry date.</p>
                {entry.supervisor_remarks
                  ? <p className="mt-3 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">{entry.supervisor_remarks}</p>
                  : <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No coordinator remarks were saved.</p>}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm text-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Host Establishment</h3>
            <div className="space-y-2 text-gray-700 dark:text-gray-300">
              <div><span className="text-gray-400 text-xs block">Company:</span><span className="font-bold text-gray-900 dark:text-white">{company.company_name || 'N/A'}</span></div>
              <div><span className="text-gray-400 text-xs block">Role/Posting:</span><span className="font-medium text-gray-800 dark:text-gray-200">{posting.title || 'Intern'}</span></div>
              {entry.mood && <div><span className="text-gray-400 dark:text-gray-500 text-xs block">Student Mood:</span><span className="capitalize font-semibold text-emerald-700 dark:text-emerald-400">{entry.mood}</span></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JournalsPanel() {
  const { user } = useAuth();
  const [students, setStudents] = useState(null);
  const [student, setStudent] = useState(null);
  const [entries, setEntries] = useState(null);
  const [entriesPage, setEntriesPage] = useState({ page: 1, lastPage: 1 });
  const [detailId, setDetailId] = useState(null);
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('');
  const [serverAssignedProgram, setServerAssignedProgram] = useState('');
  const assignedProgram = user?.role === 'coordinator'
    ? (user?.coordinator_profile?.program || user?.coordinatorProfile?.program || serverAssignedProgram)
    : '';
  const assignedProgramLabel = OJT_PROGRAMS.find(({ code }) => code === assignedProgram)?.label || assignedProgram;
  const debouncedSearch = useDebounced(search);
  const applied = useMemo(() => ({ search: debouncedSearch, course }), [debouncedSearch, course]);
  const [error, setError] = useState('');

  const loadStudents = useCallback(async () => {
    try {
      const res = await api.get('/coordinator/journals');
      setStudents(res.data.data?.students || []);
      setServerAssignedProgram(res.data.data?.assigned_program || '');
    } catch (e) { setError(apiError(e)); }
  }, []);

  const loadEntries = useCallback(async (stu, p = 1, filters = applied) => {
    setEntries(null);
    try {
      const res = await api.get('/coordinator/journals', {
        params: { student_id: stu.id, ...(filters.search ? { search: filters.search } : {}), ...(filters.course ? { course: filters.course } : {}), page: p },
      });
      const d = res.data.data?.entries;
      setEntries(d?.data || d || []);
      setEntriesPage({ page: d?.current_page || p, lastPage: d?.last_page || 1 });
    } catch (e) { setError(apiError(e)); }
  }, [applied]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  // Re-filter the selected student's entries as the filters change.
  useEffect(() => { if (student) loadEntries(student, 1); }, [loadEntries]); // eslint-disable-line react-hooks/exhaustive-deps

  if (detailId) return <JournalDetail id={detailId} onBack={() => setDetailId(null)} />;

  return (
    <div>
      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"> Confidential Academic Records</span>
        <h1 className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">Student Daily Journals & NLP Analysis</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select a student to view their journal entries and automated task alignment checks.</p>
      </div>

      <div className="mb-6 min-w-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
          {student && <input type="hidden" value={student.id} readOnly />}
          <div className="min-w-0">
            <label className={labelCls}>Search Keywords</label>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by student name or company..." className={inputCls} />
          </div>
          <div className="min-w-0">
            <label className={labelCls}>{assignedProgram ? 'Assigned Program' : 'Filter by Program'}</label>
            {assignedProgram ? (
              <div className={inputCls}>{assignedProgramLabel}</div>
            ) : (
              <select value={course} onChange={(e) => setCourse(e.target.value)} className={inputCls}>
                <option value="">All Programs</option>
                {OJT_PROGRAMS.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
              </select>
            )}
          </div>
          <div className="flex min-w-0 items-end gap-2">
            <button type="button" onClick={() => { setSearch(''); setCourse(''); }}
              className="shrink-0 rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 cursor-pointer">Reset</button>
          </div>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {student && (
        <div className="mb-4">
          <button onClick={() => { setStudent(null); setEntries(null); }} className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 cursor-pointer">
            <span>←</span> Back to students
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {student ? (
          entries === null ? (
            <div className="p-12 text-center text-sm text-gray-500">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">No journal entries found for this student.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                  <thead className={theadCls}>
                    <tr><th className={thCls}>Date & Activity Title</th><th className={thCls}>Company Partner</th><th className={thCls}>Task Alignment</th><th className={`${thCls} text-right`}>Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {entries.map((entry) => {
                      const company = companyOf(entry);
                      const posting = postingOf(entry);
                      return (
                        <tr key={entry.id} className="transition hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                          <td className={tdCls}>
                            <div className="font-semibold text-gray-900 dark:text-white">{entry.title}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(entry.entry_date)}</div>
                          </td>
                          <td className={tdCls}>
                            <div className="font-medium text-gray-800 dark:text-gray-200">{company.company_name || 'N/A'}</div>
                            <div className="text-xs text-gray-400">{posting.title || 'Intern'}</div>
                          </td>
                          <td className={tdCls}><FlagBadge entry={entry} /></td>
                          <td className={`${tdCls} text-right`}>
                            <button onClick={() => setDetailId(entry.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 cursor-pointer">
                              View & Review <span>›</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {entriesPage.lastPage > 1 && (
                <div className="flex items-center justify-center gap-2 border-t border-gray-100 p-4 dark:border-gray-800">
                  <button disabled={entriesPage.page <= 1} onClick={() => loadEntries(student, entriesPage.page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 disabled:opacity-40 cursor-pointer">← Prev</button>
                  <span className="text-xs text-gray-500">Page {entriesPage.page} of {entriesPage.lastPage}</span>
                  <button disabled={entriesPage.page >= entriesPage.lastPage} onClick={() => loadEntries(student, entriesPage.page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 disabled:opacity-40 cursor-pointer">Next →</button>
                </div>
              )}
            </>
          )
        ) : students === null ? (
          <div className="p-12 text-center text-sm text-gray-500">Loading…</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">No students with journal entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className={theadCls}>
                <tr><th className={thCls}>Student & Program</th><th className={thCls}>Journal Entries</th><th className={`${thCls} text-right`}>Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {students.map((s) => (
                  <tr key={s.id} className="transition hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                    <td className={`${tdCls} px-4 py-4`}>
                      <button onClick={() => { setStudent(s); setEntries(null); loadEntries(s, 1); }} className="font-bold text-gray-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-400 cursor-pointer">{studentName(s)}</button>
                      <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300 ml-2">{s.course}</span>
                    </td>
                    <td className={tdCls}>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">{s.journal_entries_count ?? s.journals_count ?? 0} {(s.journal_entries_count ?? s.journals_count ?? 0) === 1 ? 'journal' : 'journals'}</span>
                    </td>
                    <td className={`${tdCls} px-4 py-4 text-right`}>
                      <button onClick={() => { setStudent(s); setEntries(null); loadEntries(s, 1); }} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 cursor-pointer">
                        View Journals <span>›</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
