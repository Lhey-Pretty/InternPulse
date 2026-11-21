import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, FileText, X } from 'lucide-react';
import api from '../../api/client';
import { Notice, apiError } from '../ui';

const statusCls = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  shortlisted: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  interview: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
  withdrawn: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
};
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const inputCls = 'w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500';

export default function ApplicantsPanel() {
  const [apps, setApps] = useState(null);
  const [postings, setPostings] = useState([]);
  const [filterPosting, setFilterPosting] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState(null);
  const [resumeUrl, setResumeUrl] = useState(null);
  const [statusAction, setStatusAction] = useState(null);
  const [placementForm, setPlacementForm] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Load postings once on mount
  useEffect(() => {
    api.get('/company/postings').then((res) => {
      setPostings(res.data.data?.data || res.data.data || []);
    }).catch(() => {});
  }, []);

  const load = useCallback(async (p = 1, fp = filterPosting, fs = filterStatus, search = debouncedSearch) => {
    try {
      const params = { page: p };
      if (fp) params.posting_id = fp;
      if (fs) params.status = fs;
      if (search) params.search = search;
      const a = await api.get('/company/applicants', { params });
      const d = a.data.data;
      setApps(d.data || d || []);
      setPage(d.current_page || p);
      setLastPage(d.last_page || 1);
      setTotal(d.total ?? (d.data || d || []).length);
    } catch (e) { setError(apiError(e)); setApps([]); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => { load(1, filterPosting, filterStatus, debouncedSearch); }, [filterPosting, filterStatus, debouncedSearch, load]);

  if (!apps) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">Loading…</p>;
  const openDetail = async (app) => {
    setDetail(app);
    setStatusAction(null);
    setPlacementForm(null);
    setError('');
    setResumeUrl(null);
    const rp = app.resume_path || (app.student_profile || app.studentProfile || {}).resume_path;
    if (rp) {
      try {
        const blob = await api.get(`/company/applicants/${app.id}/resume`, { responseType: 'blob' });
        setResumeUrl(URL.createObjectURL(blob.data));
      } catch { /* resume preview optional */ }
    }
  };

  const updateStatus = async (app, payload) => {
    setError('');
    try {
      await api.patch(`/company/applicants/${app.id}/status`, payload);
      setMessage('Application status updated.');
      setStatusAction(null);
      setDetail(null);
      await load();
    } catch (err) { setError(apiError(err)); }
  };

  const requestPlacement = async (app) => {
    setError('');
    try {
      await api.post(`/company/applicants/${app.id}/placement-request`, placementForm);
      setMessage('Placement request submitted for coordinator approval.');
      setPlacementForm(null);
      await load();
    } catch (err) { setError(apiError(err)); }
  };



  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Candidate Applications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review candidate resumes and skill-match scores</p>
        </div>
        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50 self-start sm:self-auto">
          {total} Total Applicant{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filters */}
      <form onSubmit={(e) => e.preventDefault()} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 sm:p-5 mb-6 flex flex-wrap gap-4 items-end dark:text-gray-100">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Search Applicant</label>
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name or student ID..." className={inputCls} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Internship Posting</label>
          <select value={filterPosting} onChange={(e) => setFilterPosting(e.target.value)} className={inputCls}>
            <option value="">All Postings</option>
            {postings.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div className="w-full sm:w-48">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Application Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${inputCls} capitalize`}>
            <option value="">All Statuses</option>
            {['pending', 'accepted', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 transition-all text-sm cursor-pointer dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800 dark:hover:to-emerald-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            Filter
          </button>
          {(filterPosting || filterStatus) && <button type="button" onClick={() => { setFilterPosting(''); setFilterStatus(''); }} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">Reset</button>}
        </div>
      </form>

      <Notice message={message} error={error} />

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden dark:text-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Applicant</th>
                <th className="px-6 py-4">Applied Position</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Applied Date</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {apps.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">No applicants found</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 max-w-sm mx-auto">No student applications match your current filters.</p>
                </td></tr>
              ) : apps.map((app) => {
                const student = app.student_profile || app.studentProfile || {};
                const posting = app.internship_posting || app.internshipPosting || {};
                const name = student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || '—';
                return (
                  <tr key={app.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-500 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm dark:from-emerald-800 dark:to-emerald-800">
                          {(student.first_name || name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white leading-snug truncate">{name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{student.course || 'Course not specified'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="font-medium text-gray-800 dark:text-gray-200 block truncate max-w-xs">{posting.title}</span></td>
                    <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${statusCls[app.status] || statusCls.pending}`}>{app.status}</span></td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmt(app.applied_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openDetail(app)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer">
                        Review <span>→</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {lastPage > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => load(page - 1, filterPosting, filterStatus, debouncedSearch)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">← Prev</button>
          <span className="text-sm text-gray-500 dark:text-gray-400 px-3">Page {page} of {lastPage}</span>
          <button disabled={page >= lastPage} onClick={() => load(page + 1, filterPosting, filterStatus, debouncedSearch)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">Next →</button>
        </div>
      )}

      {/* Detail modal */}
      {detail && (() => {
        const app = detail;
        const student = app.student_profile || app.studentProfile || {};
        const posting = app.internship_posting || app.internshipPosting || {};
        const name = student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || '—';
        const studentSkills = (student.skills || []).map((s) => (typeof s === 'string' ? s : s.name));
        const studentSkillLower = studentSkills.map((s) => s.toLowerCase().trim());
        const requiredSkills = posting.required_skills || [];
        const hasSkill = (s) => studentSkillLower.includes(String(s).toLowerCase().trim());
        const otherSkills = studentSkills.filter((s) => !requiredSkills.some((r) => String(r).toLowerCase().trim() === s.toLowerCase().trim()));
        const resumePath = app.resume_path || student.resume_path;
        const ext = resumePath ? resumePath.split('.').pop().toLowerCase() : null;
        const isFinal = ['accepted', 'rejected', 'withdrawn'].includes(app.status);
        const score = app.match_score ?? app.matchScore;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDetail(null)}>
            <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto dark:text-gray-100" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 sm:p-8 space-y-6">
                <button onClick={() => setDetail(null)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer dark:hover:text-emerald-300">
                  <ArrowLeft className="w-4 h-4" /> Back to applicants
                </button>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Review Application</h1>

                {/* Hero */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 !border-0 dark:text-gray-100">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-emerald-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 dark:from-emerald-800 dark:via-emerald-800 dark:to-emerald-800">
                        {(student.first_name || name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{name}</h2>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border capitalize ${statusCls[app.status] || statusCls.pending}`}>{app.status}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 font-medium">{student.course} — {student.year_level}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">{student.school_name}</p>
                      </div>
                    </div>
                    {score != null && (
                      <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-4 text-center min-w-[120px] shrink-0">
                        <p className={`text-3xl font-extrabold ${score >= 75 ? 'text-emerald-600 dark:text-emerald-400' : score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>{score}%</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Match Score</p>
                      </div>
                    )}
                  </div>

                  {requiredSkills.length > 0 && (
                    <div className="pt-6 border-t border-gray-100 dark:border-gray-800 mt-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Job Requirements vs. Applicant Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {requiredSkills.map((skill, i) => hasSkill(skill) ? (
                          <span key={i} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"><Check className="w-3 h-3" />{skill}</span>
                        ) : (
                          <span key={i} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"><X className="w-3 h-3" />{skill}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 mt-2.5">
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">✓ {requiredSkills.filter(hasSkill).length} of {requiredSkills.length} matched</span>
                        {requiredSkills.some((s) => !hasSkill(s)) && <span className="text-[11px] text-rose-500 dark:text-rose-400 font-medium">✗ {requiredSkills.filter((s) => !hasSkill(s)).length} missing</span>}
                      </div>
                    </div>
                  )}

                  {otherSkills.length > 0 && (
                    <div className="pt-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Other Skills <span className="normal-case font-normal text-gray-400 ml-1 dark:text-gray-400">({otherSkills.length} total)</span></p>
                      <div className="flex flex-wrap gap-1.5">
                        {otherSkills.slice(0, 15).map((s, i) => <span key={i} className="text-xs px-2.5 py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700">{s}</span>)}
                        {otherSkills.length > 15 && <span className="text-xs px-2.5 py-1 text-gray-400 dark:text-gray-400">+{otherSkills.length - 15} more</span>}
                      </div>
                    </div>
                  )}

                  {app.cover_letter && (
                    <div className="pt-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">Cover Letter</p>
                      <div className="bg-gray-50 dark:bg-gray-800/70 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{app.cover_letter}</div>
                    </div>
                  )}

                  {/* Resume */}
                  <div className="pt-6 border-t border-gray-100 dark:border-gray-800 mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">Resume & Portfolio</p>
                      {resumePath && (
                        <div className="flex items-center gap-2">
                          <a href={resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">Open in New Tab ↗</a>
                          <span className="text-gray-300 dark:text-gray-400">|</span>
                          <a href={resumeUrl} download className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Download File</a>
                        </div>
                      )}
                    </div>
                    {resumePath ? (
                      ext === 'pdf' && resumeUrl ? (
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-inner bg-gray-100 dark:bg-gray-800">
                          <iframe src={resumeUrl} className="w-full h-[550px] border-0" title="Resume Preview" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                          <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8 text-gray-400 dark:text-gray-400" />
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">Resume.{ext}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-400">{ext?.toUpperCase()} Attached Document</p>
                            </div>
                          </div>
                          <a href={resumeUrl} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-md transition-all dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800 dark:hover:to-emerald-800">Download Resume</a>
                        </div>
                      )
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-400 italic">No resume file attached with this application.</p>
                    )}
                  </div>
                </div>

                {/* Status management */}
                {!isFinal && (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 !border-0 dark:text-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Update Application Status</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">Change candidate status</p>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['accepted', 'Accept', 'bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'],
                        ['rejected', 'Reject', 'bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/50'],
                      ].map(([value, label, cls]) => (
                        <button key={value} type="button" onClick={() => setStatusAction(statusAction?.status === value ? null : { status: value })}
                          className={`py-3 px-4 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer ${cls}`}>
                          {label}
                        </button>
                      ))}
                    </div>

                    {statusAction?.status === 'rejected' && (
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1.5">Reason for Rejection (Optional)</label>
                        <textarea rows={2} value={statusAction.rejection_reason || ''} onChange={(e) => setStatusAction({ ...statusAction, rejection_reason: e.target.value })} placeholder="Let the applicant know constructive feedback or reasons..." className={`${inputCls} border-rose-200 dark:border-rose-900 dark:text-gray-100 dark:bg-gray-800 dark:placeholder:text-gray-400`} />
                        <button onClick={() => updateStatus(app, { status: 'rejected', rejection_reason: statusAction.rejection_reason })} className="mt-2.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer dark:bg-rose-700">Confirm Rejection</button>
                      </div>
                    )}

                    {statusAction && statusAction.status !== 'rejected' && (
                      <button onClick={() => updateStatus(app, { status: statusAction.status })} className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer dark:bg-emerald-700">Confirm {statusAction.status}</button>
                    )}
                  </div>
                )}

                {/* Placement request for accepted */}
                {app.status === 'accepted' && !placementForm && (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 !border-0 dark:text-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Propose Placement Schedule</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Set the OJT dates and required hours. The coordinator must approve before the internship begins.</p>
                    <button onClick={() => setPlacementForm({ start_date: '', end_date: '', required_hours: '' })} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-500/25 cursor-pointer dark:from-emerald-800 dark:to-teal-800">Request Placement</button>
                  </div>
                )}
                {placementForm && (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 !border-0 dark:text-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Propose Placement Schedule</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label><input type="date" value={placementForm.start_date} onChange={(e) => setPlacementForm({ ...placementForm, start_date: e.target.value })} className={inputCls} /></div>
                      <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label><input type="date" value={placementForm.end_date} onChange={(e) => setPlacementForm({ ...placementForm, end_date: e.target.value })} className={inputCls} /></div>
                      <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Required Hours</label><input type="number" min="1" value={placementForm.required_hours} onChange={(e) => setPlacementForm({ ...placementForm, required_hours: e.target.value })} className={inputCls} /></div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => requestPlacement(app)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer dark:bg-emerald-700">Submit for Approval</button>
                      <button onClick={() => setPlacementForm(null)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
