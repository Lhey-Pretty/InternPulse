import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { apiError, useDebounced } from '../ui';
import { OJT_PROGRAMS } from '../../constants/ojtPrograms';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const studentOf = (p) => p.student_profile || p.studentProfile || {};
const postingOf = (p) => p.internship_posting || p.internshipPosting || {};
const companyOf = (p) => postingOf(p).company_profile || postingOf(p).companyProfile || {};
const nameOf = (s) => s?.full_name || `${s?.first_name || ''} ${s?.last_name || ''}`.trim() || '—';
const placementOf = (e) => e.internship_placement || e.internshipPlacement || {};
const evalPostingOf = (e) => placementOf(e).internship_posting || placementOf(e).internshipPosting || {};
const evalCompanyOf = (e) => evalPostingOf(e).company_profile || evalPostingOf(e).companyProfile || {};
const evalStudentOf = (e) => e.student_profile || e.studentProfile || {};

const TABS = [
  ['deployment', 'Deployment Masterlist'],
  ['dtr', 'Hours & DTR Summary'],
  ['companies', 'Partner Companies'],
  ['evaluations', 'Student Evaluations'],
];
const inputCls = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5';

const thCls = 'px-6 py-4 print:px-3 print:py-2';
const theadCls = 'border-b border-gray-100 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider print:bg-gray-100 print:text-gray-900';
const tdCls = 'px-6 py-4 print:px-3 print:py-2';

export default function ReportsPanel() {
  const { user } = useAuth();
  const [type, setType] = useState('deployment');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [course, setCourse] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async (p = 1) => {
    setError('');
    try {
      const params = { type };
      if (debouncedSearch) params.search = debouncedSearch;
      if (course && type !== 'companies') params.course = course;
      if (status && ['deployment', 'dtr'].includes(type)) params.status = status;
      params.page = p;
      const res = await api.get('/coordinator/reports/items', { params });
      const d = res.data.data;
      const items = d.items?.data || d.items || [];
      setResult({ ...d, items, page: d.items?.current_page || p, lastPage: d.items?.last_page || 1, total: d.items?.total || items.length });
      setPage(p);
    } catch (e) { setError(apiError(e)); }
  }, [type, debouncedSearch, course, status]);

  useEffect(() => { load(1); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = result?.items || [];
  const reportTitle = result?.report_title || 'Internship Report';
  const needsCourse = ['deployment', 'dtr', 'evaluations'].includes(type);
  const needsStatus = ['deployment', 'dtr'].includes(type);

  const cell = { deployment: 6, dtr: 8, companies: 6, evaluations: 6 }[type];

  return (
    <div>
      {/* Print letterhead */}
      <div className="hidden print:block mb-6 text-center border-b-2 border-gray-900 pb-4">
        <div className="flex items-center justify-center gap-4 mb-2">
          <img src="/images/minsu-logo.png" alt="MinSU Seal" className="w-16 h-16 object-contain" />
          <div className="text-center">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-gray-700">Republic of the Philippines</p>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">MINDORO STATE UNIVERSITY</h2>
            <p className="text-xs font-bold text-emerald-800">BONGABONG CAMPUS • LABASAN, BONGABONG, ORIENTAL MINDORO</p>
            <p className="text-xs text-gray-600 mt-0.5">Office of Student Internship Program (OJT Coordination)</p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-300">
          <h1 className="text-base font-black tracking-wide uppercase text-gray-900">{reportTitle}</h1>
          <div className="flex items-center justify-between text-[11px] text-gray-600 font-medium mt-2 pt-2 border-t border-dashed border-gray-300">
            <span>Program: <strong className="text-gray-900">{course || 'All Programs'}</strong></span>
            <span>Total Records: <strong className="text-gray-900">{result?.total ?? items.length}</strong></span>
            <span>Date: <strong className="text-gray-900">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></span>
          </div>
        </div>
      </div>

      {/* Screen header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Internship Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generate, filter, and print official internship records and placement masterlists</p>
        </div>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 text-xs transition-all cursor-pointer">
           Print Report
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 mb-6 print:hidden">
        <nav className="flex gap-2 -mb-px overflow-x-auto text-sm">
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => { setType(key); setSearch(''); setCourse(''); setStatus(''); }}
              className={`px-4 py-2.5 border-b-2 font-semibold text-xs whitespace-nowrap transition-colors cursor-pointer ${type === key ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 sm:p-5 mb-6 flex flex-wrap gap-4 items-end print:hidden">
        <div className="flex-1 min-w-[200px]">
          <label className={labelCls}>Search</label>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." className={inputCls} />
        </div>
        {needsCourse && (
          <div className="w-full sm:w-48">
            <label className={labelCls}>Program</label>
            <select value={course} onChange={(e) => setCourse(e.target.value)} className={inputCls}>
              <option value="">All Programs</option>
              {OJT_PROGRAMS.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
            </select>
          </div>
        )}
        {needsStatus && (
          <div className="w-full sm:w-44">
            <label className={labelCls}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} capitalize`}>
              <option value="">All Statuses</option>
              {['active', 'completed', 'terminated'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          {(search || course || status) && <button type="button" onClick={() => { setSearch(''); setCourse(''); setStatus(''); }} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">Reset</button>}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 print:hidden">{error}</p>}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden print:border-gray-300 print:shadow-none">
        <div className="overflow-x-auto">
          {!result ? (
            <p className="px-6 py-12 text-center text-sm text-gray-400">Loading…</p>
          ) : type === 'deployment' ? (
            <table className="w-full text-left text-sm print:text-xs">
              <thead><tr className={theadCls}>
                <th className={thCls}>Student Trainee</th><th className={thCls}>Program</th><th className={thCls}>Host Company</th><th className={thCls}>Position</th><th className={thCls}>Training Period</th><th className={`${thCls} text-right`}>Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 print:divide-gray-300">
                {items.length === 0 ? <tr><td colSpan={cell} className="px-6 py-12 text-center text-sm text-gray-400">No trainee placement records found.</td></tr> : items.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                    <td className={tdCls}>
                      <p className="font-bold text-gray-900 dark:text-white print:text-black">{nameOf(studentOf(p))}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 print:text-gray-600">ID: {studentOf(p).student_id_number || 'Not assigned'}</p>
                    </td>
                    <td className={`${tdCls} text-xs font-semibold text-gray-800 dark:text-gray-200 print:text-black`}>{studentOf(p).course}</td>
                    <td className={`${tdCls} text-xs font-semibold text-gray-800 dark:text-gray-200 print:text-black`}>{companyOf(p).company_name || '—'}</td>
                    <td className={`${tdCls} text-xs text-gray-600 dark:text-gray-300 print:text-black`}>{postingOf(p).title}</td>
                    <td className={`${tdCls} text-xs text-gray-600 dark:text-gray-300 print:text-black whitespace-nowrap`}>{fmt(p.start_date)} — {fmt(p.end_date)}</td>
                    <td className={`${tdCls} text-right`}>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60' : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'}`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : type === 'dtr' ? (
            <table className="w-full text-left text-sm print:text-xs">
              <thead><tr className={theadCls}>
                <th className={thCls}>Student Trainee</th><th className={thCls}>Program</th><th className={thCls}>Host Company</th><th className={`${thCls} text-center`}>Required</th><th className={`${thCls} text-center`}>Rendered</th><th className={`${thCls} text-center`}>Remaining</th><th className={`${thCls} text-center`}>Progress</th><th className={`${thCls} text-right`}>Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 print:divide-gray-300">
                {items.length === 0 ? <tr><td colSpan={cell} className="px-6 py-12 text-center text-sm text-gray-400">No trainee hour records found.</td></tr> : items.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                    <td className={tdCls}>
                      <p className="font-bold text-gray-900 dark:text-white print:text-black">{nameOf(studentOf(p))}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 print:text-gray-600">ID: {studentOf(p).student_id_number || 'Not assigned'}</p>
                    </td>
                    <td className={`${tdCls} text-xs font-semibold text-gray-800 dark:text-gray-200 print:text-black`}>{studentOf(p).course}</td>
                    <td className={`${tdCls} text-xs text-gray-700 dark:text-gray-300 print:text-black`}>{companyOf(p).company_name || '—'}</td>
                    <td className={`${tdCls} text-center text-xs font-semibold text-gray-800 dark:text-gray-200 print:text-black`}>{p.required_hours}h</td>
                    <td className={`${tdCls} text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 print:text-black`}>{p.rendered_hours}h</td>
                    <td className={`${tdCls} text-center text-xs text-gray-500 print:text-black`}>{p.remaining_hours ?? Math.max(0, (p.required_hours || 0) - (p.rendered_hours || 0))}h</td>
                    <td className={`${tdCls} text-center`}><span className="text-xs font-bold text-gray-900 dark:text-white print:text-black">{p.completion_percentage ?? 0}%</span></td>
                    <td className={`${tdCls} text-right`}>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60' : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'}`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : type === 'companies' ? (
            <table className="w-full text-left text-sm print:text-xs">
              <thead><tr className={theadCls}>
                <th className={thCls}>Company Name</th><th className={thCls}>Industry</th><th className={thCls}>Location</th><th className={thCls}>Contact Email</th><th className={`${thCls} text-center`}>Active Trainees</th><th className={`${thCls} text-right`}>Accreditation</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 print:divide-gray-300">
                {items.length === 0 ? <tr><td colSpan={cell} className="px-6 py-12 text-center text-sm text-gray-400">No partner companies found.</td></tr> : items.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                    <td className={`${tdCls} font-bold text-gray-900 dark:text-white print:text-black`}>{c.company_name}</td>
                    <td className={`${tdCls} text-xs text-gray-600 dark:text-gray-300 print:text-black`}>{c.industry || 'General'}</td>
                    <td className={`${tdCls} text-xs text-gray-600 dark:text-gray-300 print:text-black`}>{c.address || 'MIMAROPA'}</td>
                    <td className={`${tdCls} text-xs text-gray-500 print:text-black`}>{c.user?.email || '—'}</td>
                    <td className={`${tdCls} text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 print:text-black`}>{c.active_interns_count ?? 0}</td>
                    <td className={`${tdCls} text-right`}>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${c.verification_status === 'verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60'}`}>{c.verification_status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm print:text-xs">
              <thead><tr className={theadCls}>
                <th className={thCls}>Student Trainee</th><th className={thCls}>Program</th><th className={thCls}>Host Company</th><th className={`${thCls} text-center`}>Score</th><th className={thCls}>Supervisor Feedback</th><th className={`${thCls} text-right`}>Date Evaluated</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 print:divide-gray-300">
                {items.length === 0 ? <tr><td colSpan={cell} className="px-6 py-12 text-center text-sm text-gray-400">No student evaluation records found.</td></tr> : items.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                    <td className={`${tdCls} font-bold text-gray-900 dark:text-white print:text-black`}>{nameOf(evalStudentOf(ev))}</td>
                    <td className={`${tdCls} text-xs font-semibold text-gray-800 dark:text-gray-200 print:text-black`}>{evalStudentOf(ev).course}</td>
                    <td className={`${tdCls} text-xs text-gray-700 dark:text-gray-300 print:text-black`}>{evalCompanyOf(ev).company_name || '—'}</td>
                    <td className={`${tdCls} text-center text-xs font-extrabold text-emerald-600 dark:text-emerald-400 print:text-black`}>{ev.overall_rating != null ? `${Number(ev.overall_rating).toFixed(1)} / 5.0` : '—'}</td>
                    <td className={`${tdCls} text-xs text-gray-500 max-w-xs truncate print:text-black`}>{ev.comments || 'Satisfactory completion.'}</td>
                    <td className={`${tdCls} text-right text-xs text-gray-500 print:text-black`}>{fmt(ev.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {result && result.lastPage > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2 print:hidden">
          <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer">← Prev</button>
          <span className="text-sm text-gray-500">Page {page} of {result.lastPage}</span>
          <button disabled={page >= result.lastPage} onClick={() => load(page + 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer">Next →</button>
        </div>
      )}

      {/* Print signatories */}
      <div className="hidden print:block mt-12 pt-6 border-t-2 border-gray-900 text-xs">
        <div className="grid grid-cols-2 gap-12">
          <div>
            <p className="font-medium text-gray-600 mb-8">Prepared and Certified by:</p>
            <p className="font-bold text-gray-900 underline text-sm">{(user?.name || '').toUpperCase()}</p>
            <p className="text-gray-700">OJT Coordinator / Instructor</p>
            <p className="text-gray-500 text-[10px]">Mindoro State University - Bongabong Campus</p>
          </div>
          <div>
            <p className="font-medium text-gray-600 mb-8">Noted and Approved by:</p>
            <p className="font-bold text-gray-900 underline text-sm">COLLEGE DEAN / CAMPUS DIRECTOR</p>
            <p className="text-gray-700">Mindoro State University</p>
            <p className="text-gray-500 text-[10px]">Bongabong Campus</p>
          </div>
        </div>
      </div>
    </div>
  );
}
