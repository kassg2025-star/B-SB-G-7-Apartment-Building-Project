import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useProject } from '../store/projectStore';
import { pct, formatETB } from '../data/projectData';

type Severity = 'critical' | 'warning' | 'info' | 'success';
type Category = 'Schedule' | 'Financial' | 'Quality' | 'HSE' | 'EOT' | 'Procurement' | 'Custom';

interface Alert {
  id: string;
  date: string;
  category: Category;
  severity: Severity;
  title: string;
  detail: string;
  acknowledged: boolean;
  action: string;
}

const todayStr = () => new Date().toISOString().substring(0, 10);

function buildAutoAlerts(project: ReturnType<typeof useProject>): Alert[] {
  const alerts: Alert[] = [];
  const last = project.progress.monthly[project.progress.monthly.length - 1];

  if (project.progress.spi < 0.5) alerts.push({
    id: 'AUTO-001', date: todayStr(), category: 'Schedule', severity: 'critical',
    title: `SPI Critical — ${project.progress.spi} (below 0.5)`,
    detail: `Cumulative variance: ${pct(last.variance)}. Actual: ${pct(project.progress.currentActual)} vs Planned: ${pct(project.progress.currentPlanned)}.`,
    acknowledged: false, action: 'Review S-Curve and update recovery plan.',
  });

  if (project.eot.status === 'Pending Consultant Approval') alerts.push({
    id: 'AUTO-002', date: todayStr(), category: 'EOT', severity: 'warning',
    title: `EOT Claim Pending — ${project.eot.claimedDays} days (${project.eot.referenceNo})`,
    detail: `Submitted: ${project.eot.submittedDate}. Revised completion: ${project.eot.revisedCompletionEstimate}.`,
    acknowledged: false, action: 'Follow up with consultant for acknowledgement letter.',
  });

  project.quality.ncrs.filter(n => n.status === 'Open' || n.status === 'Quarantined').forEach(n =>
    alerts.push({
      id: `AUTO-NCR-${n.id}`, date: n.date, category: 'Quality',
      severity: n.status === 'Quarantined' ? 'critical' : 'warning',
      title: `${n.id} Open — ${n.item} (${n.batch})`,
      detail: n.detail, acknowledged: false, action: n.action,
    })
  );

  const lastCF = project.cashFlow[project.cashFlow.length - 1];
  if (lastCF && lastCF.cumulative < 5_000_000) alerts.push({
    id: 'AUTO-003', date: todayStr(), category: 'Financial', severity: 'critical',
    title: `Cash Position Low — ${formatETB(lastCF.cumulative)} ETB`,
    detail: `Projected for ${lastCF.month}. IPC-02 (${formatETB(project.financial.ipc02Estimate)} ETB) not yet certified.`,
    acknowledged: false, action: 'Expedite IPC-02 certification.',
  });

  project.resources.materials.filter(m => m.status === 'Critical').forEach(m =>
    alerts.push({
      id: `AUTO-MAT-${m.material.replace(/\s+/g, '-')}`, date: todayStr(),
      category: 'Procurement', severity: 'critical',
      title: `Material Critical — ${m.material}`,
      detail: `Consumed: ${m.consumed} / Required: ${m.required} ${m.unit}. Lead: ${m.leadTimeDays}d.`,
      acknowledged: false, action: 'Source alternative supplier immediately.',
    })
  );

  project.resources.materials.filter(m => m.status === 'At Risk').forEach(m =>
    alerts.push({
      id: `AUTO-RISK-${m.material.replace(/\s+/g, '-')}`, date: todayStr(),
      category: 'Procurement', severity: 'warning',
      title: `Material At Risk — ${m.material}`,
      detail: `Consumed: ${m.consumed} / Required: ${m.required} ${m.unit}. Lead: ${m.leadTimeDays}d.`,
      acknowledged: false, action: 'Review procurement schedule.',
    })
  );

  if (project.hse.ppeCompliance < 95) alerts.push({
    id: 'AUTO-HSE-001', date: todayStr(), category: 'HSE', severity: 'warning',
    title: `PPE Compliance Below Target — ${project.hse.ppeCompliance}%`,
    detail: 'Target is 100%. Toolbox talk and inspection required.',
    acknowledged: false, action: 'Conduct unannounced PPE inspection.',
  });

  if (project.dates.daysRemaining < 60) alerts.push({
    id: 'AUTO-TIME-001', date: todayStr(), category: 'Schedule', severity: 'critical',
    title: `Contract End Approaching — ${project.dates.daysRemaining} days remaining`,
    detail: `Original completion: ${project.dates.originalCompletion}.`,
    acknowledged: false, action: 'Confirm EOT approval before contract end.',
  });

  return alerts;
}

const sevBadge = (s: Severity) =>
  ({ critical: 'badge-danger', warning: 'badge-warning', info: 'badge-muted', success: 'badge-success' }[s]);

const sevBorder = (s: Severity) =>
  ({ critical: 'var(--danger)', warning: 'var(--warning)', info: 'var(--muted)', success: 'var(--success)' }[s]);

export default function AlertsCentre() {
  const project = useProject();
  const [alerts, setAlerts] = useState<Alert[]>(() => buildAutoAlerts(project));
  const [sevFilter, setSevFilter] = useState<'all' | Severity>('all');
  const [catFilter, setCatFilter] = useState<'all' | Category>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Alert, 'id' | 'acknowledged'>>({
    date: todayStr(), category: 'Custom', severity: 'warning', title: '', detail: '', action: '',
  });

  const acknowledge    = (id: string) => setAlerts(p => p.map(a => a.id === id ? { ...a, acknowledged: true } : a));
  const acknowledgeAll = () => setAlerts(p => p.map(a => ({ ...a, acknowledged: true })));
  const deleteAlert    = (id: string) => setAlerts(p => p.filter(a => a.id !== id));
  const clearAcked     = () => setAlerts(p => p.filter(a => !a.acknowledged));

  const handleAdd = () => {
    if (!form.title.trim()) return;
    setAlerts(p => [...p, { ...form, id: `CUST-${Date.now()}`, acknowledged: false }]);
    setShowForm(false);
    setForm({ date: todayStr(), category: 'Custom', severity: 'warning', title: '', detail: '', action: '' });
  };

  const filtered = alerts
    .filter(a => sevFilter === 'all' || a.severity === sevFilter)
    .filter(a => catFilter === 'all' || a.category === catFilter)
    .sort((a, b) => {
      if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
      const o: Record<Severity, number> = { critical: 0, warning: 1, info: 2, success: 3 };
      return o[a.severity] - o[b.severity];
    });

  const openCount     = alerts.filter(a => !a.acknowledged).length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;

  return (
    <>
      <PageHeader
        title="Alerts & Notifications"
        subtitle="Auto-generated from live project data · Acknowledge, action, and add custom alerts"
        badge={{ text: `${openCount} Open`, variant: criticalCount > 0 ? 'danger' : 'warning' }}
      />

      <div className="exec-strip" style={{ marginBottom: '1.25rem' }}>
        <span>Total: <strong>{alerts.length}</strong></span>
        <span>Critical: <strong style={{ color: 'var(--danger)' }}>{criticalCount}</strong></span>
        <span>Warnings: <strong style={{ color: 'var(--warning)' }}>{alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length}</strong></span>
        <span>Acknowledged: <strong style={{ color: 'var(--success)' }}>{alerts.filter(a => a.acknowledged).length}</strong></span>
      </div>

      <div className="sched-toolbar" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {(['all', 'critical', 'warning', 'info', 'success'] as const).map(s => (
            <button key={s} type="button"
              className={`sched-tab${sevFilter === s ? ' active' : ''}`}
              style={{ textTransform: 'capitalize' }}
              onClick={() => setSevFilter(s)}>{s}
            </button>
          ))}
          <span style={{ color: 'var(--border)', alignSelf: 'center' }}>|</span>
          {(['all', 'Schedule', 'Financial', 'Quality', 'HSE', 'EOT', 'Procurement', 'Custom'] as const).map(c => (
            <button key={c} type="button"
              className={`sched-tab${catFilter === c ? ' active' : ''}`}
              onClick={() => setCatFilter(c)}>{c}
            </button>
          ))}
        </div>
        <div className="sched-actions">
          <button type="button" className="btn btn-secondary" onClick={acknowledgeAll}>✔ Acknowledge All</button>
          <button type="button" className="btn btn-secondary" onClick={clearAcked}>🗑 Clear Acknowledged</button>
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(v => !v)}>+ Add Alert</button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.25rem', borderColor: 'var(--accent)' }}>
          <div className="section-title">New Custom Alert</div>
          <div className="rr-form-grid" style={{ marginTop: '0.75rem' }}>
            <label style={{ display:'flex', flexDirection:'column', gap:'0.3rem', fontSize:'0.78rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
              Date
              <input type="date" className="status-select" style={{ width:'100%' }} value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </label>
            <label style={{ display:'flex', flexDirection:'column', gap:'0.3rem', fontSize:'0.78rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
              Category
              <select className="status-select" style={{ width:'100%' }} value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value as Category }))}>
                {(['Schedule','Financial','Quality','HSE','EOT','Procurement','Custom'] as Category[]).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label style={{ display:'flex', flexDirection:'column', gap:'0.3rem', fontSize:'0.78rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
              Severity
              <select className="status-select" style={{ width:'100%' }} value={form.severity}
                onChange={e => setForm(p => ({ ...p, severity: e.target.value as Severity }))}>
                {(['critical','warning','info','success'] as Severity[]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <label style={{ display:'block', marginTop:'0.65rem', fontSize:'0.78rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
            Title
            <input className="status-select" style={{ width:'100%', marginTop:'0.3rem' }} value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </label>
          <label style={{ display:'block', marginTop:'0.65rem', fontSize:'0.78rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
            Detail
            <textarea className="rr-textarea" rows={2} style={{ marginTop:'0.3rem' }} value={form.detail}
              onChange={e => setForm(p => ({ ...p, detail: e.target.value }))} />
          </label>
          <label style={{ display:'block', marginTop:'0.65rem', fontSize:'0.78rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
            Required Action
            <input className="status-select" style={{ width:'100%', marginTop:'0.3rem' }} value={form.action}
              onChange={e => setForm(p => ({ ...p, action: e.target.value }))} />
          </label>
          <div style={{ display:'flex', gap:'0.75rem', marginTop:'1rem' }}>
            <button type="button" className="btn btn-primary" onClick={handleAdd}>Save Alert</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card">
          <div style={{ textAlign:'center', padding:'2.5rem', color:'var(--muted)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>✅</div>
            No alerts matching the current filter.
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
          {filtered.map(a => (
            <div key={a.id} className="alert-item"
              style={{ borderLeftColor: sevBorder(a.severity), opacity: a.acknowledged ? 0.55 : 1 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:'0.75rem', flexWrap:'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap', alignItems:'center', marginBottom:'0.3rem' }}>
                    <span className={`badge ${sevBadge(a.severity)}`}>{a.severity.toUpperCase()}</span>
                    <span className="tag">{a.category}</span>
                    <span style={{ fontSize:'0.72rem', color:'var(--muted)' }}>{a.date}</span>
                    {a.acknowledged && <span className="badge badge-success">Acknowledged</span>}
                  </div>
                  <strong style={{ fontSize:'0.875rem' }}>{a.title}</strong>
                  {a.detail && <p style={{ marginTop:'0.25rem', fontSize:'0.8rem', color:'var(--muted)' }}>{a.detail}</p>}
                  {a.action && <p style={{ marginTop:'0.3rem', fontSize:'0.78rem', color:'var(--accent)' }}>▶ {a.action}</p>}
                </div>
                <div style={{ display:'flex', gap:'0.4rem', flexShrink:0 }}>
                  {!a.acknowledged && (
                    <button type="button" className="btn-ghost" style={{ fontSize:'0.72rem', padding:'0.25rem 0.6rem' }}
                      onClick={() => acknowledge(a.id)}>✔ Ack</button>
                  )}
                  <button type="button" className="btn-ghost" style={{ fontSize:'0.72rem', padding:'0.25rem 0.5rem' }}
                    onClick={() => deleteAlert(a.id)}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
