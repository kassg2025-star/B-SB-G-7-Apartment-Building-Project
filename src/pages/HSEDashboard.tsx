import { useState } from 'react';
import ExcelImport from '../components/ExcelImport';
import PageHeader from '../components/PageHeader';
import { useProject } from '../store/projectStore';

export default function HSEDashboard() {
  const { hse } = useProject();
  const [extraIncidents, setExtraIncidents] = useState<typeof hse.incidents>([]);
  const [extraInspections, setExtraInspections] = useState<typeof hse.inspections>([]);

  const allIncidents = [...hse.incidents, ...extraIncidents];
  const allInspections = [...hse.inspections, ...extraInspections];

  const handleIncidentImport = (records: Record<string, string>[]) => {
    const imported = records.filter(r => r['Date'] && r['Type']).map(r => ({
      date:   r['Date'] ?? '',
      type:   r['Type'] ?? '',
      action: r['CorrectiveAction'] ?? '',
    }));
    setExtraIncidents(imported);
  };

  const handleInspectionImport = (records: Record<string, string>[]) => {
    const imported = records.filter(r => r['Date']).map(r => ({
      date:      r['Date'] ?? '',
      score:     parseInt(r['Score'] ?? '0') || 0,
      inspector: r['Inspector'] ?? '',
    }));
    setExtraInspections(imported);
  };

  return (
    <>
      <PageHeader
        title="HSE Dashboard"
        subtitle={`Health, Safety & Environment — ${hse.elapsedDays} elapsed site days`}
        badge={{ text: `${hse.lti} LTI`, variant: 'success' }}
      />

      <ExcelImport
        moduleId="hse-incidents"
        label="Import HSE Incidents (Excel / CSV)"
        templateColumns={['Date','Type','CorrectiveAction']}
        templateRows={[['2026-06-01','Near Miss — falling object','Toolbox talk conducted']]}
        onImport={handleIncidentImport}
      />
      <ExcelImport
        moduleId="hse-inspections"
        label="Import HSE Inspection Scores (Excel / CSV)"
        templateColumns={['Date','Score','Inspector']}
        templateRows={[['2026-06-28','97','Site HSE Officer']]}
        onImport={handleInspectionImport}
      />
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card kpi-success">
          <div className="card-label">Lost Time Injuries</div>
          <div className="card-value">{hse.lti}</div>
        </div>
        <div className="card kpi-warning">
          <div className="card-label">Near Misses</div>
          <div className="card-value">{hse.nearMiss}</div>
        </div>
        <div className="card kpi-success">
          <div className="card-label">PPE Compliance</div>
          <div className="card-value">{hse.ppeCompliance}%</div>
        </div>
        <div className="card">
          <div className="card-label">Site Days</div>
          <div className="card-value">{hse.elapsedDays}</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="section-title">Incident & Near-Miss Log</div>
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Type</th><th>Corrective Action</th></tr>
            </thead>
            <tbody>
              {allIncidents.map((i) => (
                <tr key={i.date + i.type}>
                  <td>{i.date}</td>
                  <td>{i.type}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{i.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="section-title">HSE Inspection Scores</div>
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Inspector</th><th>Score</th></tr>
            </thead>
            <tbody>
              {allInspections.map((i) => (
                <tr key={i.date}>
                  <td>{i.date}</td>
                  <td>{i.inspector}</td>
                  <td>
                    <span className={`badge badge-${i.score >= 95 ? 'success' : 'warning'}`}>
                      {i.score}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Post-Collapse Corrective Measures (20/05/2026)</div>
        <ul className="check-list">
          <li>Emergency structural shoring deployed overnight</li>
          <li>Night watchmen protocol activated at excavation pit</li>
          <li>Soil Nailing reinforcement verified by RE</li>
          <li>24/7 dewatering maintained (3 pumping units)</li>
          <li>Daily pit-face inspection mandatory before each shift</li>
        </ul>
      </div>
    </>
  );
}
