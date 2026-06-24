import { useNavigate } from 'react-router-dom';
import { ExecutiveKPIGrid } from '../components/KPICard';
import PageHeader from '../components/PageHeader';
import SCurveChart from '../components/SCurveChart';
import SiteProgressCard from '../components/SiteProgressCard';
import DailyUpdatesCard from '../components/DailyUpdatesCard';
import { formatETB, pct } from '../data/projectData';
import { useKPIs, useProject } from '../store/projectStore';

export default function ExecutiveDashboard() {
  const project  = useProject();
  const kpis     = useKPIs();
  const navigate = useNavigate();
  const last     = project.progress.monthly[project.progress.monthly.length - 1];

  const alerts = [
    {
      variant: kpis.scheduleVariance < -20 ? 'danger' : 'warning' as const,
      title:   `Schedule — ${pct(last.variance)} variance`,
      body:    `SPI ${project.progress.spi} · Actual ${pct(project.progress.currentActual)} vs Planned ${pct(project.progress.currentPlanned)}`,
      route:   '/s-curve',
    },
    ...project.quality.ncrs
      .filter(n => n.status === 'Open' || n.status === 'Quarantined')
      .map(n => ({
        variant: 'warning' as const,
        title:   `${n.id} Open — ${n.item} (${n.batch})`,
        body:    n.detail,
        route:   '/quality',
      })),
    {
      variant: project.eot.status === 'Approved' ? 'success' : 'warning' as const,
      title:   `EOT ${project.eot.claimedDays}d — ${project.eot.status}`,
      body:    `Ref ${project.eot.referenceNo} · Submitted ${project.eot.submittedDate}`,
      route:   '/eot',
    },
    {
      variant: project.hse.lti === 0 ? 'success' : 'danger' as const,
      title:   project.hse.lti === 0 ? 'HSE — Zero LTIs' : `HSE — ${project.hse.lti} LTI Recorded`,
      body:    `${project.hse.ppeCompliance}% PPE compliance over ${project.hse.elapsedDays} site days`,
      route:   '/hse',
    },
    ...project.resources.materials
      .filter(m => m.status === 'Critical')
      .map(m => ({
        variant: 'danger' as const,
        title:   `Material Critical — ${m.material}`,
        body:    `${m.consumed}/${m.required} ${m.unit} · Lead: ${m.leadTimeDays}d`,
        route:   '/resources',
      })),
  ].slice(0, 6);

  return (
    <>
      <PageHeader
        title="Executive Dashboard"
        subtitle={`${project.name} — ${project.location}`}
        badge={{ text: project.progress.status, variant: 'danger' }}
      />

      {/* ── 1. Site Progress + Daily Updates — two separate cards ── */}
      <div className="grid grid-2" style={{ marginBottom: '1.75rem' }}>
        <SiteProgressCard projectManager={project.projectManager} compact maxVisible={6} />
        <DailyUpdatesCard projectManager={project.projectManager} compact maxVisible={5} />
      </div>

      {/* ── 2. Exec meta strip ── */}
      <div className="exec-strip" style={{ marginBottom: '1.5rem' }}>
        <div><span>Contract </span><strong>{project.contractId}</strong></div>
        <div><span>PM </span><strong>{project.projectManager}</strong></div>
        <div><span>Commencement </span><strong>{project.dates.siteCommencement}</strong></div>
        <div><span>Completion </span><strong>{project.dates.originalCompletion}</strong></div>
        <div><span>EOT </span><strong>{project.eot.claimedDays}d — {project.eot.status}</strong></div>
        <div style={{ marginLeft: 'auto' }}>
          <button type="button" className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
            onClick={() => navigate('/alerts')}>
            🔔 Alerts
          </button>
        </div>
      </div>

      {/* ── 3. KPI grid ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <ExecutiveKPIGrid kpis={kpis} />
      </div>

      {/* ── 4. S-Curve + Live Alerts ── */}
      <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/s-curve')}>
          <div className="section-title" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>S-Curve Snapshot</span>
            <span style={{ fontSize:'0.72rem', color:'var(--muted)' }}>Click to expand →</span>
          </div>
          <SCurveChart data={project.progress.monthly} height={180} showForecast />
        </div>

        <div className="card">
          <div className="section-title" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>Live Alerts</span>
            <button type="button" className="btn-ghost"
              style={{ fontSize:'0.72rem', padding:'0.2rem 0.6rem' }}
              onClick={() => navigate('/alerts')}>
              View All
            </button>
          </div>
          <div className="alert-list">
            {alerts.map((a, i) => (
              <div key={i} className={`alert-item alert-${a.variant}`}
                style={{ cursor:'pointer' }} onClick={() => navigate(a.route)}>
                <strong>{a.title}</strong>
                <p>{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 5. Bottom summary cards ── */}
      <div className="grid grid-3">
        <div className="card" style={{ cursor:'pointer' }} onClick={() => navigate('/financial')}>
          <div className="section-title">
            Financial Snapshot <span style={{ fontSize:'0.65rem', color:'var(--muted)', fontWeight:400 }}>→</span>
          </div>
          <table className="data-table">
            <tbody>
              <tr><td>Contract Value</td><td><strong>{formatETB(project.financial.originalContractValue)}</strong></td></tr>
              <tr><td>Total Received</td><td>{formatETB(kpis.totalReceived)}</td></tr>
              <tr><td>IPC-02 Pending</td><td style={{ color:'var(--warning)' }}>{formatETB(project.financial.ipc02Estimate)}</td></tr>
              <tr><td>Cash Position</td><td>{formatETB(project.cashFlow[project.cashFlow.length - 1]?.cumulative ?? 0)}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="card" style={{ cursor:'pointer' }} onClick={() => navigate('/resources')}>
          <div className="section-title">
            Substructure Status <span style={{ fontSize:'0.65rem', color:'var(--muted)', fontWeight:400 }}>→</span>
          </div>
          <table className="data-table">
            <tbody>
              <tr><td>Excavation Depth</td><td>{project.excavation.finalDepth}m BGL</td></tr>
              <tr><td>Stabilization</td><td style={{ fontSize:'0.8rem' }}>Soil Nailing</td></tr>
              <tr><td>Foundation F-1</td><td><span className="badge badge-success">CP-F1-01 Passed</span></td></tr>
              <tr><td>Active Workers</td><td>{project.resources.workforce}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="card" style={{ cursor:'pointer' }} onClick={() => navigate('/resources')}>
          <div className="section-title">
            Workforce — May 2026 <span style={{ fontSize:'0.65rem', color:'var(--muted)', fontWeight:400 }}>→</span>
          </div>
          <table className="data-table">
            <tbody>
              <tr><td>Active Workers</td><td>{project.resources.workforce}</td></tr>
              <tr><td>Man-Days</td><td>{project.resources.manDaysMay}</td></tr>
              <tr><td>Avg Daily Workers</td><td>{project.resources.avgDailyWorkers}</td></tr>
              <tr><td>Payroll (May)</td><td>{formatETB(project.resources.payrollMay)} ETB</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
