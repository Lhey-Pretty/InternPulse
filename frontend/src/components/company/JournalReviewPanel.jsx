import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Check, ChevronDown } from 'lucide-react';
import api from '../../api/client';
import { apiError, Pager, pageMeta } from '../ui';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '';
const studentOf = (p) => p.student_profile || p.studentProfile || {};
const postingOf = (p) => p.internship_posting || p.internshipPosting || {};
const nameOf = (p) => studentOf(p).full_name || `${studentOf(p).first_name || ''} ${studentOf(p).last_name || ''}`.trim() || '—';
const initialOf = (p) => (studentOf(p).first_name || nameOf(p) || '?').charAt(0).toUpperCase();

const moodCls = {
  excellent: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  good: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  neutral: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  difficult: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  challenging: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
};

export default function JournalReviewPanel() {
  const [placements, setPlacements] = useState(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [open, setOpen] = useState({});
  const [remarks, setRemarks] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/company/journals', { params: { page } });
      const meta = pageMeta(res.data.data?.placements);
      const list = meta.items;
      setPlacements(list);
      setLastPage(meta.lastPage);
      setTotalRows(meta.total);
      const init = {};
      list.forEach((p) => {
        const entries = p.journal_entries || p.journalEntries || [];
        const unverified = entries.filter((e) => !e.is_verified).length;
        init[p.id] = unverified > 0;
        entries.forEach((e) => { remarks[e.id] = e.supervisor_remarks || ''; });
      });
      setOpen(init);
      setRemarks((prev) => ({ ...remarks, ...init && Object.fromEntries(list.flatMap((p) => (p.journal_entries || p.journalEntries || []).map((e) => [e.id, e.supervisor_remarks || '']))), ...prev }));
    } catch (e) { setError(apiError(e)); setPlacements([]); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  if (!placements) return <p className="py-12 text-center text-slate-500">{error || 'Loading…'}</p>;

  const verify = async (entry) => {
    setError(''); setMessage('');
    try {
      await api.patch(`/company/journals/${entry.id}`, { supervisor_remarks: remarks[entry.id] || null });
      setMessage('Journal entry reviewed.');
      await load();
    } catch (err) { setError(apiError(err)); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Daily Journal & Activity Review</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review your interns' daily learning logs and sign off with verified remarks.</p>
      </div>

      {(message || error) && <div className={`mb-5 rounded-xl border p-4 text-sm font-semibold ${message ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'}`}>{message || error}</div>}

      {placements.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm px-6 py-14 text-center">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No active interns found</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Interns will appear here once they have active placements.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {placements.map((p) => {
            const student = studentOf(p);
            const entries = p.journal_entries || p.journalEntries || [];
            const total = entries.length;
            const unverified = entries.filter((e) => !e.is_verified).length;
            const latest = entries[0];
            const isOpen = !!open[p.id];
            return (
              <div key={p.id} className={`rounded-2xl border ${unverified > 0 ? 'border-amber-200 dark:border-amber-800/60' : 'border-gray-100 dark:border-gray-800'} bg-white dark:bg-gray-900 shadow-sm overflow-hidden`}>
                <button onClick={() => setOpen({ ...open, [p.id]: !isOpen })} className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">{initialOf(p)}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900 dark:text-white">{nameOf(p)}</p>
                        {unverified > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>{unverified} unverified</span>
                        ) : total > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">All verified</span>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{student.student_id_number || 'No ID'} · {postingOf(p).title} · {total} {total === 1 ? 'entry' : 'entries'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {latest && <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">Latest: {fmtDate(latest.entry_date).split(',').slice(0, 2).join(',')}</span>}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                    {entries.length === 0 ? (
                      <div className="px-6 py-8 text-center"><p className="text-xs text-gray-400 dark:text-gray-500">No journal entries submitted yet.</p></div>
                    ) : entries.map((entry) => (
                      <div key={entry.id} className={`${!entry.is_verified ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''} px-6 py-5`}>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/60"><BookOpen className="w-4 h-4" /></span>
                            <div>
                              <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">{entry.title}</h4>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{fmtDate(entry.entry_date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {entry.is_verified ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-full">Verified</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 rounded-full">Unverified</span>
                            )}
                            {entry.mood && <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${moodCls[entry.mood] || moodCls.neutral}`}>{entry.mood}</span>}
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3 whitespace-pre-line">{entry.content}</div>
                        {entry.reflection && (
                          <div className="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100/70 dark:border-emerald-900/40 rounded-xl p-3 mb-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-1">Student Reflection</p>
                            <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">{entry.reflection}</p>
                          </div>
                        )}
                        <form onSubmit={(e) => { e.preventDefault(); verify(entry); }} className="flex flex-col sm:flex-row gap-2 items-end pt-3 border-t border-gray-100 dark:border-gray-800">
                          <div className="flex-1 w-full">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Supervisor Remarks</label>
                            <input type="text" value={remarks[entry.id] || ''} onChange={(e) => setRemarks({ ...remarks, [entry.id]: e.target.value })} placeholder="Add acknowledgement or feedback..." className="w-full px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
                          </div>
                          <button type="submit" className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold ${entry.is_verified ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} px-4 py-2.5 rounded-xl transition-colors shrink-0 cursor-pointer`}>
                            <Check className="w-3.5 h-3.5" /> {entry.is_verified ? 'Update Remarks' : 'Verify Entry'}
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Pager page={page} lastPage={lastPage} total={totalRows} onChange={setPage} noun="interns" className="mt-4" />
    </div>
  );
}
