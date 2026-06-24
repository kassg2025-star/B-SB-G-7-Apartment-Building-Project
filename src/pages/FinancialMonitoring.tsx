import { useState } from 'react';
import ExcelImport from '../components/ExcelImport';
import PageHeader from '../components/PageHeader';
import { formatETB } from '../data/projectData';
import { useProject } from '../store/projectStore';
import type { CashFlowMonth } from '../data/projectData';

interface IPCEntry {
  id: string;
  label: string;
  amount: number;
  status: 'Paid' | 'Certified & Paid' | 'Estimate — Pending' | 'Submitted' | 'Rejected';
}

export default function FinancialMonitoring() {
  const project = useProject();
  const { financial } = project;

  const [extraCashFlow, setExtraCashFlow] = useState<CashFlowMonth[]>([]);
  const [ipcEntries, setIpcEntries] = useState<IPCEntry[]>([
    { id: 'ADV',    label: 'Advance Payment', amount: financial.advancePayment,   status: 'Paid' },
    { id: 'IPC-01', label: 'IPC-01',          amount: financial.ipc01Certified,   status: 'Certified & Paid' },
    { id: 'IPC-02', label: 'IPC-02',          amount: financial.ipc02Estimate,    status: 'Estimate — Pending' },
  ]);
  const [showIPCForm, setShowIPCForm] = useState(false);
  const [ipcForm, setIpcForm] = useState<IPCEntry>({ id: '', label: '', amount: 0, status: 'Submitted' });

  const allCashFlow = [...project.cashFlow, ...extraCashFlow];
  const totalPaid = ipcEntries.filter(e => e.status === 'Paid' || e.status === 'Certified & Paid').reduce((s, e) => s + e.amount, 0);
  const totalCertified = ipcEntries.reduce((s, e) => s + e.amount, 0);
  const pctOfContract = (totalPaid / financial.originalContractValue) * 100;
  const maxCF = Math.max(...allCashFlow.map((c) => Math.max(c.inflow, c.outflow, 1)));
  const maxCum = Math.max(...allCashFlow.map(c => Math.abs(c.cumulative)), 1);

  // Monthly burn rate (avg outflow last 3 months)
  const recentOutflows = allCashFlow.slice(-3).map(c => c.outflow).filter(v => v > 0);
  const burnRate = recentOutflows.length > 0 ? recentOutflows.reduce((a, b) => a + b, 0) / recentOutflows.length : 0;
  const cashRemaining = allCashFlow.length > 0 ? allCashFlow[allCashFlow.length - 1].cumulative : 0;
  const monthsRunway = burnRate > 0 ? (cashRemaining / burnRate).toFixed(1) : '∞';

  const handleCFImport = (records: Record<string, string>[]) => {
    const imported: CashFlowMonth[] = records
      .filter(r => r['Month'])
      .map(r => ({
        month:      r['Month'] ?? '',
        inflow:     parseFloat(r['Inflow(ETB)']?.replace(/,/g,'') ?? '0') || 0,
        outflow:    parseFloat(r['Outflow(ETB)']?.replace(/,/g,'') ?? '0') || 0,
        cumulative: parseFloat(r['Cumulative(ETB)']?.replace(/,/g,'') ?? '0') || 0,
      }));
    setExtraCashFlow(imported);
  };

  const addIPC = () => {
    if (!ipcForm.label || !ipcForm.amount) return;
    const nextNum = ipcEntries.filter(e => e.id.startsWith('IPC-')).length + 1;
    setIpcEntries(prev => [...prev, { ...ipcForm, id: ipcForm.id || `IPC-0${nextNum}` }]);
    setIpcForm({ id: '', label: '', amount: 0, status: 'Submitted' });
    setShowIPCForm(false);
  };

  const statusBadge = (s: IPCEntry['status']) => {
    if (s === 'Paid' || s === 'Certified & Paid') return 'badge-success';
    if (s === 'Estimate — Pending' || s === 'Submitted') return 'badge-warning';
    return 'badge-danger';
  };

  return (
    <>
      <PageHeader
        title="Financial Monitoring"
        subtitle={`Contract ${project.contractId} — IPC pipeline & cash position`}
      />

      <ExcelImport
        moduleId="cashflow"
        label="Import Cash Flow Data (Excel / CSV)"
        templateColumns={['Month','Inflow(ETB)','Outflow(ETB)','Cumulative(ETB)']}
        templateRows={[['Jan 2026','15400000','2100000','13300000'],['Feb 2026','0','1850000','11450000']]}
        onImport={handleCFImport}
      />

      {/* KPI strip */}
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card kpi-accent">
          <div className="card-label">Contract Value</div>
          <div className="card-value sm">{formatETB(financial.originalContractValue)}</div>
          <div className="card-sub">ETB incl. VAT</div>
        </div>
        <div className="card kpi-success">
          <div className="card-label">Total Received</div>
          <div className="card-value sm">{formatETB(totalPaid)}</div>
          <div className="card-sub">{pctOfContract.toFixed(1)}% of contract value</div>
        </div>
        <div className="card kpi-warning">
          <div className="card-label">IPC Pipeline Total</div>
          <div className="card-value sm">{formatETB(totalCertified)}</div>
          <div className="card-sub">{ipcEntries.length} certificates</div>
        </div>
        <div className="card kpi-danger">
          <div className="card-label">Cash Runway</div>
          <div className="card-value sm">{monthsRunway} months</div>
          <div className="card-sub">Burn rate: {formatETB(burnRate)}/mo</div>
        </div>
      </div>

      {/* IPC table + add form */}
      <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="section-title" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>Interim Payment Certificates</span>
            <button type="button" className="btn btn-secondary" style={{ fontSize:'0.75rem', padding:'0.25rem 0.65rem' }}
              onClick={() => setShowIPCForm(v => !v)}>+ Add IPC</button>
          </div>

          {showIPCForm && (
            <div style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'0.85rem', marginBottom:'0.85rem' }}>
              <div className="rr-form-grid">
                <label style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                  Certificate ID
                  <input className="status-select" style={{ width:'100%' }} placeholder="IPC-03" value={ipcForm.id} onChange={e => setIpcForm(p => ({ ...p, id: e.target.value }))} />
                </label>
                <label style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                  Label
                  <input className="status-select" style={{ width:'100%' }} placeholder="IPC-03 — June works" value={ipcForm.label} onChange={e => setIpcForm(p => ({ ...p, label: e.target.value }))} />
                </label>
                <label style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                  Amount (ETB)
                  <input type="number" className="status-select" style={{ width:'100%' }} value={ipcForm.amount || ''} onChange={e => setIpcForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
                </label>
                <label style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                  Status
                  <select className="status-select" style={{ width:'100%' }} value={ipcForm.status} onChange={e => setIpcForm(p => ({ ...p, status: e.target.value as IPCEntry['status'] }))}>
                    {(['Paid','Certified & Paid','Estimate — Pending','Submitted','Rejected'] as IPCEntry['status'][]).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
              <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.65rem' }}>
                <button type="button" className="btn btn-primary" onClick={addIPC}>Add</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowIPCForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          <table className="data-table">
            <thead><tr><th>Certificate</th><th>Amount (ETB)</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {ipcEntries.map((e) => (
                <tr key={e.id}>
                  <td><strong>{e.label}</strong></td>
                  <td>{formatETB(e.amount)}</td>
                  <td><span className={`badge ${statusBadge(e.status)}`}>{e.status}</span></td>
                  <td>
                    <button type="button" className="btn-ghost" style={{ fontSize:'0.7rem', padding:'0.1rem 0.4rem' }}
                      onClick={() => setIpcEntries(prev => prev.filter(x => x.id !== e.id))}>✕</button>
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop:'2px solid var(--border)' }}>
                <td><strong>Total Pipeline</strong></td>
                <td><strong>{formatETB(totalCertified)}</strong></td>
                <td colSpan={2} style={{ color:'var(--muted)', fontSize:'0.78rem' }}>{((totalCertified/financial.originalContractValue)*100).toFixed(1)}% of contract</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="section-title">May 2026 Site Costs</div>
          <table className="data-table">
            <tbody>
              <tr><td>Workforce Payroll</td><td>{formatETB(project.resources.payrollMay)} ETB</td></tr>
              <tr><td>Man-Days</td><td>{project.resources.manDaysMay}</td></tr>
              <tr><td>Avg Daily Workers</td><td>{project.resources.avgDailyWorkers}</td></tr>
              <tr><td>CPI</td><td><span className={`badge badge-${project.progress.cpi >= 1 ? 'success' : 'warning'}`}>{project.progress.cpi}</span></td></tr>
              <tr><td>Monthly Burn Rate</td><td>{formatETB(burnRate)} ETB</td></tr>
              <tr><td>Cash Position</td><td style={{ color: cashRemaining < 5_000_000 ? 'var(--danger)' : 'var(--success)' }}>{formatETB(cashRemaining)} ETB</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash flow chart with cumulative overlay */}
      <div className="card">
        <div className="section-title">
          Cash Flow Chart
          {extraCashFlow.length > 0 && <span className="badge badge-success" style={{ marginLeft:'0.5rem' }}>+{extraCashFlow.length} imported</span>}
        </div>

        {/* Bar chart */}
        <div className="cashflow-chart" style={{ height: 200 }}>
          {allCashFlow.map((c) => (
            <div className="cashflow-col" key={c.month}>
              <div className="cashflow-bars">
                <div className="cf-bar inflow"  style={{ height:`${(c.inflow  / maxCF) * 100}%` }} title={`Inflow: ${formatETB(c.inflow)}`} />
                <div className="cf-bar outflow" style={{ height:`${(c.outflow / maxCF) * 100}%` }} title={`Outflow: ${formatETB(c.outflow)}`} />
              </div>
              <div className="chart-label">{c.month.replace(' 2026','').replace(' (Est.)','')}</div>
            </div>
          ))}
        </div>

        {/* Cumulative line SVG */}
        <div style={{ position:'relative', height:60, marginTop:'0.5rem' }}>
          <svg viewBox={`0 0 ${allCashFlow.length * 80} 60`} preserveAspectRatio="none" style={{ width:'100%', height:'100%' }}>
            <polyline
              points={allCashFlow.map((c, i) => `${i * 80 + 40},${60 - ((c.cumulative / maxCum) * 50 + 5)}`).join(' ')}
              fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round"
            />
            {allCashFlow.map((c, i) => (
              <circle key={c.month} cx={i * 80 + 40} cy={60 - ((c.cumulative / maxCum) * 50 + 5)} r="4" fill="var(--accent)" >
                <title>{c.month}: Cumulative {formatETB(c.cumulative)}</title>
              </circle>
            ))}
          </svg>
        </div>

        <div className="scurve-legend" style={{ marginTop:'0.5rem' }}>
          <span style={{ color:'var(--success)' }}>■ Inflow</span>
          <span style={{ color:'var(--danger)'  }}>■ Outflow</span>
          <span style={{ color:'var(--accent)'  }}>— Cumulative Cash</span>
        </div>

        {/* Detail table */}
        <table className="data-table" style={{ marginTop:'1.5rem' }}>
          <thead><tr><th>Month</th><th>Inflow (ETB)</th><th>Outflow (ETB)</th><th>Cumulative (ETB)</th><th>Net</th></tr></thead>
          <tbody>
            {allCashFlow.map((c) => (
              <tr key={c.month}>
                <td>{c.month}</td>
                <td style={{ color: c.inflow > 0 ? 'var(--success)' : 'inherit' }}>{formatETB(c.inflow)}</td>
                <td style={{ color:'var(--danger)' }}>{formatETB(c.outflow)}</td>
                <td style={{ fontWeight:600, color: c.cumulative < 0 ? 'var(--danger)' : 'inherit' }}>{formatETB(c.cumulative)}</td>
                <td style={{ color: c.inflow - c.outflow >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {c.inflow - c.outflow >= 0 ? '+' : ''}{formatETB(c.inflow - c.outflow)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
