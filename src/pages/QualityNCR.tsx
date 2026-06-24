import { useState } from 'react';
import ExcelImport from '../components/ExcelImport';
import PageHeader from '../components/PageHeader';
import { useProject, useProjectStore } from '../store/projectStore';
import type { NCRRecord } from '../data/projectData';

export default function QualityNCR() {
  const project = useProject();
  const updateNcrStatus = useProjectStore((s) => s.updateNcrStatus);
  const [extraNcrs, setExtraNcrs] = useState<NCRRecord[]>([]);

  const allNcrs = [...project.quality.ncrs, ...extraNcrs];
  const openCount = allNcrs.filter((n) => n.status === 'Open' || n.status === 'Quarantined').length;

  const handleImport = (records: Record<string, string>[]) => {
    const imported: NCRRecord[] = records.filter(r => r['ID']).map(r => ({
      id:     r['ID'] ?? '',
      date:   r['Date'] ?? '',
      status: (r['Status'] as NCRRecord['status']) ?? 'Open',
      item:   r['Item'] ?? '',
      batch:  r['Batch'] ?? 'N/A',
      detail: r['Detail'] ?? '',
      action: r['Action'] ?? '',
    }));
    setExtraNcrs(imported);
  };

  return (
    <>
      <PageHeader
        title="Quality Control & NCR Tracking"
        subtitle="Concrete testing, reinforcement QA, and non-conformance register"
        badge={{ text: `${openCount} Open NCR`, variant: openCount > 0 ? 'warning' : 'success' }}
      />

      <ExcelImport
        moduleId="ncr"
        label="Import NCR Records (Excel / CSV)"
        templateColumns={['ID','Date','Item','Batch','Status','Detail','Action']}
        templateRows={[['NCR-006','2026-06-01','Formwork','N/A','Open','Deviation at grid D-2','Rework required']]}
        onImport={handleImport}
      />
      <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="card kpi-success">
          <div className="card-label">Concrete — F-1</div>
          <div className="card-value sm">CP-F1-01 Passed</div>
          <div className="card-sub">7-day cube compression</div>
        </div>
        <div className="card kpi-warning">
          <div className="card-label">Open NCRs</div>
          <div className="card-value">{openCount}</div>
        </div>
        <div className="card kpi-danger">
          <div className="card-label">Quarantined Batch</div>
          <div className="card-value sm">B-2026-45</div>
          <div className="card-sub">Ø20mm reinforcement</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-title">Rebar Tensile Test Results</div>
        <table className="data-table">
          <thead>
            <tr><th>Diameter</th><th>Result</th></tr>
          </thead>
          <tbody>
            {project.rebarTests.map((t) => (
              <tr key={t.diameter}>
                <td>{t.diameter}</td>
                <td>
                  <span className={`badge badge-${t.result === 'Passed' ? 'success' : 'danger'}`}>
                    {t.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-title">Cube Test Register</div>
        <table className="data-table">
          <thead>
            <tr><th>Sample ID</th><th>Age</th><th>Result</th></tr>
          </thead>
          <tbody>
            {project.quality.cubeTests.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.age}</td>
                <td>
                  <span className={`badge badge-${t.result === 'Passed' ? 'success' : 'warning'}`}>
                    {t.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="card-sub" style={{ marginTop: '0.75rem' }}>{project.quality.concrete}</p>
      </div>

      <div className="card">
        <div className="section-title">Non-Conformance Reports (NCR) {extraNcrs.length > 0 && <span className="badge badge-success" style={{marginLeft:'0.5rem'}}>+{extraNcrs.length} imported</span>}</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th><th>Date</th><th>Item</th><th>Batch</th><th>Detail</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {allNcrs.map((n) => (
              <tr key={n.id}>
                <td><strong>{n.id}</strong></td>
                <td>{n.date}</td>
                <td>{n.item}</td>
                <td>{n.batch}</td>
                <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{n.detail}</td>
                <td>
                  <select
                    className="status-select"
                    value={n.status}
                    onChange={(e) => updateNcrStatus(n.id, e.target.value as typeof n.status)}
                  >
                    <option value="Open">Open</option>
                    <option value="Quarantined">Quarantined</option>
                    <option value="Closed">Closed</option>
                  </select>
                </td>
                <td style={{ fontSize: '0.8rem' }}>{n.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
