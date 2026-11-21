import React, { useCallback, useEffect, useState } from 'react';
import { Search, TrendingUp } from 'lucide-react';
import api from '../../api/client';
import { Badge, Card, EmptyState, inputCls, apiError } from '../ui';

export default function SkillsPanel({ onNavigate }) {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (q = '') => {
    try {
      const res = await api.get('/student/skill-recommendations', { params: q ? { search: q } : {} });
      setData(res.data.data);
    } catch (e) {
      setError(apiError(e));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  if (error) return <EmptyState text={error} />;
  if (!data) return <p className="py-12 text-center text-sm text-slate-500 dark:text-gray-400">Loading…</p>;

  const gaps = data.skill_gaps || [];
  const suggested = data.suggested_skills?.data || [];

  return (
    <div className="space-y-5">
      {data.profile_incomplete && (
        <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-800/60 dark:bg-amber-950/50">
          <h3 className="font-bold text-slate-900 dark:text-gray-100">Set your program first</h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-gray-300">
            Your profile has no course/program yet, so these gaps and suggestions come from all approved postings and all
            program skill lists. Choose your program in My Profile to get accurate recommendations.
          </p>
          <button
            type="button"
            onClick={() => onNavigate?.('profile')}
            className="mt-3 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 cursor-pointer"
          >
            Complete my profile
          </button>
        </Card>
      )}
      {gaps.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800/60 dark:bg-amber-950/50">
          <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-gray-100"><TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Top skill gaps</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            Most requested by approved postings{data.program ? ' for your program' : ''} that you haven't listed yet.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {gaps.map((g) => (
              <span key={g.name} className="rounded-full border border-amber-300 bg-white px-3 py-1 text-sm font-semibold text-amber-800 dark:border-amber-800/60 dark:bg-gray-900 dark:text-amber-300">
                {g.name} <span className="text-amber-500 dark:text-amber-400">×{g.count}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      <div>
        <div className="mb-3 flex items-center gap-3">
          <h3 className="font-bold text-slate-900 dark:text-gray-100">Suggested skills</h3>
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search skills…" className={inputCls + ' !pl-9'} />
          </div>
        </div>
        {suggested.length === 0 ? (
          <EmptyState
            text={search
              ? `No skills match "${search}".`
              : 'No suggested skills found. Add skills to your profile to improve matches.'}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {suggested.map((skill) => (
              <Card key={skill.id} className="!p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900 dark:text-gray-100">{skill.name}</p>
                  <Badge tone="green">{skill.category}</Badge>
                </div>
                {skill.canonical_name && skill.canonical_name !== skill.name && (
                  <p className="mt-1 text-xs text-slate-400 dark:text-gray-400">Also known as: {skill.canonical_name}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
