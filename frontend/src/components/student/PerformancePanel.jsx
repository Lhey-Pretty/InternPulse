import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Badge, Card, EmptyState, apiError } from '../ui';

export default function PerformancePanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/student/performance')
      .then((res) => setData(res.data.data))
      .catch((e) => setError(apiError(e)));
  }, []);

  if (error) return <EmptyState text={error} />;
  if (!data) return <p className="py-12 text-center text-sm text-slate-500">Loading…</p>;

  const { stats, task_progress, evaluation_criteria } = data;

  if (!stats || (!stats.rendered_hours && !stats.attendance_days)) {
    return <EmptyState text="No placement data yet. Performance metrics appear once you have an active internship." />;
  }

  const statCards = [
    ['Completion', `${stats.completion_pct}%`],
    ['Hours', `${stats.rendered_hours}/${stats.required_hours}`],
    ['Attendance rate', `${stats.attendance_rate}%`],
    ['Tasks done', `${stats.completed_tasks}/${stats.total_tasks}`],
    ['Weekly logs', stats.weekly_logs],
    ['Overall rating', stats.overall_rating ?? '—'],
  ];

  const renderedHours = Number(stats.rendered_hours) || 0;
  const requiredHours = Number(stats.required_hours) || 0;
  const hoursProgress = requiredHours > 0 ? Math.min(100, (renderedHours / requiredHours) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map(([label, value]) => (
          <Card key={label} className="!p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900">Hours</h3>
            <span className="text-sm font-semibold tabular-nums text-slate-700">{renderedHours.toLocaleString(undefined, { maximumFractionDigits: 2 })} / {requiredHours.toLocaleString()} hrs</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-600 transition-all duration-500" style={{ width: `${hoursProgress}%` }} />
          </div>
          <p className="mt-2 text-xs font-medium text-emerald-700">{hoursProgress.toFixed(1)}% of required hours completed</p>
        </Card>

        <Card>
          <h3 className="mb-3 font-bold text-slate-900">Task progress</h3>
          {Object.keys(task_progress || {}).length === 0 ? (
            <p className="text-sm text-slate-400">No tasks yet.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(task_progress).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{status}</span>
                  <Badge tone={status === 'Completed' ? 'green' : status === 'In Progress' ? 'amber' : 'slate'}>{count}</Badge>
                </div>
              ))}
            </div>
          )}
          {stats.midterm_rating && (
            <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-500">
              Midterm rating: <strong className="text-slate-800">{stats.midterm_rating}</strong>
              {stats.final_rating && <> · Final rating: <strong className="text-slate-800">{stats.final_rating}</strong></>}
            </p>
          )}
        </Card>
      </div>

      {Object.keys(evaluation_criteria || {}).length > 0 && (
        <Card>
          <h3 className="mb-3 font-bold text-slate-900">Evaluation breakdown</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(evaluation_criteria).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-bold text-green-800">{value ?? '—'}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
