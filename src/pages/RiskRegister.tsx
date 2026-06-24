import { useState, useId } from 'react';
import React from 'react';
import ExcelImport from '../components/ExcelImport';
import PageHeader from '../components/PageHeader';
import { useProject } from '../store/projectStore';

// ── Types ──────────────────────────────────────────────────────────────────
type Likelihood = 1 | 2 | 3 | 4 | 5;
type Impact     = 1 | 2 | 3 | 4 | 5;
type RiskStatus = 'Open' | 'Mitigated' | 'Closed' | 'Escalated';
type Period     = 'daily' | 'weekly' | 'monthly';
type ActiveTab  = 'risks' | 'incidents' | 'problems';
type IncidentSeverity = 'Near Miss' | 'First Aid' | 'Medical Treatment' | 'LTI' | 'Fatality';
type ProblemStatus = 'Open' | 'In Progress' | 'Resolved' | 'Escalated';

export interface RiskEntry {
  id: string;
  date: string;
  category: string;
  description: string;
  likelihood: Likelihood;
  impact: Impact;
  riskScore: number;
  owner: string;
  mitigation: string;
  status: RiskStatus;
  residualScore: number;
  reviewDate: string;
}

export interface IncidentEntry {
  id: string;
  date: string;
  time: string;
  location: string;
  type: string;
  severity: IncidentSeverity;
  description: string;
  injured: string;
  immediateAction: string;
  rootCause: string;
  correctiveAction: string;
  reportedBy: string;
  closed: boolean;
}

export interface ProblemEntry {
  id: string;
  date: string;
  category: string;
  title: string;
  description: string;
  impact: string;
  owner: string;
  action: string;
  targetDate: string;
  status: ProblemStatus;
  resolvedDate: string;
}

// ── Seed data from project store ───────────────────────────────────────────
function seedRisks(): RiskEntry[] {
  return [
    { id:'RSK-001', date:'2026-01-25', category:'Geological',   description:'Ultra-dense basaltic rock below -4.8m causing excavation delays', likelihood:5, impact:5, riskScore:25, owner:'Eng. Kasaye', mitigation:'Chisel sub-contract engaged; EOT claim submitted', status:'Open',      residualScore:15, reviewDate:'2026-07-01' },
    { id:'RSK-002', date:'2026-02-10', category:'Mechanical',   description:'Primary excavator hydraulic system failure', likelihood:3, impact:4, riskScore:12, owner:'Plant Manager', mitigation:'Backup plant sourced; maintenance schedule tightened', status:'Mitigated', residualScore:6,  reviewDate:'2026-07-15' },
    { id:'RSK-003', date:'2026-03-01', category:'Logistical',   description:'Diesel fuel supply interruptions halting plant operations', likelihood:4, impact:4, riskScore:16, owner:'Eng. Kasaye', mitigation:'5-day buffer stock protocol established', status:'Open',      residualScore:9,  reviewDate:'2026-07-01' },
    { id:'RSK-004', date:'2026-04-20', category:'Consultant',   description:'SI-012 sequencing directive widening schedule variance', likelihood:3, impact:3, riskScore:9,  owner:'Eng. Kasaye', mitigation:'Formal compliance documented; EOT entitlement reserved', status:'Open',      residualScore:6,  reviewDate:'2026-07-10' },
    { id:'RSK-005', date:'2026-05-12', category:'Quality',      description:'Ø20mm rebar batch B-2026-45 failed tensile testing (NCR-005)', likelihood:2, impact:5, riskScore:10, owner:'QC Engineer', mitigation:'Batch quarantined; alternative mill re-test pending', status:'Open',      residualScore:8,  reviewDate:'2026-07-05' },
    { id:'RSK-006', date:'2026-05-20', category:'Environmental','description':'Pit-face collapse and groundwater seepage', likelihood:3, impact:5, riskScore:15, owner:'HSE Officer', mitigation:'Emergency shoring; 24/7 dewatering; night watchmen', status:'Mitigated', residualScore:8,  reviewDate:'2026-07-01' },
    { id:'RSK-007', date:'2026-03-15', category:'Financial',    description:'IPC-02 certification delay reducing working capital', likelihood:3, impact:4, riskScore:12, owner:'Finance Manager', mitigation:'IPC-02 estimate prepared; expedite certification request submitted', status:'Open', residualScore:9, reviewDate:'2026-07-20' },
  ];
}

function seedIncidents(): IncidentEntry[] {
  return [
    { id:'INC-001', date:'2026-05-20', time:'14:30', location:'Excavation Pit — Grid C-4', type:'Structural Failure', severity:'Near Miss', description:'Pit-face soil collapse on the south wall; no personnel in immediate zone at time of collapse.', injured:'None', immediateAction:'Work stopped; zone evacuated; emergency shoring deployed overnight', rootCause:'Groundwater saturation weakening unsupported face; heavy rain preceding 48 hours', correctiveAction:'Soil Nailing protocol activated; 3 dewatering pumps running 24/7; daily face inspection before each shift', reportedBy:'Eng. Kasaye Getachew', closed:false },
    { id:'INC-002', date:'2026-04-15', time:'10:15', location:'Ramp Access — Grid B', type:'Near Miss — Falling Object', severity:'Near Miss', description:'Rebar bundle dislodged from stack edge; no contact with personnel.', injured:'None', immediateAction:'Work stopped; area barricaded; toolbox talk conducted same day', rootCause:'Inadequate edge protection on material stack; no toe-board in place', correctiveAction:'Storage protocol updated; toe-boards installed on all elevated stacks; refresher PPE training', reportedBy:'Site HSE Officer', closed:true },
    { id:'INC-003', date:'2026-03-22', time:'08:45', location:'Ramp Access', type:'Near Miss — Slip', severity:'Near Miss', description:'Worker slipped on wet concrete ramp during morning shift; no injury sustained.', injured:'None', immediateAction:'Anti-slip mats installed immediately; area marked with warning signage', rootCause:'Smooth concrete surface without anti-slip treatment; insufficient lighting at ramp', correctiveAction:'Anti-slip mats on all ramp surfaces; additional site lighting installed', reportedBy:'Site Foreman', closed:true },
  ];
}

function seedProblems(): ProblemEntry[] {
  return [
    { id:'PRB-001', date:'2026-02-15', category:'Technical',    title:'Rock strata unexpectedly encountered at -4.8m', description:'Excavation design assumed soil to -7.55m; basaltic rock at -4.8m requires chiseling — tripling cycle time.', impact:'60-day schedule delay; cost overrun on plant and labour', owner:'Eng. Kasaye', action:'Chisel sub-contract mobilised; EOT DE-001 lodged', targetDate:'2026-08-01', status:'In Progress', resolvedDate:'' },
    { id:'PRB-002', date:'2026-03-10', category:'Equipment',    title:'Primary excavator hydraulic failure', description:'Main excavator lost hydraulic pressure; full breakdown requiring off-site repair.', impact:'8-day stoppage; manual excavation only', owner:'Plant Manager', action:'Excavator repaired and returned; preventive maintenance schedule updated', targetDate:'2026-04-05', status:'Resolved', resolvedDate:'2026-04-05' },
    { id:'PRB-003', date:'2026-03-01', category:'Supply Chain', title:'Recurring diesel supply interruptions', description:'Fuel delivery inconsistency causing 1–2 stoppage days per week; plant utilisation below 60%.', impact:'12-day cumulative delay; EOT DE-003 raised', owner:'Procurement', action:'5-day buffer stock established; secondary supplier identified', targetDate:'2026-07-01', status:'In Progress', resolvedDate:'' },
    { id:'PRB-004', date:'2026-05-12', category:'Quality',      title:'NCR-005 — Ø20mm rebar batch failed tensile test', description:'Batch B-2026-45 failed structural tensile strength testing; entire 2,048 kg quarantined.', impact:'Ø20mm assembly frozen; structural programme delayed', owner:'QC Engineer', action:'Alternative mill laboratory re-test initiated; replacement batch sourced', targetDate:'2026-07-10', status:'In Progress', resolvedDate:'' },
    { id:'PRB-005', date:'2026-04-20', category:'Consultant',   title:'SI-012 halted concurrent column and shear wall work', description:'Consultant sequencing directive stopped concurrent structural operations during substructure phase.', impact:'7-day additional variance; widened SPI gap', owner:'Eng. Kasaye', action:'Full compliance documented; EOT DE-005 submitted; rights reserved', targetDate:'2026-07-01', status:'Open', resolvedDate:'' },
    { id:'PRB-006', date:'2026-05-20', category:'Environmental','title':'Pit-face collapse — south wall', description:'Groundwater saturation caused partial collapse of south excavation face on 20/05/2026.', impact:'10-day delay; emergency shoring cost; INC-001 raised', owner:'HSE Officer', action:'Emergency shoring complete; soil nailing reinforced; 24/7 dewatering maintained', targetDate:'2026-07-01', status:'In Progress', resolvedDate:'' },
  ];
}

// ── Helpers ────────────────────────────────────────────────────────────────
const riskColor = (score: number) =>
  score >= 20 ? 'var(--danger)' : score >= 10 ? 'var(--warning)' : 'var(--success)';

const riskLabel = (score: number) =>
  score >= 20 ? 'Critical' : score >= 15 ? 'High' : score >= 10 ? 'Medium' : 'Low';

const todayStr = () => new Date().toISOString().substring(0, 10);

function periodLabel(p: Period) {
  return p === 'daily' ? 'Today' : p === 'weekly' ? 'This Week' : 'This Month';
}

function inPeriod(dateStr: string, period: Period): boolean {
  if (period === 'monthly') return true; // monthly shows all records
  const d = new Date(dateStr);
  const now = new Date();
  if (period === 'daily') {
    // show records from current calendar month, week and today
    return d.toDateString() === now.toDateString();
  }
  // weekly — current calendar week (Mon–Sun)
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Mon=1 ... Sun=7
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  // For seed data (past dates), fall back to showing records from same month
  if (d >= weekStart && d <= weekEnd) return true;
  // Fallback: show records from the same calendar month as now
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

// ── Summary text generators ────────────────────────────────────────────────
function generateRiskSummary(risks: RiskEntry[], period: Period, projectName: string): string {
  const subset = risks.filter(r => period === 'monthly' ? true : inPeriod(r.date, period));
  const open = subset.filter(r => r.status === 'Open' || r.status === 'Escalated');
  const critical = subset.filter(r => r.riskScore >= 20);
  const high = subset.filter(r => r.riskScore >= 15 && r.riskScore < 20);
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const now = new Date();

  let s = `KASSA & SONS CONSTRUCTION PLC\n`;
  s += `RISK REGISTER SUMMARY — ${period.toUpperCase()} REPORT\n`;
  s += `Period: ${periodLabel(period)} | Generated: ${fmt(now)}\n`;
  s += `Project: ${projectName}\n`;
  s += `${'─'.repeat(72)}\n\n`;
  s += `OVERVIEW\n`;
  s += `Total Risks Tracked : ${subset.length}\n`;
  s += `Open / Escalated    : ${open.length}\n`;
  s += `Critical (≥20)      : ${critical.length}\n`;
  s += `High (15–19)        : ${high.length}\n`;
  s += `Mitigated / Closed  : ${subset.filter(r => r.status === 'Mitigated' || r.status === 'Closed').length}\n\n`;
  s += `${'─'.repeat(72)}\nRISK REGISTER\n${'─'.repeat(72)}\n`;
  s += `${'ID'.padEnd(9)}${'Category'.padEnd(16)}${'Score'.padEnd(7)}${'Level'.padEnd(10)}${'Status'.padEnd(12)}Description\n`;
  s += `${'─'.repeat(72)}\n`;
  subset.forEach(r => {
    s += `${r.id.padEnd(9)}${r.category.padEnd(16)}${String(r.riskScore).padEnd(7)}${riskLabel(r.riskScore).padEnd(10)}${r.status.padEnd(12)}${r.description.substring(0,45)}\n`;
    s += `         Mitigation: ${r.mitigation.substring(0,60)}\n`;
    s += `         Owner: ${r.owner} | Review: ${r.reviewDate}\n\n`;
  });
  s += `${'─'.repeat(72)}\n`;
  s += `Prepared by: ${risks[0]?.owner ?? 'Project Team'}\n`;
  return s;
}

function generateIncidentSummary(incidents: IncidentEntry[], period: Period, projectName: string): string {
  const subset = incidents.filter(i => period === 'monthly' ? true : inPeriod(i.date, period));
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const now = new Date();

  let s = `KASSA & SONS CONSTRUCTION PLC\n`;
  s += `INCIDENT REPORT SUMMARY — ${period.toUpperCase()}\n`;
  s += `Period: ${periodLabel(period)} | Generated: ${fmt(now)}\n`;
  s += `Project: ${projectName}\n`;
  s += `${'─'.repeat(72)}\n\n`;
  s += `Total Incidents: ${subset.length} | Open: ${subset.filter(i=>!i.closed).length} | Closed: ${subset.filter(i=>i.closed).length}\n\n`;
  if (subset.length === 0) { s += `No incidents recorded in this period.\n`; return s; }
  subset.forEach(i => {
    s += `${'─'.repeat(72)}\n`;
    s += `${i.id}  |  ${i.date} ${i.time}  |  ${i.severity}  |  ${i.closed?'CLOSED':'OPEN'}\n`;
    s += `Location  : ${i.location}\n`;
    s += `Type      : ${i.type}\n`;
    s += `Description: ${i.description}\n`;
    s += `Injured   : ${i.injured || 'None'}\n`;
    s += `Immediate : ${i.immediateAction}\n`;
    s += `Root Cause: ${i.rootCause}\n`;
    s += `Corrective: ${i.correctiveAction}\n`;
    s += `Reported by: ${i.reportedBy}\n\n`;
  });
  return s;
}

function generateProblemSummary(problems: ProblemEntry[], period: Period, projectName: string): string {
  const subset = problems.filter(p => period === 'monthly' ? true : inPeriod(p.date, period));
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const now = new Date();

  let s = `KASSA & SONS CONSTRUCTION PLC\n`;
  s += `PROBLEMS ENCOUNTERED — ${period.toUpperCase()} SUMMARY\n`;
  s += `Period: ${periodLabel(period)} | Generated: ${fmt(now)}\n`;
  s += `Project: ${projectName}\n`;
  s += `${'─'.repeat(72)}\n\n`;
  s += `Total: ${subset.length} | Open: ${subset.filter(p=>p.status==='Open').length} | In Progress: ${subset.filter(p=>p.status==='In Progress').length} | Resolved: ${subset.filter(p=>p.status==='Resolved').length}\n\n`;
  if (subset.length === 0) { s += `No problems recorded in this period.\n`; return s; }
  subset.forEach(p => {
    s += `${'─'.repeat(72)}\n`;
    s += `${p.id}  |  ${p.date}  |  [${p.category}]  |  ${p.status}\n`;
    s += `Title     : ${p.title}\n`;
    s += `Description: ${p.description}\n`;
    s += `Impact    : ${p.impact}\n`;
    s += `Action    : ${p.action}\n`;
    s += `Owner     : ${p.owner} | Target: ${p.targetDate}${p.resolvedDate ? ' | Resolved: '+p.resolvedDate : ''}\n\n`;
  });
  s += `${'─'.repeat(72)}\nPrepared by: Project Management Team\n`;
  return s;
}

// ── Blank-record factories ─────────────────────────────────────────────────
function blankRisk(id: string): RiskEntry {
  return { id, date: todayStr(), category:'', description:'', likelihood:3, impact:3, riskScore:9, owner:'', mitigation:'', status:'Open', residualScore:0, reviewDate:'' };
}
function blankIncident(id: string): IncidentEntry {
  return { id, date: todayStr(), time:'', location:'', type:'', severity:'Near Miss', description:'', injured:'', immediateAction:'', rootCause:'', correctiveAction:'', reportedBy:'', closed:false };
}
function blankProblem(id: string): ProblemEntry {
  return { id, date: todayStr(), category:'', title:'', description:'', impact:'', owner:'', action:'', targetDate:'', status:'Open', resolvedDate:'' };
}

// ── Sub-components ─────────────────────────────────────────────────────────
function RiskMatrix({ risks }: { risks: RiskEntry[] }) {
  const cells: Record<string, RiskEntry[]> = {};
  for (let l = 1; l <= 5; l++) for (let i = 1; i <= 5; i++) cells[`${l}-${i}`] = [];
  risks.forEach(r => cells[`${r.likelihood}-${r.impact}`]?.push(r));

  return (
    <div className="risk-matrix-wrap">
      <div className="risk-matrix-title">Risk Matrix (Likelihood × Impact)</div>
      <div className="risk-matrix">
        <div className="rm-y-label">← Likelihood</div>
        <div className="rm-grid">
          <div className="rm-corner" />
          {[1,2,3,4,5].map(i => <div key={i} className="rm-axis-label">I={i}</div>)}
          {[5,4,3,2,1].map(l => (
            <React.Fragment key={`row-${l}`}>
              <div className="rm-axis-label">L={l}</div>
              {[1,2,3,4,5].map(i => {
                const score = l * i;
                const bg = score >= 20 ? 'rgba(224,92,92,0.3)' : score >= 10 ? 'rgba(232,168,56,0.25)' : 'rgba(76,175,130,0.2)';
                const items = cells[`${l}-${i}`];
                return (
                  <div key={`${l}-${i}`} className="rm-cell" style={{ background: bg }} title={items.map(r=>r.id).join(', ')}>
                    <span className="rm-score">{score}</span>
                    {items.map(r => <span key={r.id} className="rm-dot" title={r.id}>{r.id.replace('RSK-','')}</span>)}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Risk Register tab ──────────────────────────────────────────────────────
function RisksTab({ project }: { project: ReturnType<typeof useProject> }) {
  const [risks, setRisks] = useState<RiskEntry[]>(seedRisks);
  const [period, setPeriod] = useState<Period>('monthly');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<RiskEntry>(() => blankRisk('RSK-NEW'));
  const [summaryText, setSummaryText] = useState('');
  const uid = useId();

  const counter = risks.length + 1;
  const nextId = () => `RSK-${String(counter).padStart(3,'0')}`;

  const filtered = risks.filter(r => period === 'monthly' || inPeriod(r.date, period));

  const openAdd = () => { setForm(blankRisk(nextId())); setEditId(null); setShowForm(true); setSummaryText(''); };
  const openEdit = (r: RiskEntry) => { setForm({...r}); setEditId(r.id); setShowForm(true); setSummaryText(''); };
  const deleteRisk = (id: string) => setRisks(prev => prev.filter(r => r.id !== id));

  const handleSave = () => {
    const score = form.likelihood * form.impact;
    const entry = { ...form, riskScore: score };
    if (editId) setRisks(prev => prev.map(r => r.id === editId ? entry : r));
    else setRisks(prev => [...prev, entry]);
    setShowForm(false);
  };

  const f = (field: keyof RiskEntry, val: string | number) =>
    setForm(prev => ({ ...prev, [field]: val }));

  const genSummary = () => setSummaryText(generateRiskSummary(risks, period, project.name));
  const download = () => {
    const blob = new Blob([summaryText], { type:'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `KAS-Risk-${period}.txt`; a.click(); URL.revokeObjectURL(url);
  };

  const critical = risks.filter(r => r.riskScore >= 20).length;
  const open = risks.filter(r => r.status === 'Open' || r.status === 'Escalated').length;

  return (
    <div>
      {/* KPI strip */}
      <div className="exec-strip" style={{ marginBottom:'1.25rem' }}>
        <span>Total Risks: <strong>{risks.length}</strong></span>
        <span>Open: <strong style={{color:'var(--warning)'}}>{open}</strong></span>
        <span>Critical: <strong style={{color:'var(--danger)'}}>{critical}</strong></span>
        <span>Mitigated: <strong style={{color:'var(--success)'}}>{risks.filter(r=>r.status==='Mitigated').length}</strong></span>
      </div>

      {/* Risk matrix */}
      <div className="card" style={{ marginBottom:'1.25rem' }}>
        <RiskMatrix risks={risks} />
      </div>

      {/* Toolbar */}
      <div className="sched-toolbar">
        <div className="sched-tabs">
          {(['daily','weekly','monthly'] as Period[]).map(p => (
            <button key={p} type="button" className={`sched-tab${period===p?' active':''}`} onClick={() => { setPeriod(p); setSummaryText(''); }}>
              {p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
        </div>
        <div className="sched-actions">
          <button type="button" className="btn btn-secondary" onClick={genSummary}>📄 Generate Summary</button>
          {summaryText && <button type="button" className="btn btn-secondary" onClick={download}>⬇ Download</button>}
          {summaryText && <button type="button" className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(summaryText)}>Copy</button>}
          <button type="button" className="btn btn-primary" onClick={openAdd}>+ Add Risk</button>
        </div>
      </div>

      <ExcelImport
        moduleId="risks"
        label="Import Risks from Excel / CSV"
        templateColumns={['ID','Date','Category','Description','Likelihood','Impact','Owner','Mitigation','Status','ResidualScore','ReviewDate']}
        templateRows={[['RSK-008','2026-06-01','Financial','Cash flow shortfall risk','3','3','Finance Manager','Monitor IPC-02 payment schedule','Open','6','2026-07-20']]}
        onImport={(records) => {
          const imported: RiskEntry[] = records.filter(r => r['Description']).map((r, i) => {
            const l = (parseInt(r['Likelihood']??'3')||3) as Likelihood;
            const im = (parseInt(r['Impact']??'3')||3) as Impact;
            return { id: r['ID']||`RSK-${risks.length+i+1}`, date: r['Date']||todayStr(), category: r['Category']||'', description: r['Description']||'', likelihood: l, impact: im, riskScore: l*im, owner: r['Owner']||'', mitigation: r['Mitigation']||'', status: (r['Status']||'Open') as RiskStatus, residualScore: parseInt(r['ResidualScore']||'0')||0, reviewDate: r['ReviewDate']||'' };
          });
          setRisks(prev => [...prev, ...imported]);
        }}
      />

      {/* Summary output */}
      {summaryText && (
        <div className="card" style={{ marginBottom:'1.25rem' }}>
          <div className="section-title">Risk Summary — {periodLabel(period)}</div>
          <div className="doc-output" style={{ maxHeight:'320px' }}>{summaryText}</div>
        </div>
      )}

      {/* Add/edit form */}
      {showForm && (
        <div className="card" style={{ marginBottom:'1.25rem', borderColor:'var(--accent)' }}>
          <div className="section-title">{editId ? `Edit ${editId}` : 'New Risk Entry'}</div>
          <div className="rr-form-grid">
            <label htmlFor={`${uid}-date`}>Date<input id={`${uid}-date`} type="date" className="status-select" style={{width:'100%'}} value={form.date} onChange={e=>f('date',e.target.value)} /></label>
            <label htmlFor={`${uid}-cat`}>Category<input id={`${uid}-cat`} className="status-select" style={{width:'100%'}} placeholder="Geological, HSE…" value={form.category} onChange={e=>f('category',e.target.value)} /></label>
            <label htmlFor={`${uid}-owner`}>Owner<input id={`${uid}-owner`} className="status-select" style={{width:'100%'}} placeholder="Responsible person" value={form.owner} onChange={e=>f('owner',e.target.value)} /></label>
            <label htmlFor={`${uid}-review`}>Review Date<input id={`${uid}-review`} type="date" className="status-select" style={{width:'100%'}} value={form.reviewDate} onChange={e=>f('reviewDate',e.target.value)} /></label>
            <label htmlFor={`${uid}-like`}>Likelihood (1–5)
              <select id={`${uid}-like`} className="status-select" style={{width:'100%'}} value={form.likelihood} onChange={e=>f('likelihood',Number(e.target.value) as Likelihood)}>
                {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label htmlFor={`${uid}-imp`}>Impact (1–5)
              <select id={`${uid}-imp`} className="status-select" style={{width:'100%'}} value={form.impact} onChange={e=>f('impact',Number(e.target.value) as Impact)}>
                {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label htmlFor={`${uid}-status`}>Status
              <select id={`${uid}-status`} className="status-select" style={{width:'100%'}} value={form.status} onChange={e=>f('status',e.target.value as RiskStatus)}>
                {(['Open','Mitigated','Closed','Escalated'] as RiskStatus[]).map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label htmlFor={`${uid}-residual`}>Residual Score<input id={`${uid}-residual`} type="number" min={0} max={25} className="status-select" style={{width:'100%'}} value={form.residualScore} onChange={e=>f('residualScore',Number(e.target.value))} /></label>
          </div>
          <label htmlFor={`${uid}-desc`} style={{display:'block',marginTop:'0.75rem',fontSize:'0.8rem'}}>Description
            <textarea id={`${uid}-desc`} className="rr-textarea" rows={2} value={form.description} onChange={e=>f('description',e.target.value)} />
          </label>
          <label htmlFor={`${uid}-mit`} style={{display:'block',marginTop:'0.75rem',fontSize:'0.8rem'}}>Mitigation / Response
            <textarea id={`${uid}-mit`} className="rr-textarea" rows={2} value={form.mitigation} onChange={e=>f('mitigation',e.target.value)} />
          </label>
          <div style={{display:'flex',gap:'0.75rem',marginTop:'1rem'}}>
            <button type="button" className="btn btn-primary" onClick={handleSave}>Save</button>
            <button type="button" className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Risk table */}
      <div className="card">
        <div className="section-title">Risk Register — {periodLabel(period)} ({filtered.length} records)</div>
        <div style={{ overflowX:'auto' }}>
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Date</th><th>Category</th><th>Description</th><th>L</th><th>I</th><th>Score</th><th>Level</th><th>Owner</th><th>Status</th><th>Residual</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.id}</strong></td>
                  <td>{r.date}</td>
                  <td><span className="tag">{r.category}</span></td>
                  <td style={{fontSize:'0.78rem',maxWidth:220}}>{r.description}</td>
                  <td>{r.likelihood}</td>
                  <td>{r.impact}</td>
                  <td><span className="badge" style={{background:`${riskColor(r.riskScore)}22`,color:riskColor(r.riskScore)}}>{r.riskScore}</span></td>
                  <td><span className="badge" style={{background:`${riskColor(r.riskScore)}22`,color:riskColor(r.riskScore)}}>{riskLabel(r.riskScore)}</span></td>
                  <td style={{fontSize:'0.78rem'}}>{r.owner}</td>
                  <td><span className={`badge badge-${r.status==='Closed'?'success':r.status==='Mitigated'?'warning':'danger'}`}>{r.status}</span></td>
                  <td><span className="badge" style={{background:`${riskColor(r.residualScore)}22`,color:riskColor(r.residualScore)}}>{r.residualScore}</span></td>
                  <td>
                    <button type="button" className="btn-ghost" style={{fontSize:'0.7rem',padding:'0.2rem 0.5rem'}} onClick={()=>openEdit(r)}>✎</button>
                    <button type="button" className="btn-ghost" style={{fontSize:'0.7rem',padding:'0.2rem 0.5rem',marginLeft:4}} onClick={()=>deleteRisk(r.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Incidents tab ──────────────────────────────────────────────────────────
function IncidentsTab({ project }: { project: ReturnType<typeof useProject> }) {
  const [incidents, setIncidents] = useState<IncidentEntry[]>(seedIncidents);
  const [period, setPeriod] = useState<Period>('monthly');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<IncidentEntry>(() => blankIncident('INC-NEW'));
  const [summaryText, setSummaryText] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const uid = useId();

  const nextId = () => `INC-${String(incidents.length + 1).padStart(3,'0')}`;
  const filtered = incidents.filter(i => period === 'monthly' || inPeriod(i.date, period));

  const openAdd = () => { setForm(blankIncident(nextId())); setEditId(null); setShowForm(true); setSummaryText(''); };
  const openEdit = (i: IncidentEntry) => { setForm({...i}); setEditId(i.id); setShowForm(true); setSummaryText(''); };
  const deleteInc = (id: string) => setIncidents(prev => prev.filter(i => i.id !== id));
  const toggleClose = (id: string) => setIncidents(prev => prev.map(i => i.id === id ? {...i, closed: !i.closed} : i));

  const handleSave = () => {
    if (editId) setIncidents(prev => prev.map(i => i.id === editId ? form : i));
    else setIncidents(prev => [...prev, form]);
    setShowForm(false);
  };

  const f = (field: keyof IncidentEntry, val: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: val }));

  const genSummary = () => setSummaryText(generateIncidentSummary(incidents, period, project.name));
  const download = () => {
    const blob = new Blob([summaryText], { type:'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`KAS-Incidents-${period}.txt`; a.click(); URL.revokeObjectURL(url);
  };

  const severityColor = (s: IncidentSeverity) =>
    s === 'Fatality' || s === 'LTI' ? 'var(--danger)' : s === 'Medical Treatment' ? 'var(--warning)' : 'var(--success)';

  return (
    <div>
      <div className="exec-strip" style={{ marginBottom:'1.25rem' }}>
        <span>Total: <strong>{incidents.length}</strong></span>
        <span>Open: <strong style={{color:'var(--warning)'}}>{incidents.filter(i=>!i.closed).length}</strong></span>
        <span>Near Miss: <strong>{incidents.filter(i=>i.severity==='Near Miss').length}</strong></span>
        <span>LTI: <strong style={{color:'var(--danger)'}}>{incidents.filter(i=>i.severity==='LTI'||i.severity==='Fatality').length}</strong></span>
      </div>

      <div className="sched-toolbar">
        <div className="sched-tabs">
          {(['daily','weekly','monthly'] as Period[]).map(p => (
            <button key={p} type="button" className={`sched-tab${period===p?' active':''}`} onClick={() => { setPeriod(p); setSummaryText(''); }}>
              {p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
        </div>
        <div className="sched-actions">
          <button type="button" className="btn btn-secondary" onClick={genSummary}>📄 Generate Report</button>
          {summaryText && <button type="button" className="btn btn-secondary" onClick={download}>⬇ Download</button>}
          {summaryText && <button type="button" className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(summaryText)}>Copy</button>}
          <button type="button" className="btn btn-primary" onClick={openAdd}>+ Log Incident</button>
        </div>
      </div>

      {summaryText && (
        <div className="card" style={{ marginBottom:'1.25rem' }}>
          <div className="section-title">Incident Report — {periodLabel(period)}</div>
          <div className="doc-output" style={{ maxHeight:'320px' }}>{summaryText}</div>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom:'1.25rem', borderColor:'var(--accent)' }}>
          <div className="section-title">{editId ? `Edit ${editId}` : 'Log New Incident'}</div>
          <div className="rr-form-grid">
            <label htmlFor={`${uid}-date`}>Date<input id={`${uid}-date`} type="date" className="status-select" style={{width:'100%'}} value={form.date} onChange={e=>f('date',e.target.value)} /></label>
            <label htmlFor={`${uid}-time`}>Time<input id={`${uid}-time`} type="time" className="status-select" style={{width:'100%'}} value={form.time} onChange={e=>f('time',e.target.value)} /></label>
            <label htmlFor={`${uid}-loc`}>Location<input id={`${uid}-loc`} className="status-select" style={{width:'100%'}} value={form.location} onChange={e=>f('location',e.target.value)} /></label>
            <label htmlFor={`${uid}-type`}>Incident Type<input id={`${uid}-type`} className="status-select" style={{width:'100%'}} value={form.type} onChange={e=>f('type',e.target.value)} /></label>
            <label htmlFor={`${uid}-sev`}>Severity
              <select id={`${uid}-sev`} className="status-select" style={{width:'100%'}} value={form.severity} onChange={e=>f('severity',e.target.value as IncidentSeverity)}>
                {(['Near Miss','First Aid','Medical Treatment','LTI','Fatality'] as IncidentSeverity[]).map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label htmlFor={`${uid}-rep`}>Reported By<input id={`${uid}-rep`} className="status-select" style={{width:'100%'}} value={form.reportedBy} onChange={e=>f('reportedBy',e.target.value)} /></label>
            <label htmlFor={`${uid}-inj`}>Injured Person(s)<input id={`${uid}-inj`} className="status-select" style={{width:'100%'}} placeholder="None" value={form.injured} onChange={e=>f('injured',e.target.value)} /></label>
          </div>
          {(['description','immediateAction','rootCause','correctiveAction'] as (keyof IncidentEntry)[]).map(field => (
            <label key={field} htmlFor={`${uid}-${field}`} style={{display:'block',marginTop:'0.65rem',fontSize:'0.8rem'}}>
              {field==='description'?'Description':field==='immediateAction'?'Immediate Action':field==='rootCause'?'Root Cause':'Corrective Action'}
              <textarea id={`${uid}-${field}`} className="rr-textarea" rows={2} value={form[field] as string} onChange={e=>f(field,e.target.value)} />
            </label>
          ))}
          <div style={{display:'flex',gap:'0.75rem',marginTop:'1rem'}}>
            <button type="button" className="btn btn-primary" onClick={handleSave}>Save</button>
            <button type="button" className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="section-title">Incident Log — {periodLabel(period)} ({filtered.length} records)</div>
        <div style={{display:'flex',flexDirection:'column',gap:'0.75rem',marginTop:'0.75rem'}}>
          {filtered.length === 0 && <div style={{color:'var(--muted)',fontSize:'0.85rem',textAlign:'center',padding:'1.5rem'}}>No incidents in this period.</div>}
          {filtered.map(i => (
            <div key={i.id} className="roadblock-item" style={{borderLeftColor: severityColor(i.severity)}}>
              <div className="roadblock-header" style={{cursor:'pointer'}} onClick={()=>setExpanded(expanded===i.id?null:i.id)}>
                <strong style={{fontSize:'0.85rem'}}>{i.id}</strong>
                <span className="tag">{i.date} {i.time}</span>
                <span className="badge" style={{background:`${severityColor(i.severity)}22`,color:severityColor(i.severity)}}>{i.severity}</span>
                <span className={`badge badge-${i.closed?'success':'warning'}`}>{i.closed?'Closed':'Open'}</span>
                <span style={{marginLeft:'auto',color:'var(--muted)',fontSize:'0.75rem'}}>{expanded===i.id?'▲':'▼'}</span>
              </div>
              <p style={{marginTop:'0.25rem'}}><strong>{i.type}</strong> — {i.location}</p>
              {expanded === i.id && (
                <div style={{marginTop:'0.75rem',display:'flex',flexDirection:'column',gap:'0.4rem',fontSize:'0.8rem'}}>
                  <div><span style={{color:'var(--muted)'}}>Description: </span>{i.description}</div>
                  <div><span style={{color:'var(--muted)'}}>Injured: </span>{i.injured||'None'}</div>
                  <div><span style={{color:'var(--muted)'}}>Immediate Action: </span>{i.immediateAction}</div>
                  <div><span style={{color:'var(--muted)'}}>Root Cause: </span>{i.rootCause}</div>
                  <div><span style={{color:'var(--muted)'}}>Corrective Action: </span>{i.correctiveAction}</div>
                  <div><span style={{color:'var(--muted)'}}>Reported by: </span>{i.reportedBy}</div>
                  <div style={{display:'flex',gap:'0.5rem',marginTop:'0.5rem'}}>
                    <button type="button" className="btn-ghost" style={{fontSize:'0.7rem'}} onClick={()=>openEdit(i)}>✎ Edit</button>
                    <button type="button" className="btn-ghost" style={{fontSize:'0.7rem'}} onClick={()=>toggleClose(i.id)}>{i.closed?'↺ Reopen':'✔ Close'}</button>
                    <button type="button" className="btn-ghost" style={{fontSize:'0.7rem'}} onClick={()=>deleteInc(i.id)}>✕ Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Problems tab ───────────────────────────────────────────────────────────
function ProblemsTab({ project }: { project: ReturnType<typeof useProject> }) {
  const [problems, setProblems] = useState<ProblemEntry[]>(seedProblems);
  const [period, setPeriod] = useState<Period>('monthly');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProblemEntry>(() => blankProblem('PRB-NEW'));
  const [summaryText, setSummaryText] = useState('');
  const uid = useId();

  const nextId = () => `PRB-${String(problems.length + 1).padStart(3,'0')}`;
  const filtered = problems.filter(p => period === 'monthly' || inPeriod(p.date, period));

  const openAdd = () => { setForm(blankProblem(nextId())); setEditId(null); setShowForm(true); setSummaryText(''); };
  const openEdit = (p: ProblemEntry) => { setForm({...p}); setEditId(p.id); setShowForm(true); setSummaryText(''); };
  const deleteProb = (id: string) => setProblems(prev => prev.filter(p => p.id !== id));

  const handleSave = () => {
    if (editId) setProblems(prev => prev.map(p => p.id === editId ? form : p));
    else setProblems(prev => [...prev, form]);
    setShowForm(false);
  };

  const f = (field: keyof ProblemEntry, val: string) =>
    setForm(prev => ({ ...prev, [field]: val }));

  const genSummary = () => setSummaryText(generateProblemSummary(problems, period, project.name));
  const download = () => {
    const blob = new Blob([summaryText], { type:'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`KAS-Problems-${period}.txt`; a.click(); URL.revokeObjectURL(url);
  };

  const statusColor = (s: ProblemStatus) =>
    s === 'Resolved' ? 'var(--success)' : s === 'In Progress' ? 'var(--warning)' : s === 'Escalated' ? 'var(--danger)' : 'var(--muted)';

  return (
    <div>
      <div className="exec-strip" style={{ marginBottom:'1.25rem' }}>
        <span>Total: <strong>{problems.length}</strong></span>
        <span>Open: <strong style={{color:'var(--muted)'}}>{problems.filter(p=>p.status==='Open').length}</strong></span>
        <span>In Progress: <strong style={{color:'var(--warning)'}}>{problems.filter(p=>p.status==='In Progress').length}</strong></span>
        <span>Resolved: <strong style={{color:'var(--success)'}}>{problems.filter(p=>p.status==='Resolved').length}</strong></span>
        <span>Escalated: <strong style={{color:'var(--danger)'}}>{problems.filter(p=>p.status==='Escalated').length}</strong></span>
      </div>

      <div className="sched-toolbar">
        <div className="sched-tabs">
          {(['daily','weekly','monthly'] as Period[]).map(p => (
            <button key={p} type="button" className={`sched-tab${period===p?' active':''}`} onClick={() => { setPeriod(p); setSummaryText(''); }}>
              {p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
        </div>
        <div className="sched-actions">
          <button type="button" className="btn btn-secondary" onClick={genSummary}>📄 Generate Summary</button>
          {summaryText && <button type="button" className="btn btn-secondary" onClick={download}>⬇ Download</button>}
          {summaryText && <button type="button" className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(summaryText)}>Copy</button>}
          <button type="button" className="btn btn-primary" onClick={openAdd}>+ Log Problem</button>
        </div>
      </div>

      {summaryText && (
        <div className="card" style={{ marginBottom:'1.25rem' }}>
          <div className="section-title">Problems Summary — {periodLabel(period)}</div>
          <div className="doc-output" style={{ maxHeight:'320px' }}>{summaryText}</div>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom:'1.25rem', borderColor:'var(--accent)' }}>
          <div className="section-title">{editId ? `Edit ${editId}` : 'Log New Problem'}</div>
          <div className="rr-form-grid">
            <label htmlFor={`${uid}-date`}>Date<input id={`${uid}-date`} type="date" className="status-select" style={{width:'100%'}} value={form.date} onChange={e=>f('date',e.target.value)} /></label>
            <label htmlFor={`${uid}-cat`}>Category<input id={`${uid}-cat`} className="status-select" style={{width:'100%'}} placeholder="Technical, Equipment…" value={form.category} onChange={e=>f('category',e.target.value)} /></label>
            <label htmlFor={`${uid}-owner`}>Owner<input id={`${uid}-owner`} className="status-select" style={{width:'100%'}} value={form.owner} onChange={e=>f('owner',e.target.value)} /></label>
            <label htmlFor={`${uid}-target`}>Target Date<input id={`${uid}-target`} type="date" className="status-select" style={{width:'100%'}} value={form.targetDate} onChange={e=>f('targetDate',e.target.value)} /></label>
            <label htmlFor={`${uid}-status`}>Status
              <select id={`${uid}-status`} className="status-select" style={{width:'100%'}} value={form.status} onChange={e=>f('status',e.target.value as ProblemStatus)}>
                {(['Open','In Progress','Resolved','Escalated'] as ProblemStatus[]).map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label htmlFor={`${uid}-resolved`}>Resolved Date<input id={`${uid}-resolved`} type="date" className="status-select" style={{width:'100%'}} value={form.resolvedDate} onChange={e=>f('resolvedDate',e.target.value)} /></label>
          </div>
          <label htmlFor={`${uid}-title`} style={{display:'block',marginTop:'0.65rem',fontSize:'0.8rem'}}>Title
            <input id={`${uid}-title`} className="status-select" style={{width:'100%'}} value={form.title} onChange={e=>f('title',e.target.value)} />
          </label>
          {(['description','impact','action'] as (keyof ProblemEntry)[]).map(field => (
            <label key={field} htmlFor={`${uid}-${field}`} style={{display:'block',marginTop:'0.65rem',fontSize:'0.8rem'}}>
              {field.charAt(0).toUpperCase()+field.slice(1)}
              <textarea id={`${uid}-${field}`} className="rr-textarea" rows={2} value={form[field] as string} onChange={e=>f(field,e.target.value)} />
            </label>
          ))}
          <div style={{display:'flex',gap:'0.75rem',marginTop:'1rem'}}>
            <button type="button" className="btn btn-primary" onClick={handleSave}>Save</button>
            <button type="button" className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="section-title">Problems Register — {periodLabel(period)} ({filtered.length} records)</div>
        <div style={{ overflowX:'auto' }}>
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Date</th><th>Category</th><th>Title</th><th>Owner</th><th>Target</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} style={{textAlign:'center',color:'var(--muted)',padding:'1.5rem'}}>No problems in this period.</td></tr>}
              {filtered.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.id}</strong></td>
                  <td>{p.date}</td>
                  <td><span className="tag">{p.category}</span></td>
                  <td style={{fontSize:'0.8rem',maxWidth:220}}>
                    <div>{p.title}</div>
                    <div style={{color:'var(--muted)',fontSize:'0.73rem',marginTop:'0.2rem'}}>{p.description.substring(0,70)}{p.description.length>70?'…':''}</div>
                    <div style={{color:'var(--danger)',fontSize:'0.73rem'}}>↳ {p.impact.substring(0,60)}{p.impact.length>60?'…':''}</div>
                  </td>
                  <td style={{fontSize:'0.78rem'}}>{p.owner}</td>
                  <td style={{fontSize:'0.78rem'}}>{p.targetDate}</td>
                  <td><span className="badge" style={{background:`${statusColor(p.status)}22`,color:statusColor(p.status)}}>{p.status}</span></td>
                  <td>
                    <button type="button" className="btn-ghost" style={{fontSize:'0.7rem',padding:'0.2rem 0.5rem'}} onClick={()=>openEdit(p)}>✎</button>
                    <button type="button" className="btn-ghost" style={{fontSize:'0.7rem',padding:'0.2rem 0.5rem',marginLeft:4}} onClick={()=>deleteProb(p.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function RiskRegister() {
  const project = useProject();
  const [tab, setTab] = useState<ActiveTab>('risks');

  return (
    <>
      <PageHeader
        title="Risk, Incidents & Problems"
        subtitle="Risk register · Incident reporting · Problems log — daily, weekly & monthly summaries"
        badge={{ text: 'Live Register', variant: 'warning' }}
      />

      <div className="sched-toolbar" style={{ marginBottom:'1.5rem' }}>
        <div className="sched-tabs">
          <button type="button" className={`sched-tab${tab==='risks'?' active':''}`} onClick={()=>setTab('risks')}>⚠ Risk Register</button>
          <button type="button" className={`sched-tab${tab==='incidents'?' active':''}`} onClick={()=>setTab('incidents')}>🚨 Incident Reports</button>
          <button type="button" className={`sched-tab${tab==='problems'?' active':''}`} onClick={()=>setTab('problems')}>🔧 Problems Log</button>
        </div>
      </div>

      {tab === 'risks'     && <RisksTab project={project} />}
      {tab === 'incidents' && <IncidentsTab project={project} />}
      {tab === 'problems'  && <ProblemsTab project={project} />}
    </>
  );
}
