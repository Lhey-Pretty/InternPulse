import React, { useEffect, useState } from 'react';
import { Building2, Globe, MapPin, Mail, Phone, X } from 'lucide-react';
import api from '../../api/client';
import { Card, Badge, Notice, apiError } from '../ui';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const placementTone = (status) =>
  status === 'completed' ? 'green' : status === 'terminated' ? 'red' : 'blue';

export default function PlacementRecsPanel() {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlacement, setSelectedPlacement] = useState(null);

  useEffect(() => {
    api.get('/student/placements')
      .then((res) => setPlacements(res.data.data || []))
      .catch((requestError) => setError(apiError(requestError)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Card className="p-6 text-sm text-gray-400">Loading placements…</Card>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white">My Placement</h2>
        <p className="text-xs text-gray-500">Your assigned company, internship, and rendered-hour progress.</p>
      </div>
      <Notice error={error} />

      {placements.length === 0 && !error ? (
        <EmptyPlacement />
      ) : (
        <div className="space-y-3">
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
                    <button type="button" onClick={() => setSelectedPlacement(pl)} className="text-left font-bold text-gray-900 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">
                      {company?.company_name || 'Partner company'}
                    </button>
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

                <div className="mt-4 flex justify-end border-t border-gray-100 pt-3 dark:border-gray-800">
                  <button type="button" onClick={() => setSelectedPlacement(pl)} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
                    <Building2 className="h-4 w-4" /> View Company
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selectedPlacement && <CompanyDetails placement={selectedPlacement} onClose={() => setSelectedPlacement(null)} />}
    </div>
  );
}

function CompanyDetails({ placement, onClose }) {
  const posting = placement.internship_posting || placement.internshipPosting || {};
  const company = posting.company_profile || posting.companyProfile || {};
  const companyName = company.company_name || company.name || 'Placement company';
  const address = company.location || [company.address, company.city, company.province].filter(Boolean).join(', ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="placement-company-title" className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-gray-50/80 p-6 dark:border-gray-800 dark:bg-gray-800/40">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"><Building2 className="h-6 w-6" /></div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Placement company</p>
              <h2 id="placement-company-title" className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{companyName}</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{company.industry || 'Industry not provided'}</p>
            </div>
          </div>
          <button type="button" aria-label="Close company details" onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-5 p-6">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Your internship</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">{posting.title || 'Internship position'}</p>
            <p className="mt-1 text-sm capitalize text-gray-600 dark:text-gray-300">{(placement.status || 'active').replace('_', ' ')} · {fmtDate(placement.start_date)} – {fmtDate(placement.end_date)}</p>
          </div>
          {company.description && <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{company.description}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {company.contact_person && <Info icon={Building2} label="Contact person" value={company.contact_person} />}
            {company.contact_email && <Info icon={Mail} label="Email" value={company.contact_email} />}
            {company.contact_phone && <Info icon={Phone} label="Phone" value={company.contact_phone} />}
            {address && <Info icon={MapPin} label="Address" value={address} />}
            {company.website && <Info icon={Globe} label="Website" value={company.website} />}
          </div>
          <div className="flex justify-end border-t border-gray-100 pt-4 dark:border-gray-800">
            <button type="button" onClick={onClose} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800">Close</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><Icon className="h-3.5 w-3.5" />{label}</p>
      <p className="mt-1 break-words text-sm text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function EmptyPlacement() {
  return (
    <Card className="p-10 text-center">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white">No placement assigned yet</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your confirmed company and internship will appear here.</p>
    </Card>
  );
}
