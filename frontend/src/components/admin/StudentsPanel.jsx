import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import api from '../../api/client';
import { apiError, Pager, pageMeta, useDebounced } from '../ui';
import { OJT_PROGRAMS } from '../../constants/ojtPrograms';
import { OJT_SECTIONS } from '../../constants/ojtSections';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const nameOf = (s) => s.full_name?.trim() || `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.user?.name || '—';
const initialOf = (s) => (s.first_name || nameOf(s) || '?').charAt(0).toUpperCase();

const appStatusCls = {
  accepted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-600/20',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-600/20',
  rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 ring-1 ring-rose-600/20',
  shortlisted: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-blue-600/20',
  interview: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 ring-1 ring-indigo-600/20',
};
const plStatusCls = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-600/20',
  completed: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-blue-600/20',
  terminated: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 ring-1 ring-rose-600/20',
};
const placementOf = (s) => {
  const placements = s.placements || [];
  return placements.find((p) => p.status === 'active') || placements.find((p) => p.status === 'completed') || null;
};
const pStatusOf = (s) => {
  const placements = s.placements || [];
  if (placements.some((p) => p.status === 'active')) return 'active';
  if (placements.some((p) => p.status === 'completed')) return 'completed';
  return 'unplaced';
};
const unplacedBadge = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 ring-1 ring-gray-600/20';

const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

function StudentDetail({ id, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/admin/students/${id}`).then((res) => setData(res.data.data)).catch((e) => setError(apiError(e)));
  }, [id]);

  if (!data) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">{error || 'Loading…'}</p>;
  const s = data.student;
  const active = data.active_placement;
  const apps = s.applications || [];
  const placements = s.placements || [];
  const skills = s.skills || [];

  const infoItems = [
    ['Full Name', nameOf(s)], ['Student ID', s.student_id_number || '—'],
    ['Academic Program', `${s.course || '—'}${s.year_level ? ` · ${s.year_level}` : ''}`],
    ['Institution', s.school_name || '—'], ['Account Email', s.user?.email || '—'],
    ['Contact Phone', s.phone_number || '—'],
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-7 space-y-6 dark:text-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-600 text-white font-extrabold text-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 dark:from-emerald-800 dark:via-emerald-800 dark:to-emerald-800">{initialOf(s)}</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{nameOf(s)}</h1>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>ID: {s.student_id_number || 'Not assigned'}</span><span>•</span>
              <span>{s.course} {s.year_level ? `(${s.year_level})` : ''}</span>
              {s.school_name && <><span>•</span><span>{s.school_name}</span></>}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {infoItems.map(([label, val]) => (
            <div key={label} className="bg-gray-50/70 dark:bg-gray-800/40 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800/80">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1">{label}</p>
              <p className="text-gray-900 dark:text-white font-medium text-xs break-words">{val}</p>
            </div>
          ))}
        </div>
        {skills.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-2.5">Endorsed Skills & Capabilities</p>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span key={skill.id} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">{skill.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {active && (
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-500/20 dark:border-emerald-800/40 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/15 dark:border-emerald-800/30">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Active Internship Placement</h3>
            </div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1 rounded-full">{active.completion_percentage ?? 0}% Completed</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div><p className="text-gray-500 dark:text-gray-400 uppercase text-[11px] font-semibold">Partner Company</p><p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">{(active.internship_posting || active.internshipPosting)?.company_profile?.company_name || (active.internship_posting || active.internshipPosting)?.companyProfile?.company_name}</p></div>
            <div><p className="text-gray-500 dark:text-gray-400 uppercase text-[11px] font-semibold">Job Position</p><p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{(active.internship_posting || active.internshipPosting)?.title}</p></div>
            <div><p className="text-gray-500 dark:text-gray-400 uppercase text-[11px] font-semibold">Internship Period</p><p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">{fmtD(active.start_date)} – {fmt(active.end_date)}</p></div>
            <div><p className="text-gray-500 dark:text-gray-400 uppercase text-[11px] font-semibold">Hours Logged</p><p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm mt-0.5">{active.rendered_hours} / {active.required_hours} hrs</p></div>
          </div>
          <div className="pt-2">
            <div className="h-2.5 bg-emerald-200/50 dark:bg-emerald-900/40 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 dark:from-emerald-800 dark:to-teal-800" style={{ width: `${active.completion_percentage ?? 0}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {apps.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4 dark:text-gray-100">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">▦ Application Records</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{apps.length} Total</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {apps.slice(0, 5).map((app) => {
              const posting = app.internship_posting || app.internshipPosting || {};
              const company = posting.company_profile || posting.companyProfile || {};
              return (
                <div key={app.id} className="flex items-center justify-between py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 px-2 rounded-xl transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{posting.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{company.company_name}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${appStatusCls[app.status] || appStatusCls.pending}`}>{app.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {placements.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4 dark:text-gray-100">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">▦ Placement History</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {placements.map((pl) => {
              const posting = pl.internship_posting || pl.internshipPosting || {};
              const company = posting.company_profile || posting.companyProfile || {};
              return (
                <div key={pl.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{company.company_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{fmt(pl.start_date)} – {fmt(pl.end_date)}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${plStatusCls[pl.status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 ring-1 ring-gray-600/20'}`}>{pl.status}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pl.completion_percentage ?? 0}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-400">
                      <span>{pl.rendered_hours} rendered of {pl.required_hours} required hours</span>
                      <span className="font-semibold text-gray-600 dark:text-gray-300">{pl.completion_percentage ?? 0}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


export default function StudentsPanel() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [placementStatus, setPlacementStatus] = useState('');
  const [program, setProgram] = useState('');
  const [section, setSection] = useState('');
  const debouncedSearch = useDebounced(search);
  const [detailId, setDetailId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async (p = 1) => {
    try {
      const params = { page: p };
      if (debouncedSearch) params.search = debouncedSearch;
      if (placementStatus) params.placement_status = placementStatus;
      if (program) params.program = program;
      if (section) params.section = section;
      const res = await api.get('/admin/students', { params });
      setData(res.data.data);
    } catch (e) { setError(apiError(e)); setData({ students: { data: [] }, stats: {} }); }
  }, [debouncedSearch, placementStatus, program, section]);

  useEffect(() => { load(); }, [load]);

  if (detailId) return <StudentDetail id={detailId} onBack={() => { setDetailId(null); load(); }} />;
  if (!data) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">{error || 'Loading…'}</p>;

  const paged = pageMeta(data.students);
  const students = paged.items;
  const stats = data.stats || {};
  const statCards = [
    ['Total Enrolled', stats.total ?? 0, 'from-blue-600 to-emerald-600 dark:from-blue-800 dark:to-emerald-800', 'shadow-blue-500/20'],
    ['On Internship', stats.placed ?? 0, 'from-emerald-600 to-teal-600 dark:from-emerald-800 dark:to-teal-800', 'shadow-emerald-500/20'],
    ['Completed Hours', stats.completed ?? 0, 'from-emerald-600 to-pink-600 dark:from-emerald-800 dark:to-pink-800', 'shadow-emerald-500/20'],
    ['Unplaced Students', stats.unplaced ?? 0, 'from-amber-500 to-orange-600 dark:from-amber-800 dark:to-orange-800', 'shadow-amber-500/20'],
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide uppercase mb-1"> Student Directory</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track intern roster, monitor company placements, rendered OJT hours, and graduation progress</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(([label, val, gradient, shadow]) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex items-center justify-between group dark:text-gray-100">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{val}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center text-lg shadow-md ${shadow}`}>•</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 dark:text-gray-100">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 dark:text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, student ID, or course..." className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all dark:placeholder:text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <select value={placementStatus} onChange={(e) => setPlacementStatus(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3.5 py-2 focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all dark:placeholder:text-gray-400">
              <option value="">All Statuses</option>
              <option value="placed">On Internship</option>
              <option value="completed">Completed</option>
              <option value="unplaced">Unplaced</option>
            </select>
            <select value={program} onChange={(e) => setProgram(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3.5 py-2 text-gray-900 dark:text-white dark:placeholder:text-gray-400"><option value="">All Programs</option>{OJT_PROGRAMS.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}</select>
            <select value={section} onChange={(e) => setSection(e.target.value)} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3.5 py-2 text-gray-900 dark:text-white dark:placeholder:text-gray-400"><option value="">All Sections</option>{OJT_SECTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            {(search || placementStatus || program || section) && <button type="button" onClick={() => { setSearch(''); setPlacementStatus(''); setProgram(''); setSection(''); }} className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer">Reset</button>}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden dark:text-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-[11px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">
                <th className="px-6 py-4">Student</th><th className="px-6 py-4">Academic Program</th><th className="px-6 py-4">Assigned Company</th><th className="px-6 py-4">Rendered Hours</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {students.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">No students found</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Try refining search parameters or filters.</p>
                </td></tr>
              ) : students.map((s) => {
                const placement = placementOf(s);
                const posting = placement?.internship_posting || placement?.internshipPosting || {};
                const company = posting.company_profile || posting.companyProfile || {};
                const pStatus = pStatusOf(s);
                const badge = pStatus === 'unplaced' ? unplacedBadge : pStatus === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-1 ring-emerald-600/20' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-blue-600/20';
                const hourPct = placement?.required_hours > 0 ? Math.min(100, Math.round(((placement.rendered_hours || 0) / placement.required_hours) * 100)) : 0;
                return (
                  <tr key={s.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center text-sm shadow-sm dark:from-emerald-800 dark:to-teal-800">{initialOf(s)}</div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white leading-tight">{nameOf(s)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{s.student_id_number || s.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800 dark:text-gray-200 text-xs">{s.course || 'Not specified'}</p>
                      {s.year_level && <p className="text-[11px] text-gray-400 mt-0.5 dark:text-gray-400">{s.year_level}</p>}
                    </td>
                    <td className="px-6 py-4">
                      {placement ? (
                        <>
                          <p className="font-semibold text-gray-900 dark:text-white text-xs">{company.company_name}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{posting.title}</p>
                        </>
                      ) : <span className="inline-flex items-center gap-1 text-xs text-gray-400 italic dark:text-gray-400"><span>—</span><span>Not placed yet</span></span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {placement ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs">
                            <span className="font-bold text-gray-900 dark:text-white">{placement.rendered_hours}h</span>
                            <span className="text-gray-400 dark:text-gray-400">/ {placement.required_hours}h</span>
                          </div>
                          <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${hourPct}%` }}></div>
                          </div>
                        </div>
                      ) : <span className="text-xs text-gray-300 dark:text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${badge}`}>{pStatus === 'active' ? 'On Internship' : pStatus}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button onClick={() => setDetailId(s.id)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors cursor-pointer">View Profile</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Pager
        page={paged.page}
        lastPage={paged.lastPage}
        total={paged.total}
        onChange={load}
        noun="students"
        className="mt-1"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
