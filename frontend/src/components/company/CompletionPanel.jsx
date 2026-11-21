import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import api from '../../api/client';
import { apiError, Pager, pageMeta } from '../ui';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const studentOf = (p) => p.student_profile || p.studentProfile || {};
const postingOf = (p) => p.internship_posting || p.internshipPosting || {};
const nameOf = (p) => studentOf(p).full_name || `${studentOf(p).first_name || ''} ${studentOf(p).last_name || ''}`.trim() || '—';
const initialOf = (p) => (studentOf(p).first_name || nameOf(p) || '?').charAt(0).toUpperCase();

const statusCls = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  completed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
};
const inputCls = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Builds the Certificate of Completion in the browser and opens the print
// dialog, so printing never depends on a server-rendered Blade page.
const printCertificate = (p) => {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) {
    alert('Please allow pop-ups for this site to print the certificate.');
    return;
  }

  const company = postingOf(p).company_profile || {};
  const location = [company.city, company.province].filter(Boolean).join(', ');
  const finished = p.completed_at || new Date().toISOString();
  const longDate = new Date(finished).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  win.document.write(`<!doctype html>
<html><head><meta charset="utf-8" /><title>Certificate of Completion - ${esc(nameOf(p))}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Georgia,'Times New Roman',serif;color:#111;margin:0;padding:40px;text-align:center}
  .frame{border:6px double #065f46;padding:52px 48px}
  h1{margin:0;font-size:26px;letter-spacing:3px;text-transform:uppercase;color:#065f46}
  h2{margin:8px 0 0;font-size:13px;font-weight:normal;letter-spacing:4px;text-transform:uppercase}
  .rule{width:120px;height:2px;background:#065f46;margin:22px auto 26px}
  body p{font-size:14px;line-height:1.9;margin:0 0 14px}
  .name{font-size:26px;font-weight:bold;margin:14px 0;letter-spacing:1px}
  .emphasis{font-weight:bold}
  .sign{display:flex;justify-content:space-between;gap:70px;margin-top:54px}
  .sign div{flex:1;border-top:1px solid #111;padding-top:6px;font-size:12px}
  .foot{margin-top:34px;font-size:11px;color:#444;letter-spacing:1px}
  @page{size:A4 landscape;margin:14mm}
</style></head>
<body>
  <div class="frame">
    <h1>Certificate of Completion</h1>
    <h2>On-the-Job Training Program</h2>
    <div class="rule"></div>
    <p>This is to certify that</p>
    <p class="name">${esc(nameOf(p))}</p>
    <p>${esc(studentOf(p).course || 'student')}${studentOf(p).student_id_number ? ` &middot; ${esc(studentOf(p).student_id_number)}` : ''}, has satisfactorily completed the required <span class="emphasis">${esc(p.required_hours ?? '—')} hours</span> of On-the-Job Training${company.company_name ? ` at <span class="emphasis">${esc(company.company_name)}</span>` : ''}${location ? `, ${esc(location)}` : ''}.</p>
    <p>Training period: <span class="emphasis">${fmt(p.start_date)} &ndash; ${fmt(p.end_date)}</span> &nbsp;&middot;&nbsp; Hours rendered: <span class="emphasis">${esc(p.rendered_hours ?? 0)}</span></p>
    <p>Issued this ${esc(longDate)} at Mindoro State University, Bongabong Campus.</p>
    <div class="sign">
      <div>OJT Coordinator</div>
      <div>Company Supervisor</div>
    </div>
    <div class="foot">MinSU InternPulse &middot; Mindoro State University</div>
  </div>
</body></html>`);

  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
};

function CompletionDetail({ placementId, onBack, onDone }) {
  const [p, setP] = useState(null);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/company/interns/${placementId}`)
      .then((res) => setP(res.data.data))
      .catch((e) => setError(apiError(e)));
  }, [placementId]);

  if (!p) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">{error || 'Loading…'}</p>;

  const evals = p.evaluations || [];
  const finalEval = evals.find((e) => (e.evaluation_period || 'final') === 'final');
  const tasks = p.tasks || [];
  const logs = p.attendance_logs || p.attendanceLogs || [];
  const weekly = p.weekly_logs || p.weeklyLogs || [];
  const journals = p.journal_entries || p.journalEntries || [];
  const required = p.required_hours || 0;

  const checks = [
    { label: 'Rendered OJT Hours', ok: (p.rendered_hours || 0) >= required, detail: `${p.rendered_hours || 0}/${required}h (${p.completion_percentage || 0}%)` },
    { label: 'OJT Completion Evaluation', ok: !!finalEval, detail: finalEval ? `${finalEval.overall_rating}/5.0` : 'Not submitted' },
    { label: 'Attendance Records', ok: logs.length > 0, detail: `${logs.length} logged daily logs` },
    { label: 'Assigned Tasks', ok: tasks.length > 0, detail: `${tasks.filter((t) => t.status === 'completed').length}/${tasks.length} completed tasks` },
    { label: 'Weekly Summary Logs', ok: weekly.filter((w) => w.status === 'submitted').length > 0, detail: `${weekly.filter((w) => w.status === 'submitted').length} submitted reports` },
    { label: 'Daily Learning Journals', ok: journals.length > 0, detail: `${journals.length} written entries` },
  ];

  const missing = checks.filter((c) => !c.ok).map((c) => c.label);

  const approve = async () => {
    if (!window.confirm(`Confirm that ${nameOf(p)} has completed their internship requirements?`)) return;
    setError(''); setMessage('');
    try {
      await api.patch(`/company/interns/${p.id}/completion`, { completion_notes: notes || null });
      setMessage('Internship completion approved.');
      setTimeout(onDone, 800);
    } catch (err) { setError(apiError(err)); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 mb-2 group cursor-pointer">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to completions list
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Review Completion Clearance</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Verify student requirements before officially closing the internship placement</p>
      </div>

      {(message || error) && <div className={`rounded-xl border p-4 text-sm font-semibold ${message ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'}`}>{message || error}</div>}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 space-y-6 dark:text-gray-100">
        <div className="flex items-center gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-emerald-600 text-white font-extrabold text-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 dark:from-emerald-800 dark:via-emerald-800 dark:to-emerald-800">{initialOf(p)}</div>
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{nameOf(p)}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{postingOf(p).title} • {studentOf(p).course}</p>
            <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">{fmt(p.start_date)} – {fmt(p.end_date)}</p>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3.5 flex items-center gap-1.5"><span>▦</span> Graduation & Clearance Audit</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {checks.map((c) => (
              <div key={c.label} className={`flex items-center gap-3 p-3.5 rounded-xl border ${c.ok ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200' : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${c.ok ? 'bg-emerald-500 text-white shadow-xs dark:bg-emerald-700' : 'bg-rose-500 text-white shadow-xs dark:bg-rose-700'}`}>{c.ok ? '✓' : '✗'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold leading-tight truncate">{c.label}</p>
                  <p className={`text-[11px] mt-0.5 truncate ${c.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{c.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-2"><span>⚠</span> Incomplete Requirements</p>
          <ul className="space-y-1 pl-4 list-disc text-xs text-amber-800 dark:text-amber-300">{missing.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      {p.status === 'completed' ? (
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900 dark:text-blue-200">✅ Internship Successfully Completed</p>
              <p className="text-xs text-blue-800/80 dark:text-blue-300/80 mt-1">This placement was officially signed off and closed.</p>
              {p.completion_notes && <div className="mt-3 p-3 bg-white/70 dark:bg-gray-900/60 rounded-xl border border-blue-200/50 text-xs text-blue-900 dark:text-blue-100 dark:border-blue-800/60"><span className="font-bold">Completion Notes:</span> {p.completion_notes}</div>}
            </div>
            {/* Print Certificate Button */}
            <button
              type="button"
              onClick={() => printCertificate(p)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 cursor-pointer whitespace-nowrap dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800 dark:hover:to-teal-800"
            >
               Print Certificate
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 dark:text-gray-100">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-4 mb-5">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><span>▦</span> Confirm Final Clearance</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Once approved, this student's internship records will be marked officially completed</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Completion Notes & Remarks <span className="text-gray-400 lowercase font-normal dark:text-gray-400">(optional)</span></label>
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Provide comments on the intern's contribution or farewell feedback..." className={inputCls} />
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
              <button onClick={onBack} className="w-full sm:w-auto text-center px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">Cancel</button>
              <button onClick={approve} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold px-7 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-0.5 text-sm cursor-pointer dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800 dark:hover:to-teal-800">
                <span>✓</span> Confirm & Issue Completion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompletionPanel() {
  const [placements, setPlacements] = useState(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [detailId, setDetailId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/company/completion', { params: { page } });
      const meta = pageMeta(res.data.data);
      setPlacements(meta.items);
      setLastPage(meta.lastPage);
      setTotalRows(meta.total);
    } catch (e) { setError(apiError(e)); setPlacements([]); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  if (detailId) return <CompletionDetail placementId={detailId} onBack={() => setDetailId(null)} onDone={() => { setDetailId(null); load(); }} />;
  if (!placements) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">{error || 'Loading…'}</p>;
  const total = totalRows || placements.length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Internship Completion Approvals</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Verify required hours and OJT completion evaluations before formally issuing completion clearance</p>
        </div>
        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50 self-start sm:self-auto">{total} Candidates</span>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden dark:text-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Intern</th><th className="px-6 py-4">Position</th><th className="px-6 py-4">Hours Rendered</th><th className="px-6 py-4">OJT Evaluation</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {placements.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">No interns found</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 max-w-sm mx-auto">Placed interns nearing completion will be listed here.</p>
                </td></tr>
              ) : placements.map((p) => {
                const evals = p.evaluations || [];
                const hasFinal = evals.some((e) => (e.evaluation_period || 'final') === 'final');
                const hoursOk = (p.rendered_hours || 0) >= (p.required_hours || 0);
                const complete = hoursOk && hasFinal;
                return (
                  <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm dark:from-emerald-800 dark:to-emerald-800">{initialOf(p)}</div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white leading-tight">{nameOf(p)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{studentOf(p).course}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="font-medium text-gray-800 dark:text-gray-200 text-xs">{postingOf(p).title}</span></td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold ${hoursOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{p.rendered_hours} / {p.required_hours}h</span>
                      {hoursOk && <span className="text-emerald-600 text-xs ml-1 dark:text-emerald-400">✓</span>}
                    </td>
                    <td className="px-6 py-4">
                      {hasFinal ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60">Submitted</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${statusCls[p.status] || statusCls.active}`}>{p.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setDetailId(p.id)} className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${complete && p.status === 'active' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm dark:from-emerald-800 dark:to-teal-800' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50'}`}>
                        Review & Sign <span>→</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Pager page={page} lastPage={lastPage} total={total} onChange={setPage} noun="candidates" className="mt-4" />
      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
