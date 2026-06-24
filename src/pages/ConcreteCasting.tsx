import { useState, useId } from 'react';
import PageHeader from '../components/PageHeader';
import ExcelImport from '../components/ExcelImport';
import { useProject } from '../store/projectStore';
import { formatETB } from '../data/projectData';

// ── Types ────────────────────────────────────────────────────────────────────
export type ConcreteGrade = 'C15' | 'C20' | 'C25' | 'C30' | 'C35' | 'C40';
export type PourStatus = 'Scheduled' | 'Approved' | 'Poured' | 'Cured' | 'Completed' | 'On Hold';
export type CubeResult = 'Pending' | 'Passed' | 'Failed';

export interface ConcreteElement {
  id: string;
  elementRef: string;     // e.g. F-1, C-G01, S-B1
  elementType: 'Foundation' | 'Column' | 'Beam' | 'Slab' | 'Wall' | 'PCC' | 'Other';
  gridRef: string;        // e.g. A1-B2
  level: string;          // B/G, Ground, 1st, etc.
  grade: ConcreteGrade;
  volume: number;         // m³
  scheduledDate: string;  // YYYY-MM-DD
  status: PourStatus;
  mixtureDesign: string;  // e.g. 1:1.5:3 / W/C 0.45
  supplier: string;
  approvedBy: string;
  actualDate: string;
  actualVolume: number;
  notes: string;
}

export interface PourRequest {
  id: string;
  elementId: string;
  requestDate: string;
  requestedBy: string;
  scheduledPourDate: string;
  grade: ConcreteGrade;
  volume: number;
  supplier: string;
  mixtureDesign: string;
  slump: string;
  cubeCount: number;
  location: string;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  approvedBy: string;
  approvalDate: string;
  remarks: string;
}

export interface CubeTest {
  id: string;
  elementId: string;
  pourDate: string;
  sampleDate: string;
  testAge: '7-day' | '28-day' | '3-day';
  testDate: string;
  strength: number;       // N/mm²
  requiredStrength: number;
  result: CubeResult;
  testedBy: string;
  labRef: string;
}

// ── Grade target strengths (N/mm²) ──────────────────────────────────────────
const GRADE_STRENGTHS: Record<ConcreteGrade, number> = {
  C15: 15, C20: 20, C25: 25, C30: 30, C35: 35, C40: 40,
};

// ── Mix design defaults ──────────────────────────────────────────────────────
const MIX_DESIGNS: Record<ConcreteGrade, string> = {
  C15: '1:2:4 / W/C 0.60', C20: '1:1.75:3.5 / W/C 0.55',
  C25: '1:1.5:3 / W/C 0.50', C30: '1:1.25:2.5 / W/C 0.45',
  C35: '1:1:2 / W/C 0.40',  C40: '1:0.75:1.5 / W/C 0.35',
};

// ── Seed data ────────────────────────────────────────────────────────────────
const SEED_ELEMENTS: ConcreteElement[] = [
  { id:'CE-001', elementRef:'F-1', elementType:'Foundation', gridRef:'A1-B2', level:'B/G', grade:'C25', volume:29.65, scheduledDate:'2026-05-10', status:'Completed', mixtureDesign:'1:1.5:3 / W/C 0.50', supplier:'Derba Cement', approvedBy:'Adey Eng. RE', actualDate:'2026-05-14', actualVolume:29.65, notes:'7-day cube CP-F1-01 passed' },
  { id:'CE-002', elementRef:'PCC-B', elementType:'PCC', gridRef:'A1-D4', level:'B/G', grade:'C15', volume:18.0, scheduledDate:'2026-05-05', status:'Completed', mixtureDesign:'1:2:4 / W/C 0.60', supplier:'Mugher Cement', approvedBy:'Adey Eng. RE', actualDate:'2026-05-06', actualVolume:18.0, notes:'Blinding under F-1' },
  { id:'CE-003', elementRef:'F-2', elementType:'Foundation', gridRef:'C1-D2', level:'B/G', grade:'C25', volume:24.0, scheduledDate:'2026-06-20', status:'Scheduled', mixtureDesign:'1:1.5:3 / W/C 0.50', supplier:'Derba Cement', approvedBy:'', actualDate:'', actualVolume:0, notes:'Awaiting NCR-005 closure' },
  { id:'CE-004', elementRef:'F-3', elementType:'Foundation', gridRef:'A3-B4', level:'B/G', grade:'C25', volume:22.5, scheduledDate:'2026-07-05', status:'Scheduled', mixtureDesign:'1:1.5:3 / W/C 0.50', supplier:'Derba Cement', approvedBy:'', actualDate:'', actualVolume:0, notes:'' },
  { id:'CE-005', elementRef:'C-G01', elementType:'Column', gridRef:'A1', level:'Ground', grade:'C30', volume:3.2, scheduledDate:'2026-08-01', status:'Scheduled', mixtureDesign:'1:1.25:2.5 / W/C 0.45', supplier:'Derba Cement', approvedBy:'', actualDate:'', actualVolume:0, notes:'Per SI-012 — after substructure completion' },
];

const SEED_CUBES: CubeTest[] = [
  { id:'CT-001', elementId:'CE-001', pourDate:'2026-05-14', sampleDate:'2026-05-14', testAge:'7-day',  testDate:'2026-05-21', strength:19.8, requiredStrength:25*0.65, result:'Passed', testedBy:'Site Lab', labRef:'CP-F1-01' },
  { id:'CT-002', elementId:'CE-001', pourDate:'2026-05-14', sampleDate:'2026-05-14', testAge:'28-day', testDate:'2026-06-11', strength:0,    requiredStrength:25,      result:'Pending', testedBy:'Site Lab', labRef:'CP-F1-02' },
];

const SEED_REQUESTS: PourRequest[] = [
  { id:'PR-001', elementId:'CE-001', requestDate:'2026-05-10', requestedBy:'Eng. Kasaye Getachew', scheduledPourDate:'2026-05-14', grade:'C25', volume:29.65, supplier:'Derba Cement', mixtureDesign:'1:1.5:3 / W/C 0.50', slump:'75-100mm', cubeCount:6, location:'Foundation F-1, Grid A1-B2, -7.55m BGL', approvalStatus:'Approved', approvedBy:'Adey Eng. RE', approvalDate:'2026-05-12', remarks:'Cube sampling: 3 sets × 2 cubes. 24hr curing on site.' },
];

const todayStr = () => new Date().toISOString().substring(0, 10);
const fmtDate  = (s: string) => s ? new Date(s).toLocaleDateString('en-GB') : '—';

// ── Print Pour Request ───────────────────────────────────────────────────────
function printPourRequest(req: PourRequest, el: ConcreteElement | undefined, project: ReturnType<typeof useProject>) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>Pour Request ${req.id}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:10pt;margin:0;padding:1.2cm;color:#000}
    h2{text-align:center;font-size:14pt;margin:0;border-bottom:2px solid #1a3a5c;padding-bottom:6px}
    h3{text-align:center;font-size:10pt;margin:4px 0 12px;color:#444}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
    .field{border:1px solid #ccc;border-radius:4px;padding:6px 8px}
    .label{font-size:8pt;color:#666;text-transform:uppercase;letter-spacing:.04em;display:block}
    .value{font-size:10pt;font-weight:bold;margin-top:2px}
    .full{grid-column:1/-1}
    table{width:100%;border-collapse:collapse;margin:10px 0}
    th{background:#1a3a5c;color:#fff;padding:5px 8px;font-size:9pt;text-align:left}
    td{border:1px solid #ddd;padding:5px 8px;font-size:9pt}
    .sig-row{display:flex;justify-content:space-between;margin-top:24px}
    .sig{border-top:1px solid #333;width:160px;text-align:center;padding-top:4px;font-size:8pt}
    .status-box{text-align:center;border:2px solid #1a3a5c;border-radius:6px;padding:8px;margin:10px 0;font-size:12pt;font-weight:bold}
    @page{size:A4;margin:1.2cm}
  </style></head><body>
  <h2>${project.contractor}</h2>
  <h3>CONCRETE POUR REQUEST FORM</h3>
  <div class="grid">
    <div class="field"><span class="label">Request No.</span><div class="value">${req.id}</div></div>
    <div class="field"><span class="label">Request Date</span><div class="value">${fmtDate(req.requestDate)}</div></div>
    <div class="field"><span class="label">Project</span><div class="value">${project.name}</div></div>
    <div class="field"><span class="label">Contract No.</span><div class="value">${project.contractId}</div></div>
    <div class="field"><span class="label">Element Ref.</span><div class="value">${el?.elementRef ?? '—'}</div></div>
    <div class="field"><span class="label">Element Type</span><div class="value">${el?.elementType ?? '—'}</div></div>
    <div class="field"><span class="label">Grid Reference</span><div class="value">${el?.gridRef ?? '—'}</div></div>
    <div class="field"><span class="label">Level</span><div class="value">${el?.level ?? '—'}</div></div>
    <div class="field"><span class="label">Concrete Grade</span><div class="value">${req.grade}</div></div>
    <div class="field"><span class="label">Volume (m³)</span><div class="value">${req.volume} m³</div></div>
    <div class="field"><span class="label">Mix Design</span><div class="value">${req.mixtureDesign}</div></div>
    <div class="field"><span class="label">Target Slump</span><div class="value">${req.slump}</div></div>
    <div class="field"><span class="label">Concrete Supplier</span><div class="value">${req.supplier}</div></div>
    <div class="field"><span class="label">No. of Cube Sets</span><div class="value">${req.cubeCount} cubes</div></div>
    <div class="field full"><span class="label">Pour Location</span><div class="value">${req.location}</div></div>
    <div class="field"><span class="label">Scheduled Pour Date</span><div class="value">${fmtDate(req.scheduledPourDate)}</div></div>
    <div class="field"><span class="label">Requested By</span><div class="value">${req.requestedBy}</div></div>
    ${req.remarks ? `<div class="field full"><span class="label">Remarks</span><div class="value">${req.remarks}</div></div>` : ''}
  </div>
  <table>
    <thead><tr><th>Pre-Pour Checklist</th><th>Status</th></tr></thead>
    <tbody>
      ${['Formwork inspection complete','Rebar inspection & cover verified','Electrical / plumbing sleeves placed','Foundation / kicker levels checked','Mix design approved by RE','Cube moulds and slump cone available','Vibrators checked — operational','HSE inspection cleared','RE / Consultant notification sent'].map(item =>
        `<tr><td>${item}</td><td style="text-align:center">☐</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="status-box" style="color:${req.approvalStatus==='Approved'?'#2e7d32':req.approvalStatus==='Rejected'?'#c62828':'#b8890f'}">
    ${req.approvalStatus.toUpperCase()}
    ${req.approvalStatus==='Approved'?` — ${req.approvedBy}, ${fmtDate(req.approvalDate)}`:''}
  </div>
  <div class="sig-row">
    <div class="sig">Prepared by<br/>${req.requestedBy}<br/>Contractor</div>
    <div class="sig">Reviewed by<br/>Site Engineer<br/>________________</div>
    <div class="sig">Approved by<br/>Resident Engineer<br/>${project.consultant}</div>
  </div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script>
  </body></html>`;
  const w = window.open('', '_blank', 'width=800,height=650');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

// ── Main Page ────────────────────────────────────────────────────────────────
type CCTab = 'schedule' | 'requests' | 'cubes';

export default function ConcreteCasting() {
  const project = useProject();
  const uid = useId();

  const [tab, setTab] = useState<CCTab>('schedule');
  const [elements, setElements] = useState<ConcreteElement[]>(SEED_ELEMENTS);
  const [requests, setRequests] = useState<PourRequest[]>(SEED_REQUESTS);
  const [cubes, setCubes] = useState<CubeTest[]>(SEED_CUBES);

  const [showElemForm, setShowElemForm] = useState(false);
  const [showReqForm, setShowReqForm]   = useState(false);
  const [showCubeForm, setShowCubeForm] = useState(false);
  const [editElemId, setEditElemId] = useState<string | null>(null);

  const blankElem = (): ConcreteElement => ({
    id: `CE-${String(elements.length + 1).padStart(3,'0')}`,
    elementRef:'', elementType:'Foundation', gridRef:'', level:'B/G',
    grade:'C25', volume:0, scheduledDate: todayStr(), status:'Scheduled',
    mixtureDesign: MIX_DESIGNS['C25'], supplier:'Derba Cement',
    approvedBy:'', actualDate:'', actualVolume:0, notes:'',
  });

  const blankReq = (): PourRequest => ({
    id: `PR-${String(requests.length + 1).padStart(3,'0')}`,
    elementId: elements[0]?.id ?? '', requestDate: todayStr(),
    requestedBy: project.projectManager, scheduledPourDate: todayStr(),
    grade:'C25', volume:0, supplier:'Derba Cement',
    mixtureDesign: MIX_DESIGNS['C25'], slump:'75-100mm', cubeCount:6,
    location:'', approvalStatus:'Pending', approvedBy:'', approvalDate:'', remarks:'',
  });

  const blankCube = (): CubeTest => ({
    id: `CT-${String(cubes.length + 1).padStart(3,'0')}`,
    elementId: elements[0]?.id ?? '', pourDate: todayStr(), sampleDate: todayStr(),
    testAge:'7-day', testDate:'', strength:0,
    requiredStrength: GRADE_STRENGTHS['C25'], result:'Pending',
    testedBy:'Site Lab', labRef:'',
  });

  const [elemForm, setElemForm] = useState<ConcreteElement>(blankElem);
  const [reqForm,  setReqForm]  = useState<PourRequest>(blankReq);
  const [cubeForm, setCubeForm] = useState<CubeTest>(blankCube);

  const ef  = (k: keyof ConcreteElement, v: string | number) => setElemForm(p => ({ ...p, [k]: v }));
  const rf  = (k: keyof PourRequest, v: string | number)     => setReqForm(p => ({ ...p, [k]: v }));
  const cf  = (k: keyof CubeTest, v: string | number)        => setCubeForm(p => ({ ...p, [k]: v }));

  const saveElem = () => {
    if (editElemId) setElements(p => p.map(e => e.id === editElemId ? elemForm : e));
    else setElements(p => [...p, elemForm]);
    setShowElemForm(false); setEditElemId(null);
  };
  const deleteElem = (id: string) => setElements(p => p.filter(e => e.id !== id));

  const saveReq = () => { setRequests(p => [...p, reqForm]); setShowReqForm(false); };
  const approveReq = (id: string) => setRequests(p => p.map(r =>
    r.id === id ? { ...r, approvalStatus:'Approved', approvedBy: project.projectManager, approvalDate: todayStr() } : r
  ));
  const rejectReq  = (id: string) => setRequests(p => p.map(r =>
    r.id === id ? { ...r, approvalStatus:'Rejected' } : r
  ));

  const saveCube = () => {
    const req = GRADE_STRENGTHS[elements.find(e => e.id === cubeForm.elementId)?.grade ?? 'C25'];
    const reqAtAge = cubeForm.testAge === '7-day' ? req * 0.65 : cubeForm.testAge === '3-day' ? req * 0.45 : req;
    const result: CubeResult = cubeForm.strength === 0 ? 'Pending' : cubeForm.strength >= reqAtAge ? 'Passed' : 'Failed';
    setCubes(p => [...p, { ...cubeForm, requiredStrength: reqAtAge, result }]);
    setShowCubeForm(false);
  };

  // KPIs
  const totalVol     = elements.reduce((s, e) => s + e.volume, 0);
  const pouredVol    = elements.filter(e => e.status === 'Completed' || e.status === 'Poured' || e.status === 'Cured').reduce((s, e) => s + e.actualVolume, 0);
  const pendingCount = elements.filter(e => e.status === 'Scheduled' || e.status === 'Approved').length;
  const passedCubes  = cubes.filter(c => c.result === 'Passed').length;
  const failedCubes  = cubes.filter(c => c.result === 'Failed').length;

  const statusBadge = (s: PourStatus) => {
    const m: Record<PourStatus, string> = { Scheduled:'badge-muted', Approved:'badge-success', Poured:'badge-accent', Cured:'badge-warning', Completed:'badge-success', 'On Hold':'badge-danger' };
    return m[s] ?? 'badge-muted';
  };

  return (
    <>
      <PageHeader
        title="Concrete Casting Schedule & Requests"
        subtitle="Pour schedule · Request forms · Cube test tracking · Mix design register"
      />

      {/* KPIs */}
      <div className="grid grid-4" style={{ marginBottom:'1.25rem' }}>
        <div className="card kpi-accent">
          <div className="card-label">Total Volume Scheduled</div>
          <div className="card-value">{totalVol.toFixed(2)} m³</div>
        </div>
        <div className="card kpi-success">
          <div className="card-label">Volume Poured</div>
          <div className="card-value">{pouredVol.toFixed(2)} m³</div>
          <div className="card-sub">{totalVol > 0 ? ((pouredVol/totalVol)*100).toFixed(1) : 0}% complete</div>
        </div>
        <div className="card kpi-warning">
          <div className="card-label">Pending Pours</div>
          <div className="card-value">{pendingCount}</div>
        </div>
        <div className="card" style={{ borderTopColor: failedCubes > 0 ? 'var(--danger)' : 'var(--success)' }}>
          <div className="card-label">Cube Tests</div>
          <div className="card-value">{cubes.length}</div>
          <div className="card-sub" style={{ color: failedCubes > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {passedCubes} passed · {failedCubes} failed · {cubes.filter(c => c.result === 'Pending').length} pending
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sched-toolbar" style={{ marginBottom:'1.25rem' }}>
        <div className="sched-tabs">
          {(['schedule','requests','cubes'] as CCTab[]).map(t => (
            <button key={t} type="button" className={`sched-tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}>
              {t === 'schedule' ? '📅 Cast Schedule' : t === 'requests' ? '📋 Pour Requests' : '🧪 Cube Tests'}
            </button>
          ))}
        </div>
        <div className="sched-actions">
          {tab === 'schedule' && <button type="button" className="btn btn-primary"
            onClick={() => { setElemForm(blankElem()); setEditElemId(null); setShowElemForm(true); }}>+ Add Element</button>}
          {tab === 'requests' && <button type="button" className="btn btn-primary"
            onClick={() => { setReqForm(blankReq()); setShowReqForm(true); }}>+ New Pour Request</button>}
          {tab === 'cubes' && <button type="button" className="btn btn-primary"
            onClick={() => { setCubeForm(blankCube()); setShowCubeForm(true); }}>+ Log Cube Test</button>}
        </div>
      </div>

      {/* Excel import */}
      <ExcelImport
        moduleId="concrete-elements"
        label="Import Concrete Elements from Excel / CSV"
        templateColumns={['ID','ElementRef','ElementType','GridRef','Level','Grade','Volume','ScheduledDate','Status','Supplier','Notes']}
        templateRows={[['CE-006','F-4','Foundation','E1-F2','B/G','C25','20.5','2026-07-15','Scheduled','Derba Cement','']]}
        onImport={(records) => {
          const imported: ConcreteElement[] = records.filter(r => r['ElementRef']).map(r => ({
            id: r['ID'] || `CE-${Date.now()}`,
            elementRef: r['ElementRef'] ?? '', elementType: (r['ElementType'] ?? 'Foundation') as ConcreteElement['elementType'],
            gridRef: r['GridRef'] ?? '', level: r['Level'] ?? '', grade: (r['Grade'] ?? 'C25') as ConcreteGrade,
            volume: parseFloat(r['Volume'] ?? '0') || 0,
            scheduledDate: r['ScheduledDate'] ?? todayStr(), status: (r['Status'] ?? 'Scheduled') as PourStatus,
            mixtureDesign: MIX_DESIGNS[(r['Grade'] ?? 'C25') as ConcreteGrade],
            supplier: r['Supplier'] ?? 'Derba Cement', approvedBy: '', actualDate: '', actualVolume: 0,
            notes: r['Notes'] ?? '',
          }));
          setElements(p => [...p, ...imported]);
        }}
      />

      {/* ── SCHEDULE TAB ── */}
      {tab === 'schedule' && (
        <>
          {showElemForm && (
            <div className="card" style={{ marginBottom:'1.25rem', borderColor:'var(--accent)' }}>
              <div className="section-title">{editElemId ? `Edit ${editElemId}` : 'Add Concrete Element'}</div>
              <div className="rr-form-grid" style={{ marginTop:'0.75rem' }}>
                {([['Element ID','id'],['Element Ref.','elementRef'],['Grid Ref.','gridRef'],['Level','level'],['Supplier','supplier'],['Approved By','approvedBy']] as [string, keyof ConcreteElement][]).map(([label, k]) => (
                  <label key={k} style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                    {label} <input className="status-select" style={{ width:'100%' }} value={String(elemForm[k])} onChange={e => ef(k, e.target.value)} />
                  </label>
                ))}
                <label style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                  Element Type
                  <select className="status-select" style={{ width:'100%' }} value={elemForm.elementType} onChange={e => ef('elementType', e.target.value)}>
                    {(['Foundation','Column','Beam','Slab','Wall','PCC','Other'] as ConcreteElement['elementType'][]).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                  Grade
                  <select className="status-select" style={{ width:'100%' }} value={elemForm.grade}
                    onChange={e => { ef('grade', e.target.value); ef('mixtureDesign', MIX_DESIGNS[e.target.value as ConcreteGrade]); }}>
                    {(['C15','C20','C25','C30','C35','C40'] as ConcreteGrade[]).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </label>
                <label style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                  Volume (m³) <input type="number" className="status-select" style={{ width:'100%' }} value={elemForm.volume} onChange={e => ef('volume', parseFloat(e.target.value)||0)} />
                </label>
                <label style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                  Scheduled Date <input type="date" className="status-select" style={{ width:'100%' }} value={elemForm.scheduledDate} onChange={e => ef('scheduledDate', e.target.value)} />
                </label>
                <label style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                  Status
                  <select className="status-select" style={{ width:'100%' }} value={elemForm.status} onChange={e => ef('status', e.target.value)}>
                    {(['Scheduled','Approved','Poured','Cured','Completed','On Hold'] as PourStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                  Mix Design <input className="status-select" style={{ width:'100%' }} value={elemForm.mixtureDesign} onChange={e => ef('mixtureDesign', e.target.value)} />
                </label>
                <label style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                  Actual Pour Date <input type="date" className="status-select" style={{ width:'100%' }} value={elemForm.actualDate} onChange={e => ef('actualDate', e.target.value)} />
                </label>
                <label style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                  Actual Volume (m³) <input type="number" className="status-select" style={{ width:'100%' }} value={elemForm.actualVolume} onChange={e => ef('actualVolume', parseFloat(e.target.value)||0)} />
                </label>
              </div>
              <label style={{ display:'block', marginTop:'0.65rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                Notes <textarea className="rr-textarea" rows={2} style={{ marginTop:'0.3rem' }} value={elemForm.notes} onChange={e => ef('notes', e.target.value)} />
              </label>
              <div style={{ display:'flex', gap:'0.75rem', marginTop:'1rem' }}>
                <button type="button" className="btn btn-primary" onClick={saveElem}>Save</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowElemForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="card">
            <div className="section-title">Concrete Casting Schedule ({elements.length} elements · {totalVol.toFixed(1)} m³ total)</div>
            <div style={{ overflowX:'auto' }}>
              <table className="data-table" style={{ fontSize:'0.78rem' }}>
                <thead>
                  <tr>
                    <th>ID</th><th>Ref.</th><th>Type</th><th>Grid</th><th>Level</th>
                    <th>Grade</th><th>Vol (m³)</th><th>Mix Design</th>
                    <th>Sched. Date</th><th>Actual Date</th><th>Status</th><th>Approved By</th><th>Notes</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {elements.map(e => (
                    <tr key={e.id}>
                      <td><strong>{e.id}</strong></td>
                      <td style={{ fontWeight:600, color:'var(--accent)' }}>{e.elementRef}</td>
                      <td><span className="tag">{e.elementType}</span></td>
                      <td style={{ fontSize:'0.72rem' }}>{e.gridRef}</td>
                      <td>{e.level}</td>
                      <td><span className="badge badge-accent" style={{ background:'rgba(212,160,23,0.15)' }}>{e.grade}</span></td>
                      <td style={{ fontWeight:600 }}>{e.volume}</td>
                      <td style={{ fontSize:'0.7rem', color:'var(--muted)' }}>{e.mixtureDesign}</td>
                      <td>{fmtDate(e.scheduledDate)}</td>
                      <td style={{ color: e.actualDate ? 'var(--success)' : 'var(--muted)' }}>{e.actualDate ? fmtDate(e.actualDate) : '—'}</td>
                      <td><span className={`badge ${statusBadge(e.status)}`}>{e.status}</span></td>
                      <td style={{ fontSize:'0.72rem' }}>{e.approvedBy || '—'}</td>
                      <td style={{ fontSize:'0.72rem', color:'var(--muted)', maxWidth:140 }}>{e.notes}</td>
                      <td style={{ whiteSpace:'nowrap' }}>
                        <button type="button" className="btn-ghost" style={{ fontSize:'0.7rem', padding:'0.15rem 0.4rem' }}
                          onClick={() => { setElemForm(e); setEditElemId(e.id); setShowElemForm(true); }}>✎</button>
                        <button type="button" className="btn-ghost" style={{ fontSize:'0.7rem', padding:'0.15rem 0.4rem', marginLeft:3 }}
                          onClick={() => deleteElem(e.id)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mix design reference */}
          <div className="card" style={{ marginTop:'1.25rem' }}>
            <div className="section-title">Mix Design Reference</div>
            <table className="data-table" style={{ fontSize:'0.8rem' }}>
              <thead><tr><th>Grade</th><th>Mix Ratio</th><th>W/C Ratio</th><th>Target Strength (N/mm²)</th><th>Typical Use</th></tr></thead>
              <tbody>
                {([['C15','1:2:4','0.60',15,'Blinding, PCC'],['C20','1:1.75:3.5','0.55',20,'Mass concrete'],['C25','1:1.5:3','0.50',25,'Foundations, slabs'],['C30','1:1.25:2.5','0.45',30,'Columns, beams'],['C35','1:1:2','0.40',35,'High-rise columns'],['C40','1:0.75:1.5','0.35',40,'PT slabs, bridges']] as [string,string,string,number,string][]).map(([g,mix,wc,str,use]) => (
                  <tr key={g}>
                    <td><strong>{g}</strong></td><td>{mix}</td><td>{wc}</td>
                    <td>{str} N/mm²</td><td style={{ color:'var(--muted)', fontSize:'0.75rem' }}>{use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── REQUESTS TAB ── */}
      {tab === 'requests' && (
        <>
          {showReqForm && (
            <div className="card" style={{ marginBottom:'1.25rem', borderColor:'var(--accent)' }}>
              <div className="section-title">New Concrete Pour Request</div>
              <div className="rr-form-grid" style={{ marginTop:'0.75rem' }}>
                <label style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                  Element
                  <select className="status-select" style={{ width:'100%' }} value={reqForm.elementId} onChange={e => {
                    const el = elements.find(x => x.id === e.target.value);
                    setReqForm(p => ({ ...p, elementId: e.target.value, grade: el?.grade ?? p.grade, volume: el?.volume ?? p.volume, mixtureDesign: el?.mixtureDesign ?? p.mixtureDesign, location: el ? `${el.elementType} ${el.elementRef}, Grid ${el.gridRef}, Level ${el.level}` : p.location }));
                  }}>
                    {elements.map(el => <option key={el.id} value={el.id}>{el.elementRef} — {el.elementType} ({el.grade})</option>)}
                  </select>
                </label>
                {([['Request Date','requestDate','date'],['Pour Date','scheduledPourDate','date'],['Volume (m³)','volume','number'],['Slump Target','slump','text'],['Cube Count','cubeCount','number'],['Supplier','supplier','text'],['Requested By','requestedBy','text']] as [string,keyof PourRequest,string][]).map(([label,k,type]) => (
                  <label key={k} style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                    {label} <input type={type} className="status-select" style={{ width:'100%' }} value={String(reqForm[k])} onChange={e => rf(k, type === 'number' ? parseFloat(e.target.value)||0 : e.target.value)} />
                  </label>
                ))}
                <label style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                  Mix Design <input className="status-select" style={{ width:'100%' }} value={reqForm.mixtureDesign} onChange={e => rf('mixtureDesign', e.target.value)} />
                </label>
              </div>
              <label htmlFor={`${uid}-loc`} style={{ display:'block', marginTop:'0.65rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                Pour Location
                <input id={`${uid}-loc`} className="status-select" style={{ width:'100%', marginTop:'0.3rem' }} value={reqForm.location} onChange={e => rf('location', e.target.value)} />
              </label>
              <label htmlFor={`${uid}-rem`} style={{ display:'block', marginTop:'0.65rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                Remarks
                <textarea id={`${uid}-rem`} className="rr-textarea" rows={2} style={{ marginTop:'0.3rem' }} value={reqForm.remarks} onChange={e => rf('remarks', e.target.value)} />
              </label>
              <div style={{ display:'flex', gap:'0.75rem', marginTop:'1rem' }}>
                <button type="button" className="btn btn-primary" onClick={saveReq}>Submit Request</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReqForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="card">
            <div className="section-title">Pour Request Register ({requests.length})</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.85rem', marginTop:'0.75rem' }}>
              {requests.map(r => {
                const el = elements.find(e => e.id === r.elementId);
                return (
                  <div key={r.id} className="roadblock-item" style={{ borderLeftColor: r.approvalStatus === 'Approved' ? 'var(--success)' : r.approvalStatus === 'Rejected' ? 'var(--danger)' : 'var(--warning)' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'0.5rem' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap', marginBottom:'0.3rem' }}>
                          <strong>{r.id}</strong>
                          <span className="badge badge-accent" style={{ background:'rgba(212,160,23,0.15)' }}>{r.grade}</span>
                          <span className={`badge badge-${r.approvalStatus === 'Approved' ? 'success' : r.approvalStatus === 'Rejected' ? 'danger' : 'warning'}`}>{r.approvalStatus}</span>
                          <span style={{ fontSize:'0.72rem', color:'var(--muted)' }}>Requested: {fmtDate(r.requestDate)}</span>
                        </div>
                        <div style={{ fontSize:'0.82rem' }}>
                          <strong>{el?.elementRef ?? r.elementId}</strong> · {r.volume} m³ · {r.mixtureDesign} · Slump: {r.slump}
                        </div>
                        <div style={{ fontSize:'0.78rem', color:'var(--muted)', marginTop:'0.2rem' }}>
                          Pour date: {fmtDate(r.scheduledPourDate)} · Supplier: {r.supplier} · {r.cubeCount} cube samples
                        </div>
                        <div style={{ fontSize:'0.78rem', color:'var(--muted)' }}>{r.location}</div>
                        {r.approvalStatus === 'Approved' && <div style={{ fontSize:'0.75rem', color:'var(--success)', marginTop:'0.2rem' }}>✔ Approved by {r.approvedBy} on {fmtDate(r.approvalDate)}</div>}
                      </div>
                      <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                        <button type="button" className="btn btn-secondary" style={{ fontSize:'0.72rem', padding:'0.3rem 0.7rem' }}
                          onClick={() => printPourRequest(r, el, project)}>🖨 Print</button>
                        {r.approvalStatus === 'Pending' && <>
                          <button type="button" className="btn btn-primary" style={{ fontSize:'0.72rem', padding:'0.3rem 0.7rem' }}
                            onClick={() => approveReq(r.id)}>✔ Approve</button>
                          <button type="button" className="btn btn-secondary" style={{ fontSize:'0.72rem', padding:'0.3rem 0.7rem', color:'var(--danger)' }}
                            onClick={() => rejectReq(r.id)}>✕ Reject</button>
                        </>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── CUBE TESTS TAB ── */}
      {tab === 'cubes' && (
        <>
          {showCubeForm && (
            <div className="card" style={{ marginBottom:'1.25rem', borderColor:'var(--accent)' }}>
              <div className="section-title">Log Cube Test Result</div>
              <div className="rr-form-grid" style={{ marginTop:'0.75rem' }}>
                <label style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                  Element
                  <select className="status-select" style={{ width:'100%' }} value={cubeForm.elementId} onChange={e => cf('elementId', e.target.value)}>
                    {elements.map(el => <option key={el.id} value={el.id}>{el.elementRef} — {el.grade}</option>)}
                  </select>
                </label>
                <label style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                  Test Age
                  <select className="status-select" style={{ width:'100%' }} value={cubeForm.testAge} onChange={e => cf('testAge', e.target.value)}>
                    {(['3-day','7-day','28-day'] as CubeTest['testAge'][]).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                {([['Lab Ref.','labRef','text'],['Pour Date','pourDate','date'],['Sample Date','sampleDate','date'],['Test Date','testDate','date'],['Strength (N/mm²)','strength','number'],['Tested By','testedBy','text']] as [string,keyof CubeTest,string][]).map(([label,k,type]) => (
                  <label key={k} style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                    {label} <input type={type} className="status-select" style={{ width:'100%' }} value={String(cubeForm[k])} onChange={e => cf(k, type === 'number' ? parseFloat(e.target.value)||0 : e.target.value)} />
                  </label>
                ))}
              </div>
              <div style={{ display:'flex', gap:'0.75rem', marginTop:'1rem' }}>
                <button type="button" className="btn btn-primary" onClick={saveCube}>Save Result</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCubeForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="card">
            <div className="section-title">Cube Test Register ({cubes.length} samples)</div>
            <div style={{ overflowX:'auto' }}>
              <table className="data-table" style={{ fontSize:'0.78rem' }}>
                <thead>
                  <tr><th>ID</th><th>Lab Ref.</th><th>Element</th><th>Age</th><th>Pour Date</th><th>Test Date</th><th>Strength (N/mm²)</th><th>Required</th><th>Result</th><th>Tested By</th></tr>
                </thead>
                <tbody>
                  {cubes.map(c => {
                    const el = elements.find(e => e.id === c.elementId);
                    return (
                      <tr key={c.id}>
                        <td><strong>{c.id}</strong></td>
                        <td style={{ color:'var(--accent)' }}>{c.labRef}</td>
                        <td>{el?.elementRef ?? c.elementId}</td>
                        <td><span className="tag">{c.testAge}</span></td>
                        <td>{fmtDate(c.pourDate)}</td>
                        <td>{c.testDate ? fmtDate(c.testDate) : <span style={{ color:'var(--muted)' }}>Pending</span>}</td>
                        <td style={{ fontWeight:600 }}>{c.strength > 0 ? `${c.strength} N/mm²` : '—'}</td>
                        <td style={{ color:'var(--muted)' }}>≥ {c.requiredStrength.toFixed(1)} N/mm²</td>
                        <td>
                          <span className={`badge badge-${c.result === 'Passed' ? 'success' : c.result === 'Failed' ? 'danger' : 'warning'}`}>
                            {c.result}
                          </span>
                        </td>
                        <td style={{ fontSize:'0.72rem', color:'var(--muted)' }}>{c.testedBy}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="exec-strip" style={{ marginTop:'1rem' }}>
              <span>Total: <strong>{cubes.length}</strong></span>
              <span>Passed: <strong style={{ color:'var(--success)' }}>{passedCubes}</strong></span>
              <span>Failed: <strong style={{ color:'var(--danger)' }}>{failedCubes}</strong></span>
              <span>Pending: <strong style={{ color:'var(--warning)' }}>{cubes.filter(c => c.result === 'Pending').length}</strong></span>
            </div>
          </div>
        </>
      )}
    </>
  );
}
