import PageHeader from '../components/PageHeader';
import { formatETB, pct } from '../data/projectData';
import { STORE_MODULES, useProject, useProjectStore, useStoreMeta } from '../store/projectStore';

export default function ProjectDataCenter() {
  const project = useProject();
  const meta = useStoreMeta();
  const reset = useProjectStore((s) => s.resetToPreloaded);

  const dataInventory = [
    { domain: 'Progress & S-Curve', records: project.progress.monthly.length, unit: 'months' },
    { domain: 'Delay Events', records: project.delayEvents.length, unit: 'events' },
    { domain: 'Roadblocks', records: project.roadblocks.length, unit: 'items' },
    { domain: 'May Quantities', records: project.mayQuantities.length, unit: 'BOQ lines' },
    { domain: 'NCR Register', records: project.quality.ncrs.length, unit: 'NCRs' },
    { domain: 'Rebar Tests', records: project.rebarTests.length, unit: 'samples' },
    { domain: 'Site Instructions', records: project.siteInstructions.length, unit: 'SIs' },
    { domain: 'Equipment', records: project.resources.equipment.length, unit: 'assets' },
    { domain: 'Materials', records: project.resources.materials.length, unit: 'items' },
    { domain: 'Cash Flow', records: project.cashFlow.length, unit: 'months' },
    { domain: 'HSE Incidents', records: project.hse.incidents.length, unit: 'records' },
  ];

  const sections = [
    {
      title: 'Contract & Parties',
      rows: [
        ['Project Name', project.name],
        ['Location', project.location],
        ['Contract ID', project.contractId],
        ['Employer', project.employer],
        ['Consultant', project.consultant],
        ['Contractor', project.contractor],
        ['Project Manager', project.projectManager],
      ],
    },
    {
      title: 'Key Dates',
      rows: [
        ['Contract Signing', project.dates.contractSigning],
        ['Site Commencement', project.dates.siteCommencement],
        ['Original Completion', project.dates.originalCompletion],
        ['Contract Duration', `${project.dates.contractDurationDays} calendar days`],
        ['Days Elapsed', String(project.dates.daysElapsed)],
        ['Days Remaining', String(project.dates.daysRemaining)],
        ['EOT Revised Completion', project.eot.revisedCompletionEstimate],
      ],
    },
    {
      title: 'Financial Summary',
      rows: [
        ['Original Contract Value', `${formatETB(project.financial.originalContractValue)} ETB`],
        ['Advance Payment (20% + VAT)', `${formatETB(project.financial.advancePayment)} ETB`],
        ['IPC-01 (Paid)', `${formatETB(project.financial.ipc01Certified)} ETB`],
        ['IPC-02 (Estimate)', `${formatETB(project.financial.ipc02Estimate)} ETB`],
      ],
    },
    {
      title: 'Progress & Performance',
      rows: [
        ['Status', project.progress.status],
        ['SPI', String(project.progress.spi)],
        ['CPI', String(project.progress.cpi)],
        ['Actual Progress', pct(project.progress.currentActual)],
        ['Planned Progress', pct(project.progress.currentPlanned)],
        ['Schedule Variance', pct(project.progress.monthly[4].variance)],
      ],
    },
    {
      title: 'Geotechnical & Excavation',
      rows: [
        ['Final Depth', `${project.excavation.finalDepth}m BGL`],
        ['Geological Profile', project.excavation.geologicalProfile],
        ['Stabilization', project.excavation.stabilization],
      ],
    },
    {
      title: 'EOT Claim',
      rows: [
        ['Reference', project.eot.referenceNo],
        ['Submitted', project.eot.submittedDate],
        ['Days Claimed', String(project.eot.claimedDays)],
        ['Status', project.eot.status],
      ],
    },
  ];

  return (
    <>
      <PageHeader
        title="Project Data Center"
        subtitle="Zustand-powered single source of truth — preloaded Kassa & Sons intelligence"
        badge={{ text: 'Preloaded', variant: 'success' }}
      />

      <div className="card preload-panel" style={{ marginBottom: '1.5rem' }}>
        <div className="section-title">Zustand Store — Preloaded Dataset</div>
        <div className="preload-grid">
          <div>
            <div className="card-label">Data Source</div>
            <p className="preload-value">{meta.source}</p>
          </div>
          <div>
            <div className="card-label">Store Version</div>
            <p className="preload-value">v{meta.version}</p>
          </div>
          <div>
            <div className="card-label">Modules Active</div>
            <p className="preload-value">{meta.modules.length} / {STORE_MODULES.length}</p>
          </div>
          <div>
            <div className="card-label">Last Loaded</div>
            <p className="preload-value">
              {new Date(meta.preloadedAt).toLocaleString('en-GB')}
            </p>
          </div>
        </div>
        <div className="module-chips">
          {STORE_MODULES.map((m) => (
            <span key={m} className="module-chip">{m}</span>
          ))}
        </div>
        <button type="button" className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={reset}>
          Reset Store to Preloaded Kassa Data
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-title">Preloaded Data Inventory</div>
        <table className="data-table">
          <thead>
            <tr><th>Domain</th><th>Records</th><th>Type</th></tr>
          </thead>
          <tbody>
            {dataInventory.map((d) => (
              <tr key={d.domain}>
                <td>{d.domain}</td>
                <td><strong>{d.records}</strong></td>
                <td style={{ color: 'var(--muted)' }}>{d.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="data-center-grid">
        {sections.map((s) => (
          <div className="card" key={s.title}>
            <div className="section-title">{s.title}</div>
            <table className="data-table">
              <tbody>
                {s.rows.map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ width: '40%', color: 'var(--muted)' }}>{k}</td>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="section-title">Monthly Progress Data (S-Curve Source)</div>
        <table className="data-table">
          <thead>
            <tr><th>Month</th><th>Planned</th><th>Actual</th><th>Variance</th><th>Notes</th></tr>
          </thead>
          <tbody>
            {project.progress.monthly.map((m) => (
              <tr key={m.month}>
                <td>{m.month}</td>
                <td>{pct(m.planned)}</td>
                <td>{pct(m.actual)}</td>
                <td className="variance-neg">{pct(m.variance)}</td>
                <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{m.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
