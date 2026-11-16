import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Card, Badge, EmptyState, Notice, pageMeta, Pager } from '../ui';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const placementTone = (status) =>
  status === 'completed' ? 'green' : status === 'terminated' ? 'red' : 'blue';

export default function PlacementRecsPanel() {
  const [placements, setPlacements] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get('/student/placements').then((res) => res.data.data || []).catch(() => []),
      api.get('/student/placement-recommendations', { params: { page } })
        .then((res) => res.data.data)
        .catch(() => null),
    ]).then(([placementList, recs]) => {
      setPlacements(placementList);
      if (recs) {
        const meta = pageMeta(recs);
        setItems(meta.items);
        setLastPage(meta.lastPage);
        setTotal(meta.total);
      } else {
        setItems([]);
      }
    }).finally(() => setLoading(false));
  }, [page]);

  if (loading) return <Card className="p-6 text-sm text-gray-400">Loading placements…</Card>;

  return (
    <div className="space-y-6">
      <Notice message={notice?.message} error={notice?.error} />

      {placements.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Your Placement</h2>
            <p className="text-xs text-gray-500">The company and internship you have been placed with.</p>
          </div>
          {placements.map((pl) => {
            const posting = pl.internship_posting;
            const company = posting?.company_profile;
            const rendered = Number(pl.rendered_hours) || 0;
            const required = Number(pl.required_hours) || 0;
            const pct = required > 0 ? Math.min(100, Math.round((rendered / required) * 100)) : 0;

            return (
              <Card key={pl.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                      {company?.company_name || 'Partner company'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {posting?.title || 'Internship placement'}
                      {' · '}
                      {fmtDate(pl.start_date)} → {fmtDate(pl.end_date)}
                    </p>
                  </div>
                  <Badge tone={placementTone(pl.status)}>{pl.status}</Badge>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>{rendered}h of {required}h rendered</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Placement Recommendations</h2>
          <p className="text-xs text-gray-500">Proposals from your coordinator or partner companies.</p>
        </div>

        {items.length === 0 ? (
          <EmptyState text={placements.length > 0
            ? 'No new placement recommendations.'
            : 'No placement recommendations yet. Your coordinator or company will propose placements here.'} />
        ) : (
          <>
            {items.map((rec) => (
              <Card key={rec.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                      {rec.internship_posting?.title || 'Placement Recommendation'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {rec.internship_posting?.company_profile?.company_name || 'Partner company'}
                      {rec.requested_start_date && ` · ${rec.requested_start_date} → ${rec.requested_end_date} · ${rec.requested_required_hours}h`}
                    </p>
                    {rec.reason && <p className="text-xs text-gray-400 mt-1 italic">{rec.reason}</p>}
                  </div>
                  <Badge tone={rec.status === 'confirmed' ? 'green' : rec.status === 'rejected' ? 'red' : 'amber'}>
                    {rec.status}
                  </Badge>
                </div>
              </Card>
            ))}
            <Pager page={page} lastPage={lastPage} total={total} onChange={setPage} noun="recommendations" />
          </>
        )}
      </div>
    </div>
  );
}
