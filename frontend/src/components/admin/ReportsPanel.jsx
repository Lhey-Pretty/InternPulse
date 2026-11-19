import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { apiError } from '../ui';

const fmtNum = (v) => (typeof v === 'number' ? v.toLocaleString() : v);


function StatCard({ label, value, hint, gradient }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1.5 tracking-tight">{fmtNum(value)}</p>
          {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{hint}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} shrink-0 shadow-md`} />
      </div>
    </div>
  );
}

function BarRow({ label, value, total, gradient, hint }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-900 dark:text-white font-bold">{fmtNum(value)}</span>
          <span className="text-gray-400 text-[11px]">({pct}%)</span>
        </div>
      </div>
      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {hint && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

export default function ReportsPanel() {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/reports')
      .then((res) => setReports(res.data.data))
      .catch((e) => { setError(apiError(e)); setReports({}); });
  }, []);

  if (!reports) return <p className="py-12 text-center text-slate-500">{error || 'Loading…'}</p>;

  const placements = reports.placements || {};
  const companies = reports.companies || {};
  const students = reports.students || {};
  const postings = reports.postings || {};
  const applications = reports.applications || {};
  const evaluations = reports.evaluations || {};


  const totalPlacements = ['active', 'completed', 'terminated'].reduce((a, k) => a + (placements[k] || 0), 0);
  const completionRate = totalPlacements > 0 ? Math.round(((placements.completed || 0) / totalPlacements) * 100) : 0;


  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide uppercase mb-1"> Executive Reports</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">OJT Program Summary</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Placement coverage, company verification, and evaluation outcomes for the current internship cycle</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Students in OJT" value={students.total ?? 0} hint={`${students.on_internship ?? 0} currently deployed`} gradient="from-emerald-600 to-teal-600" />
        <StatCard label="Students Unplaced" value={students.unplaced ?? 0} hint="Still need a company assignment" gradient="from-amber-500 to-orange-600" />
        <StatCard label="Completion Rate" value={`${completionRate}%`} hint={`${placements.completed ?? 0} of ${totalPlacements} placements completed`} gradient="from-blue-600 to-emerald-600" />
        <StatCard label="Average Evaluation" value={`${evaluations.average ?? 0}/5`} hint={`${evaluations.count ?? 0} evaluations submitted`} gradient="from-emerald-600 to-pink-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Placements by Status</h3>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{fmtNum(totalPlacements)} total</span>
          </div>
          <div className="space-y-4">
            <BarRow label="Active ongoing" value={placements.active ?? 0} total={totalPlacements} gradient="from-emerald-500 to-teal-500" />
            <BarRow label="Completed" value={placements.completed ?? 0} total={totalPlacements} gradient="from-blue-600 to-emerald-600" />
            <BarRow label="Terminated" value={placements.terminated ?? 0} total={totalPlacements} gradient="from-rose-500 to-red-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Needs Attention</h3>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Open queues</span>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
            {[
              ['Unplaced students', students.unplaced ?? 0, 'Have no internship placement yet'],
              ['Company verifications pending', companies.pending ?? 0, 'Partner accounts awaiting review'],
              ['Postings pending approval', postings.pending ?? 0, 'Company listings not yet approved'],
              ['Applications pending', applications.pending ?? 0, `Of ${applications.total ?? 0} total applications`],
            ].map(([label, value, hint]) => (
              <li key={label} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{hint}</p>
                </div>
                <span className={`px-3 py-1 rounded-xl text-sm font-bold ${value > 0 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'}`}>
                  {fmtNum(value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
