import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api, { downloadFile } from '../../api/client';
import { apiError } from '../ui';

const inputCls = 'w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white';

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 dark:text-gray-100 ${wide ? 'max-w-2xl' : 'max-w-md'} w-full p-6 space-y-4 max-h-[90vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer dark:text-gray-400 dark:hover:text-gray-300">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProgramSkillsModal({ programCode, programName, skills, onClose, onChanged }) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    if (!search) return skills;
    const q = search.toLowerCase();
    return skills.filter((s) => s.name.toLowerCase().includes(q));
  }, [skills, search]);

  const saveEdit = async (skill) => {
    try {
      await api.patch(`/admin/skills/${skill.id}`, {
        name: editingName, canonical_name: skill.name,
        category: programCode, aliases: [], source: 'internpulse',
        is_active: true, is_matchable: true,
      });
      setEditingId(null);
      onChanged();
    } catch (e) { setError(apiError(e)); }
  };

  const remove = async (skill) => {
    if (!window.confirm('Delete this skill?')) return;
    try {
      await api.delete(`/admin/skills/${skill.id}`);
      onChanged();
    } catch (e) { setError(apiError(e)); }
  };

  const addSkill = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.post('/admin/skills', { name: newName.trim(), category: programCode });
      setNewName('');
      onChanged();
    } catch (e) { setError(apiError(e)); }
  };

  return (
    <Modal onClose={onClose} wide>
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-sm font-black">{programCode}</span>
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">{programName}</span>
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer dark:text-gray-400 dark:hover:text-gray-300">&times;</button>
      </div>
      {error && <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold">{error}</div>}
      <form onSubmit={addSkill} className="shrink-0 flex items-center gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Add new skill to this course directly..." className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white dark:placeholder:text-gray-400" />
        <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm shrink-0 cursor-pointer dark:bg-emerald-700">+ Add & Save</button>
      </form>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter competencies in this list..." className="shrink-0 w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white dark:placeholder:text-gray-400" />
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 pr-1 text-xs min-h-[120px]">
        {filtered.map((skill) => (
          <div key={skill.id} className="py-2 px-1 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg group transition">
            {editingId === skill.id ? (
              <div className="flex-1 flex items-center gap-2 mr-2">
                <input autoFocus value={editingName} onChange={(e) => setEditingName(e.target.value)} className="flex-1 bg-white dark:bg-gray-800 border border-emerald-500 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white dark:placeholder:text-gray-400" />
                <button onClick={() => saveEdit(skill)} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-sm cursor-pointer dark:bg-emerald-700">Save</button>
                <button onClick={() => setEditingId(null)} className="px-2 py-1 text-gray-500 hover:text-gray-700 text-[11px] cursor-pointer dark:text-gray-400 dark:hover:text-gray-300">Cancel</button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between">
                <span className="font-semibold text-gray-800 dark:text-gray-200">{skill.name}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditingId(skill.id); setEditingName(skill.name); }} className="text-blue-600 hover:text-blue-700 font-bold text-[11px] px-2 py-0.5 rounded hover:bg-blue-50 cursor-pointer dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/50">Edit</button>
                  <button onClick={() => remove(skill)} className="text-rose-500 hover:text-rose-700 font-bold text-[11px] px-2 py-0.5 rounded hover:bg-rose-50 cursor-pointer dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/50">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="py-8 text-center text-gray-400 dark:text-gray-400">No matching skills found in this program.</div>}
      </div>
      <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end shrink-0">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">Close</button>
      </div>
    </Modal>
  );
}

export default function SkillsPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [viewProgram, setViewProgram] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', category: '' });
  const [importFile, setImportFile] = useState(null);
  const [importMsg, setImportMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/skills-hub');
      setData(res.data.data);
    } catch (e) { setError(apiError(e)); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const exportCsv = async (category) => {
    try {
      await downloadFile('/admin/skills/export', {
        params: category ? { category } : {},
        filename: category ? `MinSU_Skills_${category}.csv` : 'MinSU_Master_Skills_Matrix.csv',
      });
    } catch (e) { setError(apiError(e)); }
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/skills', { name: addForm.name, category: addForm.category });
      setAddOpen(false);
      setAddForm({ name: '', category: '' });
      load();
    } catch (err) { setError(apiError(err)); }
  };

  const submitImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    const fd = new FormData();
    fd.append('skills_file', importFile);
    try {
      const res = await api.post('/admin/skills/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportMsg(res.data.message || 'Import complete.');
      setImportFile(null);
      setImportOpen(false);
      load();
    } catch (err) { setError(apiError(err)); }
  };

  if (!data) return <p className="py-12 text-center text-slate-500 dark:text-gray-400">{error || 'Loading…'}</p>;

  const programs = data.programs || {};
  const counts = data.counts || {};
  const samples = data.sample_skills || {};
  const byProgram = data.skills_by_program || {};

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#064e26] via-[#0b6333] to-[#043319] rounded-2xl shadow-xl p-6 sm:p-8 text-white border border-emerald-600/30 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide uppercase mb-2 text-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Skills & Competency Hub</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button onClick={() => exportCsv()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-[#064e26] font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer dark:bg-gray-900 dark:hover:bg-emerald-950/50 dark:text-emerald-300">
            <span>⬇ Export CSV</span>
          </button>
          <button onClick={() => { setImportMsg(''); setImportOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer dark:bg-emerald-700 dark:hover:bg-emerald-700">
            <span>Save from Excel</span>
          </button>
          <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm border border-white/20 backdrop-blur-md transition-all cursor-pointer">
            <span>+ Add Skill</span>
          </button>
        </div>
      </div>

      {importMsg && <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold">{importMsg}</div>}
      {error && <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm font-semibold">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm dark:text-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Competencies</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{(data.total_skills || 0).toLocaleString()}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5 dark:text-emerald-400">Active in Matching Database</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm dark:text-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">University Programs</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{Object.keys(programs).length} Programs</p>
          <p className="text-[11px] text-blue-600 font-medium mt-0.5 dark:text-blue-400">Mindoro State University Curricula</p>
        </div>
      </div>

      <div>
        <div className="mb-4"><h2 className="text-lg font-bold text-gray-900 dark:text-white">Academic Program Competencies</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Object.entries(programs).map(([code, info]) => {
            const count = counts[code] || 0;
            const sample = samples[code] || [];
            return (
              <div key={code} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group dark:text-gray-100">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-2 rounded-xl bg-gray-50 dark:bg-gray-800">{info.icon}</span>
                      <div>
                        <h3 className="text-sm font-extrabold text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{code}</h3>
                        <p className="text-[11px] text-gray-500 leading-tight dark:text-gray-400">{info.name}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60">{count} skills</span>
                  </div>
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-gray-400 mt-3 dark:text-gray-400">{info.department}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {sample.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">{s.length > 22 ? s.slice(0, 22) + '…' : s}</span>
                    ))}
                    {count > sample.length && <span className="px-1.5 py-0.5 text-[10px] text-gray-400 font-semibold dark:text-gray-400">+{count - sample.length} more</span>}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                  <button onClick={() => exportCsv(code)} className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer dark:text-emerald-300 dark:hover:text-emerald-300">⬇ Export</button>
                  <button onClick={() => setViewProgram({ code, name: info.name })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold transition-all shadow-sm cursor-pointer dark:hover:bg-emerald-950/50">
                    View / Edit ✎
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {viewProgram && (
        <ProgramSkillsModal
          programCode={viewProgram.code}
          programName={viewProgram.name}
          skills={byProgram[viewProgram.code] || []}
          onClose={() => setViewProgram(null)}
          onChanged={load}
        />
      )}

      {addOpen && (
        <Modal title="Add New Competency" onClose={() => setAddOpen(false)}>
          <form onSubmit={submitAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Skill Name *</label>
              <input required value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="e.g. Flutter Mobile App Dev" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Academic Program / Category *</label>
              <select required value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} className={inputCls}>
                <option value="">Select program…</option>
                {Object.entries(programs).map(([code, info]) => <option key={code} value={code}>{code} — {info.name}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer dark:bg-emerald-700">Save Skill</button>
            </div>
          </form>
        </Modal>
      )}

      {importOpen && (
        <Modal title="Save Competencies from Excel" onClose={() => setImportOpen(false)}>
          <p className="text-xs text-gray-600 dark:text-gray-300">Choose the CSV file you edited and saved in Excel.</p>
          <form onSubmit={submitImport} className="space-y-4">
            <input type="file" required accept=".csv,.txt" onChange={(e) => setImportFile(e.target.files[0])}
              className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 dark:text-gray-400" />
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button type="button" onClick={() => setImportOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer dark:bg-emerald-700">Save to System</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
