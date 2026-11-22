export default function DeploymentSelector({ deployments = [], placement, canWrite, onChange }) {
  return (
    <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
      <label className="block text-xs font-semibold mb-2" htmlFor="deployment-selector">Deployment history</label>
      <select id="deployment-selector" className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        value={placement?.id || ''} onChange={(e) => onChange(e.target.value)}>
        {deployments.map((item) => <option key={item.id} value={item.id}>
          {(item.internship_posting?.company_profile?.company_name || 'Company') + ' | ' + item.start_date?.slice(0, 10) + ' | ' + item.status.replaceAll('_', ' ')}
        </option>)}
      </select>
      {!canWrite && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
        This deployment is read-only. Previous journals and attendance stay with their original company. Contact your coordinator for pending attendance.
      </p>}
      {placement?.last_working_date && <p className="mt-2 text-xs">Last working day: {placement.last_working_date.slice(0, 10)}</p>}
    </div>
  );
}
