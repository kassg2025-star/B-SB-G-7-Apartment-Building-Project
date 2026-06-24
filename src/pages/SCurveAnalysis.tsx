import { useState } from 'react';
import ExcelImport from '../components/ExcelImport';
import PageHeader from '../components/PageHeader';
import SCurveChart from '../components/SCurveChart';
import { pct } from '../data/projectData';
import { useProject } from '../store/projectStore';
import type { MonthlyProgress } from '../data/projectData';

export default function SCurveAnalysis() {
  const project = useProject();
  const [extraRows, setExtraRows] = useState<MonthlyProgress[]>([]);

  const handleImport = (records: Record<string, string>[]) => {
    const imported: MonthlyProgress[] = records
      .filter(r => r['Month'] && r['Planned%'])
      .map(r => ({
        month:    r['Month'] ?? '',
        planned:  parseFloat(r['Planned%'] ?? '0') || 0,
        actual:   parseFloat(r['Actual%']  ?? '0') || 0,
        variance: parseFloat(r['Variance'] ?? '0') || 0,
        note:     r['Note'] || undefined,
      }));
    setExtraRows(imported);
  };

  const allRows = [...project.progress.monthly, ...extraRows];

  return (
    <>
      <PageHeader
        title="S-Curve Analysis"
        subtitle="Planned vs actual cumulative progress — Jan to May 2026"
      />

      <ExcelImport
        moduleId="progress"
        label="Import Monthly Progress Data (Excel / CSV)"
        templateColumns={['Month', 'Planned%', 'Actual%', 'Variance', 'Note']}
        templateRows={[
          ['Jan 2026', '4.27', '0.5', '-3.77', ''],
          ['Feb 2026', '13.45', '2.1', '-11.35', 'Deep earthworks'],
        ]}
        onImport={handleImport}
      />
      <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="card kpi-accent">
          <div className="card-label">Planned (May)</div>
          <div className="card-value">{pct(project.progress.currentPlanned)}</div>
        </div>
        <div className="card kpi-danger">
          <div className="card-label">Actual (May)</div>
          <div className="card-value">{pct(project.progress.currentActual)}</div>
        </div>
        <div className="card kpi-warning">
          <div className="card-label">SPI</div>
          <div className="card-value">{project.progress.spi}</div>
          <div className="card-sub">Schedule Performance Index</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-title">Cumulative Progress S-Curve</div>
        <SCurveChart data={allRows} />
      </div>

      <div className="card">
        <div className="section-title">Monthly Variance Register {extraRows.length > 0 && <span className="badge badge-success" style={{marginLeft:'0.5rem'}}>+{extraRows.length} imported</span>}</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Planned %</th>
              <th>Actual %</th>
              <th>Variance</th>
              <th>Site Notes</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((m) => (
              <tr key={m.month}>
                <td>{m.month}</td>
                <td>{pct(m.planned)}</td>
                <td>{pct(m.actual)}</td>
                <td className="variance-neg">{pct(m.variance)}</td>
                <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{m.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
