import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import { apiError, useDebounced } from '../ui';
import { OJT_PROGRAMS } from '../../constants/ojtPrograms';
import { OJT_SECTIONS } from '../../constants/ojtSections';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtFull = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';
const weekday = (d) => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'long' }) : '—';
const nameOf = (s) => s?.full_name || `${s?.first_name || ''} ${s?.last_name || ''}`.trim() || '—';
const postingOf = (p) => p?.internship_posting || p?.internshipPosting || {};
const companyOf = (p) => postingOf(p).company_profile || postingOf(p).companyProfile || {};
const daysUntil = (d) => d ? Math.ceil((new Date(d) - Date.now()) / 86400000) : 0;
const isUpcoming = (p) => p?.start_date && new Date(p.start_date) > new Date();
const daysLabel = (n) => n === 0 ? 'today' : n === 1 ? '1 day' : `${n} days`;

const statusBadge = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  completed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  terminated: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
};
const appBadge = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
  shortlisted: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
};
const inputCls = 'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:placeholder-gray-400';
const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5';
const thCls = 'px-6 py-4';
const tdCls = 'px-6 py-4';
const theadCls = 'border-b border-gray-100 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider';

function Avatar({ name, className = 'w-10 h-10 text-xs' }) {
  return (
    <div className={`${className} rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-500 text-white font-bold flex items-center justify-center shrink-0 shadow-sm dark:from-emerald-800 dark:to-emerald-800`}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

export default function StudentsPanel({ onRecommend }) {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('unplaced');
  const [section, setSection] = useState('');
  const [program, setProgram] = useState('');
  const [assignedProgram, setAssignedProgram] = useState(null);
  const [programResolved, setProgramResolved] = useState(false);
  const debouncedSearch = useDebounced(search);
  const applied = useMemo(() => ({ search: debouncedSearch, status, section, program }), [debouncedSearch, status, section, program]);
  const [selected, setSelected] = useState(null);
  const [resumeUrl, setResumeUrl] = useState(null);
  const [error, setError] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({ new_company_id: '', new_posting_id: '', reason: '', transfer_date: '' });
  const [companies, setCompanies] = useState([]);
  const [postings, setPostings] = useState([]);
  const [transferring, setTransferring] = useState(false);

  const load = useCallback(async (p = 1, searchVal = '', statusVal = '', sectionVal = '', programVal = '') => {
    setError('');
    try {
      const res = await api.get('/coordinator/students', {
        params: { ...(searchVal ? { search: searchVal } : {}), ...(statusVal ? { placement_status: statusVal } : {}), ...(sectionVal ? { section: sectionVal } : {}), ...(programVal ? { program: programVal } : {}), page: p },
      });
      const d = res.data.data;
      setStudents(d.data || d || []);
      setAssignedProgram(d.coordinator_program || null);
      setProgramResolved(true);
      setTotal(d.total ?? (d.data || d || []).length);
      setPage(d.current_page || p);
      setLastPage(d.last_page || 1);
    } catch (e) { setProgramResolved(true); setError(apiError(e)); }
  }, []);

  useEffect(() => { load(1, applied.search, applied.status, applied.section, applied.program); }, [applied, load]);

  const loadCompanies = useCallback(async () => {
    try {
      const res = await api.get('/coordinator/companies', { params: { per_page: 100 } });
      setCompanies(res.data.data?.data || res.data.data || []);
    } catch (e) { console.error('Failed to load companies', e); }
  }, []);

  const approveStudent = async (student) => {
    try {
      await api.patch(`/coordinator/students/${student.id}/approve`);
      await load(page, applied.search, applied.status, applied.section, applied.program);
    } catch (e) { setError(apiError(e, 'Could not approve student account.')); }
  };

  const loadPostings = useCallback(async (companyId) => {
    if (!companyId) { setPostings([]); return; }
    try {
      const res = await api.get('/coordinator/postings', { params: { company_id: companyId, status: 'approved', per_page: 100 } });
      setPostings(res.data.data?.data || res.data.data || []);
    } catch (e) { console.error('Failed to load postings', e); setPostings([]); }
  }, []);

  const openTransferModal = () => {
    setShowTransferModal(true);
    loadCompanies();
    setTransferData({ new_company_id: '', new_posting_id: '', reason: '', transfer_date: new Date().toISOString().split('T')[0] });
    setPostings([]);
  };

  const handleTransfer = async () => {
    if (!transferData.new_company_id || !transferData.new_posting_id || !transferData.reason || !transferData.transfer_date) {
      alert('Please fill all fields');
      return;
    }
    setTransferring(true);
    setError('');
    try {
      await api.post(`/coordinator/students/${selected.id}/transfer`, transferData);
      alert('Student transferred successfully!');
      setShowTransferModal(false);
      // Reload student data
      openStudent(selected);
      load(page, applied.search, applied.status, applied.section, applied.program);
    } catch (e) {
      setError(apiError(e));
      alert('Transfer failed: ' + apiError(e));
    } finally {
      setTransferring(false);
    }
  };

  useEffect(() => {
    if (transferData.new_company_id) {
      loadPostings(transferData.new_company_id);
    }
  }, [transferData.new_company_id, loadPostings]);

  const openStudent = async (s) => {
    setError('');
    try {
      const res = await api.get(`/coordinator/students/${s.id}`);
      setSelected(res.data.data);
      setResumeUrl(null);
      if (res.data.data?.resume_path) {
        try {
          const blob = await api.get(`/coordinator/students/${s.id}/resume`, { responseType: 'blob' });
          setResumeUrl(URL.createObjectURL(blob.data));
        } catch { /* resume preview optional */ }
      }
    } catch (e) { setError(apiError(e)); }
  };

  if (selected) {
    const placements = selected.placements || [];
    const recs = (selected.placement_recommendations || selected.placementRecommendations || [])
      .slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const applications = (selected.applications || []).slice(0, 5);
    const evaluations = selected.evaluations || [];
    const skills = selected.skills || [];
    const resumeExt = selected.resume_path ? selected.resume_path.split('.').pop().toLowerCase() : '';
    const latestRec = recs[0];
    const hasPlacementData = placements.length > 0 || recs.length > 0;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <button onClick={() => { setSelected(null); if (resumeUrl) URL.revokeObjectURL(resumeUrl); }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 mb-2 group">
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Back to student directory
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Student Profile & Academic Records</h1>
        </div>

        {/* Profile card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 space-y-6 dark:text-gray-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-gray-100 dark:border-gray-800">
            <Avatar name={selected.first_name} className="w-16 h-16 rounded-2xl text-2xl" />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{nameOf(selected)}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mt-0.5">{selected.course} {selected.year_level ? `— ${selected.year_level}` : ''}</p>
              <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">{selected.school_name || 'Institution not specified'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[['Student ID Number', selected.student_id_number || '—'], ['Email Address', selected.user?.email], ['Phone Contact', selected.phone_number || '—']].map(([label, val]) => (
              <div key={label} className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1 truncate">{val || '—'}</p>
              </div>
            ))}
          </div>

          {skills.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2.5">Student Competencies & Skills</p>
              <div className="flex flex-wrap gap-2">
                {skills.map((sk) => (
                  <span key={sk.id} className="inline-flex items-center px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-200/50 dark:border-emerald-800/50"># {sk.name}</span>
                ))}
              </div>
            </div>
          )}

          {selected.resume_path && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Student Resume / CV</p>
                {resumeUrl && <a href={resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">Open in New Tab ↗</a>}
              </div>
              {resumeExt === 'pdf' && resumeUrl ? (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-inner bg-gray-100 dark:bg-gray-800">
                  <iframe src={resumeUrl} className="w-full h-80 border-0" title="Resume Preview" />
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Resume.{resumeExt || 'file'}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-400">{(resumeExt || 'FILE').toUpperCase()} Document</p>
                  </div>
                  {resumeUrl && (
                    <a href={resumeUrl} download={`resume-${selected.student_id_number || selected.id}.${resumeExt || 'pdf'}`}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-md transition-all dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800 dark:hover:to-emerald-800">
                      Download Document
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Placement & schedule */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 dark:text-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              Internship Placement & Training Schedule
            </h3>
            <div className="flex items-center gap-2">
              {placements.some(p => p.status === 'active') && (
                <button onClick={openTransferModal} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors cursor-pointer dark:bg-amber-700">
                   Transfer Student
                </button>
              )}
              {!hasPlacementData && (
                <button onClick={() => onRecommend?.(selected.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer dark:bg-emerald-700">
                  + Assign Placement
                </button>
              )}
            </div>
          </div>

          {placements.length > 0 ? (
            <div className="space-y-6">
              {placements.map((pl) => {
                const posting = postingOf(pl);
                const company = companyOf(pl);
                const upcoming = isUpcoming(pl);
                const dUntil = daysUntil(pl.start_date);
                const ongoing = pl.status === 'active' && !upcoming && (!pl.end_date || new Date(pl.end_date) >= new Date());
                const pct = Math.min(100, pl.completion_percentage ?? Math.round(((pl.rendered_hours || 0) / (pl.required_hours || 1)) * 100));
                const duration = pl.start_date && pl.end_date ? Math.round((new Date(pl.end_date) - new Date(pl.start_date)) / 86400000) : null;
                return (
                  <div key={pl.id} className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-extrabold text-gray-900 dark:text-white text-base">{company.company_name || '—'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{posting.title}</p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-bold border capitalize ${statusBadge[pl.status] || 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'}`}>● {pl.status}</span>
                    </div>

                    {upcoming && (
                      <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <div className="text-xs">
                          <p className="font-bold text-amber-900 dark:text-amber-200">Placement Scheduled: Starts on {fmtFull(pl.start_date)} (in {daysLabel(dUntil)})</p>
                          <p className="text-amber-700 dark:text-amber-300 mt-0.5">Student daily journal entries and attendance logs remain disabled until the official placement start date.</p>
                        </div>
                      </div>
                    )}
                    {ongoing && (
                      <div className="p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
                        <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <div className="text-xs">
                          <p className="font-bold text-emerald-900 dark:text-emerald-200">Active Internship Period</p>
                          <p className="text-emerald-700 dark:text-emerald-300 mt-0.5">The student is actively rendering OJT hours. Target end date is {fmtFull(pl.end_date)}.</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {[['Start Date', fmt(pl.start_date), weekday(pl.start_date)], ['End Date', fmt(pl.end_date), weekday(pl.end_date)], ['Duration', duration != null ? `${duration} Days` : '—', 'Calendar Period'], ['Required Hours', `${pl.required_hours ?? '—'} Hours`, `${pl.remaining_hours ?? Math.max(0, (pl.required_hours || 0) - (pl.rendered_hours || 0))}h remaining`]].map(([label, val, sub]) => (
                        <div key={label} className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 dark:text-gray-100">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">{label}</p>
                          <p className="text-xs font-extrabold text-gray-900 dark:text-white mt-1">{val}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-400">{sub}</p>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-gray-500 dark:text-gray-400">Rendered Hours Progress</span>
                        <span className="text-gray-900 dark:text-white font-bold">{pl.rendered_hours || 0}/{pl.required_hours || 0}h ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full dark:from-emerald-800 dark:to-teal-800" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : latestRec ? (
            <div className="p-5 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800/60">● Recommendation {latestRec.status || 'pending'}</span>
                  <h4 className="font-bold text-gray-900 dark:text-white text-base mt-1.5">{companyOf(latestRec).company_name || 'Recommended Company'}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{postingOf(latestRec).title || 'Internship Position'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-100 dark:border-amber-900/40">
                {[['Target Start Date', fmt(latestRec.requested_start_date) === '—' ? 'Pending final schedule' : fmt(latestRec.requested_start_date)], ['Target End Date', fmt(latestRec.requested_end_date) === '—' ? 'Pending final schedule' : fmt(latestRec.requested_end_date)], ['Target Hours', `${latestRec.requested_required_hours || selected.required_hours || 486} Hours`]].map(([label, val]) => (
                  <div key={label} className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-900/40 dark:text-gray-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">{label}</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white mt-1">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Currently Unplaced</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1">This student has not yet been assigned to an internship placement. Placement dates and timeline will be recorded once a recommendation is confirmed.</p>
              </div>
              <div className="pt-2">
                <button onClick={() => onRecommend?.(selected.id)} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer dark:from-emerald-800 dark:to-teal-800 dark:hover:from-emerald-800 dark:hover:to-emerald-800">
                  + Recommend Internship Placement
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Applications */}
        {applications.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 dark:text-gray-100">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Applications ({(selected.applications || []).length})</h3>
            <div className="space-y-3">
              {applications.map((a) => {
                const posting = postingOf(a);
                const company = companyOf(a);
                return (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{posting.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{company.company_name || 'Company'}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border capitalize ${appBadge[a.status] || 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'}`}>{a.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Evaluations */}
        {evaluations.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8 dark:text-gray-100">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Supervisor Evaluations</h3>
            <div className="space-y-3">
              {evaluations.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{ev.evaluation_period} Assessment</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ev.grade_description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{ev.overall_rating}</span>
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-400">/5.0</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transfer Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto dark:text-gray-100">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Transfer Student</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Transfer {nameOf(selected)} to a new company in case of emergency</p>
              </div>

              <div className="p-6 space-y-4">
                {error && <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-300">{error}</div>}

                <div>
                  <label className={labelCls}>New Company *</label>
                  <select 
                    value={transferData.new_company_id} 
                    onChange={(e) => setTransferData({ ...transferData, new_company_id: e.target.value, new_posting_id: '' })}
                    className={inputCls}
                  >
                    <option value="">Select company...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>New Posting *</label>
                  <select 
                    value={transferData.new_posting_id} 
                    onChange={(e) => setTransferData({ ...transferData, new_posting_id: e.target.value })}
                    className={inputCls}
                    disabled={!transferData.new_company_id}
                  >
                    <option value="">Select posting...</option>
                    {postings.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                  {transferData.new_company_id && postings.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">No approved postings available for this company</p>
                  )}
                </div>

                <div>
                  <label className={labelCls}>Transfer Date *</label>
                  <input 
                    type="date" 
                    value={transferData.transfer_date} 
                    onChange={(e) => setTransferData({ ...transferData, transfer_date: e.target.value })}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Reason for Transfer *</label>
                  <textarea 
                    value={transferData.reason} 
                    onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                    placeholder="Explain why this student needs to be transferred..."
                    className={inputCls}
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-400 mt-1 dark:text-gray-400">{transferData.reason.length}/500 characters</p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                <button 
                  onClick={() => setShowTransferModal(false)} 
                  disabled={transferring}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleTransfer} 
                  disabled={transferring || !transferData.new_company_id || !transferData.new_posting_id || !transferData.reason || !transferData.transfer_date}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-amber-600 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-40 cursor-pointer dark:from-amber-800 dark:to-orange-800 dark:hover:from-amber-800 dark:hover:to-amber-800"
                >
                  {transferring ? 'Transferring...' : 'Confirm Transfer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Directory list (Blade index replica) ── */
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Student Directory & Trainees</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitor student internship assignments, hours rendered, and placement readiness</p>
        </div>
        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50 self-start sm:self-auto">
          {total} Total {total === 1 ? 'Student' : 'Students'}
        </span>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 sm:p-5 mb-6 flex flex-wrap gap-4 items-end dark:text-gray-100">
        <div className="flex-1 min-w-[240px]">
          <label className={labelCls}>Search Students</label>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by student name, ID number, course..." className={inputCls} />
        </div>
        <div className="w-full sm:w-56">
          <label className={labelCls}>Program</label>
          {!programResolved ? (
            <div className={`${inputCls} flex items-center min-h-[42px] text-gray-500 dark:text-gray-400`}>Loading assigned program…</div>
          ) : assignedProgram ? (
            <div className={`${inputCls} flex items-center min-h-[42px] font-semibold`}>
              {OJT_PROGRAMS.find(({ code }) => code === assignedProgram)?.label || assignedProgram}
            </div>
          ) : (
            <select value={program} onChange={(e) => setProgram(e.target.value)} className={inputCls}>
              <option value="">All OJT Programs</option>
              {OJT_PROGRAMS.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
            </select>
          )}
        </div>
        <div className="w-full sm:w-44">
          <label className={labelCls}>Batch/Section</label>
          <select value={section} onChange={(e) => setSection(e.target.value)} className={inputCls}>
            <option value="">All Sections</option>
            {OJT_SECTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div className="w-full sm:w-56">
          <label className={labelCls}>Placement Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            <option value="">All Placement Statuses</option>
            <option value="placed">On Internship (Active)</option>
            <option value="completed">Completed Requirements</option>
            <option value="unplaced">Unplaced (Searching)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          {(search || status || section || program) && (
            <button type="button" onClick={() => { setSearch(''); setStatus(''); setSection(''); setProgram(''); }} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">Reset</button>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden dark:text-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={theadCls}>
                <th className={thCls}>Student Profile</th>
                <th className={thCls}>Course & Year</th>
                <th className={thCls}>College / Campus</th>
                <th className={thCls}>Placement Status</th>
                <th className={`${thCls} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {students.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">No students found</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 max-w-sm mx-auto">No student records matched your search query or placement filter.</p>
                </td></tr>
              ) : students.map((s) => {
                const placements = s.placements || [];
                const active = placements.find((p) => p.status === 'active');
                const completed = placements.find((p) => p.status === 'completed');
                const recs = (s.placement_recommendations || s.placementRecommendations || [])
                  .slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                const rec = recs[0];
                const upcoming = active && isUpcoming(active);
                const dUntil = upcoming ? daysUntil(active.start_date) : 0;
                const chosen = active || completed;
                const statusKey = active ? 'active' : completed ? 'completed' : 'unplaced';
                const dotColor = { active: 'bg-emerald-500', completed: 'bg-blue-500', unplaced: 'bg-amber-500' }[statusKey];
                return (
                  <tr key={s.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <Avatar name={s.first_name} />
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white leading-tight">{nameOf(s)}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">ID: {s.student_id_number || 'Not assigned'}</p>
                        </div>
                      </div>
                    </td>
                    <td className={tdCls}>
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{s.course}</p>
                      {(s.year_level || s.section) && <p className="text-[11px] text-gray-400 dark:text-gray-400">{[s.year_level, s.section ? `Section ${s.section}` : ''].filter(Boolean).join(' · ')}</p>}
                    </td>
                    <td className={`${tdCls} text-xs text-gray-500 dark:text-gray-400`}>{s.school_name || '—'}</td>
                    <td className={tdCls}>
                      {chosen ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${statusBadge[statusKey]}`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColor}`} />
                              {upcoming ? 'Scheduled' : statusKey === 'active' ? 'On Internship' : 'Completed'}
                            </span>
                            {upcoming && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                Starts in {daysLabel(dUntil)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[220px]">{companyOf(chosen).company_name || '—'}</p>
                          {chosen.start_date && chosen.end_date && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 font-medium">
                              <svg className="w-3 h-3 text-gray-400 shrink-0 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                              <span>{fmt(chosen.start_date)} – {fmt(chosen.end_date)}</span>
                            </p>
                          )}
                        </div>
                      ) : rec ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60">
                            <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-amber-500" />
                            {rec.status === 'confirmed' ? 'Placement Confirmed' : 'Recommended'}
                          </span>
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate max-w-[220px]">{companyOf(rec).company_name || '—'}</p>
                          {rec.requested_start_date && (
                            <p className="text-[11px] text-gray-400 flex items-center gap-1 dark:text-gray-400">
                              <svg className="w-3 h-3 text-gray-400 shrink-0 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                              <span>Target: {fmt(rec.requested_start_date)}</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60">
                            <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-amber-500" />Unplaced
                          </span>
                          <p className="text-[11px] text-gray-400 dark:text-gray-400 mt-1">No placement assigned</p>
                        </div>
                      )}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      {!s.account_active && <button onClick={() => approveStudent(s)} className="mr-2 inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-950/50">Approve Account</button>}
                      <button onClick={() => openStudent(s)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer">
                        View Profile <span>→</span>
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
          <button disabled={page <= 1} onClick={() => load(page - 1, applied.search, applied.status, applied.section, applied.program)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer">← Prev</button>
          <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {lastPage}</span>
          <button disabled={page >= lastPage} onClick={() => load(page + 1, applied.search, applied.status, applied.section, applied.program)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 disabled:opacity-40 cursor-pointer">Next →</button>
        </div>
      )}
    </div>
  );
}
