import { useState } from 'react';
import ExcelImport from '../components/ExcelImport';
import PageHeader from '../components/PageHeader';
import { execPct, formatETB } from '../data/projectData';
import { useProject } from '../store/projectStore';
import type { QuantityItem, MaterialForecast } from '../data/projectData';

export default function ResourceManagement() {
  const project = useProject();
  const [extraQty, setExtraQty] = useState<QuantityItem[]>([]);
  const [extraMat, setExtraMat] = useState<MaterialForecast[]>([]);

  const allQty = [...project.mayQuantities, ...extraQty];
  const allMat = [...project.resources.materials, ...extraMat];

  const handleQtyImport = (records: Record<string, string>[]) => {
    const imported: QuantityItem[] = records.filter(r => r['Item']).map(r => ({
      item:     r['Item'] ?? '',
      unit:     r['Unit'] ?? '',
      executed: parseFloat(r['Executed'] ?? '0') || 0,
      planned:  r['Planned'] ? parseFloat(r['Planned']) || null : null,
    }));
    setExtraQty(imported);
  };

  const handleMatImport = (records: Record<string, string>[]) => {
    const imported: MaterialForecast[] = records.filter(r => r['Material']).map(r => ({
      material:     r['Material'] ?? '',
      unit:         r['Unit'] ?? '',
      consumed:     parseFloat(r['Consumed'] ?? '0') || 0,
      required:     parseFloat(r['Required'] ?? '0') || 0,
      leadTimeDays: parseInt(r['LeadDays'] ?? '0') || 0,
      status:       (r['Status'] as MaterialForecast['status']) ?? 'On Track',
    }));
    setExtraMat(imported);
  };

  return (
    <>
      <PageHeader
        title="Resource Management"
        subtitle="Workforce, equipment, materials & May 2026 quantified execution"
      />

      <ExcelImport
        moduleId="quantities"
        label="Import BOQ Quantities (Excel / CSV)"
        templateColumns={['Item','Unit','Executed','Planned']}
        templateRows={[['Bulk Excavation','m³','18','64'],['Rock Chiseling','m³','210','350']]}
        onImport={handleQtyImport}
      />
      <ExcelImport
        moduleId="materials"
        label="Import Material Forecast (Excel / CSV)"
        templateColumns={['Material','Unit','Consumed','Required','LeadDays','Status']}
        templateRows={[['C25/C30 Concrete','m³','29.65','64','3','On Track']]}
        onImport={handleMatImport}
      />
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-label">Active Workforce</div>
          <div className="card-value">{project.resources.workforce}</div>
        </div>
        <div className="card">
          <div className="card-label">Man-Days (May)</div>
          <div className="card-value">{project.resources.manDaysMay}</div>
        </div>
        <div className="card">
          <div className="card-label">Avg Daily Workers</div>
          <div className="card-value">{project.resources.avgDailyWorkers}</div>
        </div>
        <div className="card kpi-accent">
          <div className="card-label">Payroll (May)</div>
          <div className="card-value sm">{formatETB(project.resources.payrollMay)}</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="section-title">Equipment Register</div>
          <table className="data-table">
            <thead>
              <tr><th>Equipment</th><th>Status</th></tr>
            </thead>
            <tbody>
              {project.resources.equipment.map((e) => (
                <tr key={e.name}>
                  <td>{e.name}</td>
                  <td>
                    <span className={`badge badge-${e.status.includes('Breakdown') ? 'danger' : e.status.includes('Active') ? 'warning' : 'success'}`}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="section-title">Material Forecast & Status</div>
          <table className="data-table">
            <thead>
              <tr><th>Material</th><th>Used / Req</th><th>Lead</th><th>Status</th></tr>
            </thead>
            <tbody>
              {allMat.map((m) => (
                <tr key={m.material}>
                  <td>{m.material}</td>
                  <td>{m.consumed} / {m.required} {m.unit}</td>
                  <td>{m.leadTimeDays}d</td>
                  <td>
                    <span className={`badge badge-${m.status === 'Critical' ? 'danger' : m.status === 'At Risk' ? 'warning' : 'success'}`}>
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="section-title">May 2026 Quantified Execution {extraQty.length > 0 && <span className="badge badge-success" style={{marginLeft:'0.5rem'}}>+{extraQty.length} imported</span>}</div>
        <table className="data-table">
          <thead>
            <tr><th>Item</th><th>Executed</th><th>Planned</th><th>Completion</th></tr>
          </thead>
          <tbody>
            {allQty.map((q) => (
              <tr key={q.item}>
                <td>{q.item}</td>
                <td>{q.executed} {q.unit}</td>
                <td>{q.planned != null ? `${q.planned} ${q.unit}` : '—'}</td>
                <td>{execPct(q.executed, q.planned)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
