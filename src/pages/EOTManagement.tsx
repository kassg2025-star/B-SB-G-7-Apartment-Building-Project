import { useState } from 'react';
import ExcelImport from '../components/ExcelImport';
import PageHeader from '../components/PageHeader';
import { pct } from '../data/projectData';
import { useProject, useProjectStore } from '../store/projectStore';
import type { Roadblock } from '../data/projectData';

const EOT_STATUSES = [
  'Pending Consultant Approval',
  'Under Review',
  'Approved',
  'Rejected — Under Appeal',
];

export default function EOTManagement() {
  const project = useProject();
  const updateEotStatus = useProjectStore((s) => s.updateEotStatus);
  const [extraRoadblocks, setExtraRoadblocks] = useState<Roadblock[]>([]);

  const allRoadblocks = [...project.roadblocks, ...extraRoadblocks];

  const handleImport = (records: Record<string, string>[]) => {
    const imported: Roadblock[] = records.filter(r => r['Title']).map((r, i) => ({
      id:        project.roadblocks.length + i + 1,
      title:     r['Title'] ?? '',
      detail:    r['Detail'] ?? '',
      delayDays: parseInt(r['DelayDays'] ?? '0') || 0,
      category:  (r['Category'] as Roadblock['category']) ?? 'Logistical',
    }));
    setExtraRoadblocks(imported);
  };

  return (
    <>
      <PageHeader
        title="EOT Claim Management"
        subtitle={`Ref: ${project.eot.referenceNo} · Submitted ${project.eot.submittedDate}`}
        badge={{ text: project.eot.status, variant: 'warning' }}
      />

      <ExcelImport
        moduleId="eot-roadblocks"
        label="Import EOT Disruptions / Roadblocks (Excel / CSV)"
        templateColumns={['Title','Category','DelayDays','Detail']}
        templateRows={[['Additional rock formation','Geological','5','Unexpected rock layer at -8m']]}
        onImport={handleImport}
      />
      <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="card kpi-accent">
          <div className="card-label">Claimed Extension</div>
          <div className="card-value">{project.eot.claimedDays} Days</div>
        </div>
        <div className="card">
          <div className="card-label">Original Completion</div>
          <div className="card-value sm">{project.dates.originalCompletion}</div>
        </div>
        <div className="card kpi-warning">
          <div className="card-label">Revised Completion</div>
          <div className="card-value sm">{project.eot.revisedCompletionEstimate}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-title">Claim Status Tracker</div>
        <div className="status-tracker">
          {EOT_STATUSES.map((s, i) => (
            <button
              key={s}
              type="button"
              className={`status-step${project.eot.status === s ? ' active' : ''}${i < EOT_STATUSES.indexOf(project.eot.status) ? ' done' : ''}`}
              onClick={() => updateEotStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="card-sub" style={{ marginTop: '1rem' }}>
          Click a status to update claim tracker (local store). Schedule variance:{' '}
          <span className="variance-neg">{pct(project.progress.monthly[4].variance)}</span>
        </p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="section-title">Entitlement Summary</div>
          <table className="data-table">
            <thead>
              <tr><th>Disruption</th><th>Category</th><th>Days</th></tr>
            </thead>
            <tbody>
              {allRoadblocks.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>{r.category}</td>
                  <td className="variance-neg">+{r.delayDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="section-title">Mitigation & Supporting Records</div>
          <ul className="check-list">
            <li>Manual chisel crew post-excavator failure</li>
            <li>Soil Nailing deep-pit stabilization</li>
            <li>24/7 dewatering (3 pumps)</li>
            <li>Emergency shoring post 20/05/2026 collapse</li>
            <li>Full SI-012 compliance documented</li>
            <li>Cube test CP-F1-01 passed</li>
            <li>Zero LTIs over {project.hse.elapsedDays} days</li>
          </ul>
        </div>
      </div>
    </>
  );
}
