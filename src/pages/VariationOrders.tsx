import { useState, useId } from 'react';
import PageHeader from '../components/PageHeader';
import ExcelImport from '../components/ExcelImport';
import { useProject } from '../store/projectStore';
import { formatETB } from '../data/projectData';
import { exportCsv, exportXlsx, printTable } from '../utils/exportUtils';

type VOStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Implemented';
type VOType   = 'Addition' | 'Omission' | 'Substitution' | 'Provisional Sum' | 'Daywork';

export interface VariationOrder {
  id: string;
  voRef: string;
  date: string;
  type: VOType;
  title: string;
  description: string;
  initiatedBy: 'Employer' | 'Consultant' | 'Contractor';
  costImpact: number;     // ETB — positive = addition, negative = omission
  timeImpact: number;     // calendar days
  status: VOStatus;
  submittedDate: string;
  approvedDate: string;
  approvedBy: string;
  linkedSI: string;       // e.g. SI-012
  remarks: string;
}

const SEED_VOS: VariationOrder[] = [
  { id:'VO-001', voRef:'KAS/AA/YK/2026/002/VO/001', date:'2026-04-20', type:'Omission', title:'Halt concurrent column/shear wall works — SI-012', description:'Consultant instruction SI-012 to cease concurrent column and shear wall works during substructure phase, resulting in rescheduling and additional stand-by costs.', initiatedBy:'Consultant', costImpact:185_000, timeImpact:7, status:'Submitted', submittedDate:'2026-05-01', approvedDate:'', approvedBy:'', linkedSI:'SI-012', remarks:'Time cost claim attached to EOT-001' },
  { id:'VO-002', voRef:'KAS/AA/YK/2026/002/VO/002', date:'2026-02-20', type:'Addition', title:'Rock chiseling sub-contract — unforeseen basaltic strata', description:'Engagement of specialist manual chisel sub-contract crew due to unanticipated ultra-hard basaltic rock strata below -4.8m BGL. Not included in original BOQ.', initiatedBy:'Contractor', costImpact:420_000, timeImpact:22, status:'Under Review', submittedDate:'2026-03-01', approvedDate:'', approvedBy:'', linkedSI:'', remarks:'Supporting site diary and machine logs attached' },
  { id:'VO-003', voRef:'KAS/AA/YK/2026/002/VO/003', date:'2026-05-20', type:'Addition', title:'Emergency shoring post pit-face collapse', description:'Emergency structural shoring and additional soil nailing deployed following pit-face collapse on 20/05/2026. Night watchmen deployed for 14 days.', initiatedBy:'Contractor', costImpact:95_000, timeImpact:10, status:'Draft', submittedDate:'', approvedDate:'', approvedBy:'', linkedSI:'', remarks:'HSE incident INC-001 related' },
];

const todayStr = () => new Date().toISOString().substring(0, 10);

export default function VariationOrders() {
  const project = useProject();
  const uid = useId();
  const [vos, setVos] = useState<VariationOrder[]>(SEED_VOS);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<VariationOrder>(() => blank());

  function blank(): VariationOrder {
    return { id:`VO-${String(vos.length+1).padStart(3,'0')}`, voRef:`${project.contractId}/VO/${String(vos.length+1).padStart(3,'0')}`, date:todayStr(), type:'Addition', title:'', description:'', initiatedBy:'Contractor', costImpact:0, timeImpact:0, status:'Draft', submittedDate:'', approvedDate:'', approvedBy:'', linkedSI:'', remarks:'' };
  }

  const f = (k: keyof VariationOrder, v: string | number) => setForm(p => ({ ...p, [k]: v }));
  const openAdd  = () => { setForm(blank()); setEditId(null); setShowForm(true); };
  const openEdit = (vo: VariationOrder) => { setForm({...vo}); setEditId(vo.id); setShowForm(true); };
  const deleteVO = (id: string) => setVos(p => p.filter(v => v.id !== id));
  const save = () => {
    if (editId) setVos(p => p.map(v => v.id === editId ? form : v));
    else setVos(p => [...p, form]);
    setShowForm(false);
  };
  const approve = (id: string) => setVos(p => p.map(v => v.id === id ? { ...v, status:'Approved', approvedDate: todayStr(), approvedBy: project.projectManager } : v));

  const totalAdditions = vos.filter(v => v.costImpact > 0 && v.status === 'Approved').reduce((s,v) => s + v.costImpact, 0);
  const totalOmissions = vos.filter(v => v.costImpact < 0 && v.status === 'Approved').reduce((s,v) => s + v.costImpact, 0);
  const totalTimeApproved = vos.filter(v => v.status === 'Approved').reduce((s,v) => s + v.timeImpact, 0);
  const pendingCount = vos.filter(v => v.status === 'Submitted' || v.status === 'Under Review' || v.status === 'Draft').length;
  const adjustedContractValue = project.financial.originalContractValue + totalAdditions + totalOmissions;

  const statusColor = (s: VOStatus) => ({ Draft:'var(--muted)', Submitted:'var(--warning)', 'Under Review':'var(--accent)', Approved:'var(--success)', Rejected:'var(--danger)', Implemented:'var(--success)' }[s] ?? 'var(--muted)');

  const headers = ['VO Ref','Date','Type','Title','Initiated By','Cost Impact (ETB)','Time Impact (days)','Status','Approved By'];
  const tableRows = vos.map(v => [v.voRef, v.date, v.type, v.title, v.initiatedBy, v.costImpact, v.timeImpact, v.status, v.approvedBy || '—']);

  return (
    <>
      <PageHeader title="Variation Orders" subtitle={`Contract adjustments · ${vos.length} VOs · Adjusted value: ${formatETB(adjustedContractValue)} ETB`} />

      <div className="grid grid-4" style={{ marginBottom:'1.25rem' }}>
        <div className="card kpi-accent">
          <div className="card-label">Original Contract</div>
          <div className="card-value sm">{formatETB(project.financial.originalContractValue)}</div>
        </div>
        <div className="card kpi-success">
          <div className="card-label">Approved Additions</div>
          <div className="card-value sm">{formatETB(totalAdditions)}</div>
        </div>
        <div className="card kpi-danger">
          <div className="card-label">Approved Omissions</div>
          <div className="card-value sm">{formatETB(Math.abs(totalOmissions))}</div>
        </div>
        <div className="card kpi-warning">
          <div className="card-label">Pending VOs</div>
          <div className="card-value">{pendingCount}</div>
          <div className="card-sub">Time exposure: +{vos.filter(v=>v.status!=='Approved').reduce((s,v)=>s+v.timeImpact,0)} days</div>
        </div>
      </div>

      <div className="exec-strip" style={{ marginBottom:'1.25rem' }}>
        <span>Adjusted Contract: <strong>{formatETB(adjustedContractValue)} ETB</strong></span>
        <span>Approved time: <strong>+{totalTimeApproved} days</strong></span>
        <span>VOs: <strong>{vos.length}</strong> ({vos.filter(v=>v.status==='Approved').length} approved)</span>
      </div>

      <div className="sched-toolbar" style={{ marginBottom:'1rem' }}>
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={() => exportCsv(headers, tableRows, 'KAS-Variation-Orders.csv')}>⬇ CSV</button>
          <button type="button" className="btn btn-secondary" onClick={() => exportXlsx(headers, tableRows, 'Variation Orders', 'KAS-Variation-Orders.xlsx')}>⬇ Excel</button>
          <button type="button" className="btn btn-secondary" onClick={() => printTable('Variation Orders', project.contractId, headers, tableRows, project.contractor)}>🖨 Print</button>
        </div>
        <button type="button" className="btn btn-primary" onClick={openAdd}>+ New VO</button>
      </div>

      <ExcelImport moduleId="vos" label="Import Variation Orders (Excel / CSV)"
        templateColumns={['VORef','Date','Type','Title','Description','InitiatedBy','CostImpact','TimeImpact','Status','LinkedSI']}
        templateRows={[['KAS/VO/004','2026-06-01','Addition','Additional drainage works','Extra drainage required','Consultant','50000','3','Submitted','']]}
        onImport={(records) => {
          const imported: VariationOrder[] = records.filter(r=>r['Title']).map((r,i) => ({
            id:`VO-${String(vos.length+i+1).padStart(3,'0')}`, voRef:r['VORef']??'', date:r['Date']??todayStr(),
            type:(r['Type']??'Addition') as VOType, title:r['Title']??'', description:r['Description']??'',
            initiatedBy:(r['InitiatedBy']??'Contractor') as VariationOrder['initiatedBy'],
            costImpact:parseFloat(r['CostImpact']??'0')||0, timeImpact:parseInt(r['TimeImpact']??'0')||0,
            status:(r['Status']??'Draft') as VOStatus, submittedDate:'', approvedDate:'', approvedBy:'',
            linkedSI:r['LinkedSI']??'', remarks:'',
          }));
          setVos(p=>[...p,...imported]);
        }} />

      {showForm && (
        <div className="card" style={{ marginBottom:'1.25rem', borderColor:'var(--accent)' }}>
          <div className="section-title">{editId ? `Edit ${editId}` : 'New Variation Order'}</div>
          <div className="rr-form-grid" style={{ marginTop:'0.75rem' }}>
            {([['VO Ref.','voRef'],['Date','date'],['Linked SI','linkedSI']] as [string,keyof VariationOrder][]).map(([label,k]) => (
              <label key={k} style={{ display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase' }}>
                {label}<input className="status-select" style={{width:'100%'}} value={String(form[k])} onChange={e=>f(k,e.target.value)} />
              </label>
            ))}
            <label style={{ display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase' }}>
              Type<select className="status-select" style={{width:'100%'}} value={form.type} onChange={e=>f('type',e.target.value)}>
                {(['Addition','Omission','Substitution','Provisional Sum','Daywork'] as VOType[]).map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label style={{ display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase' }}>
              Initiated By<select className="status-select" style={{width:'100%'}} value={form.initiatedBy} onChange={e=>f('initiatedBy',e.target.value)}>
                {['Employer','Consultant','Contractor'].map(x=><option key={x} value={x}>{x}</option>)}
              </select>
            </label>
            <label style={{ display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase' }}>
              Cost Impact (ETB)<input type="number" className="status-select" style={{width:'100%'}} value={form.costImpact} onChange={e=>f('costImpact',parseFloat(e.target.value)||0)} />
            </label>
            <label style={{ display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase' }}>
              Time Impact (days)<input type="number" className="status-select" style={{width:'100%'}} value={form.timeImpact} onChange={e=>f('timeImpact',parseInt(e.target.value)||0)} />
            </label>
            <label style={{ display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase' }}>
              Status<select className="status-select" style={{width:'100%'}} value={form.status} onChange={e=>f('status',e.target.value)}>
                {(['Draft','Submitted','Under Review','Approved','Rejected','Implemented'] as VOStatus[]).map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <label htmlFor={`${uid}-title`} style={{display:'block',marginTop:'0.65rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
            Title<input id={`${uid}-title`} className="status-select" style={{width:'100%',marginTop:'0.3rem'}} value={form.title} onChange={e=>f('title',e.target.value)} />
          </label>
          <label htmlFor={`${uid}-desc`} style={{display:'block',marginTop:'0.65rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
            Description<textarea id={`${uid}-desc`} className="rr-textarea" rows={3} style={{marginTop:'0.3rem'}} value={form.description} onChange={e=>f('description',e.target.value)} />
          </label>
          <div style={{display:'flex',gap:'0.75rem',marginTop:'1rem'}}>
            <button type="button" className="btn btn-primary" onClick={save}>Save</button>
            <button type="button" className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="section-title">Variation Order Register ({vos.length})</div>
        <div style={{display:'flex',flexDirection:'column',gap:'0.75rem',marginTop:'0.75rem'}}>
          {vos.map(vo => (
            <div key={vo.id} className="roadblock-item" style={{borderLeftColor:statusColor(vo.status)}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:'0.5rem'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:'0.5rem',alignItems:'center',flexWrap:'wrap',marginBottom:'0.3rem'}}>
                    <strong style={{fontSize:'0.85rem'}}>{vo.id}</strong>
                    <span className="tag">{vo.type}</span>
                    <span className="tag">{vo.initiatedBy}</span>
                    <span className="badge" style={{background:`${statusColor(vo.status)}22`,color:statusColor(vo.status)}}>{vo.status}</span>
                    <span style={{fontSize:'0.72rem',color:'var(--muted)'}}>{vo.date}</span>
                    {vo.linkedSI && <span className="tag">Ref: {vo.linkedSI}</span>}
                  </div>
                  <div style={{fontWeight:600,fontSize:'0.85rem',marginBottom:'0.25rem'}}>{vo.title}</div>
                  <div style={{fontSize:'0.78rem',color:'var(--muted)',marginBottom:'0.25rem'}}>{vo.description}</div>
                  <div style={{display:'flex',gap:'1rem',fontSize:'0.78rem',flexWrap:'wrap'}}>
                    <span style={{color:vo.costImpact>=0?'var(--success)':'var(--danger)',fontWeight:600}}>
                      {vo.costImpact>=0?'+':''}{formatETB(vo.costImpact)} ETB
                    </span>
                    <span style={{color:'var(--warning)',fontWeight:600}}>+{vo.timeImpact} days</span>
                    {vo.approvedBy && <span style={{color:'var(--success)'}}>✔ {vo.approvedBy} · {vo.approvedDate}</span>}
                  </div>
                </div>
                <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap',flexShrink:0}}>
                  {vo.status==='Submitted'||vo.status==='Under Review' ? <button type="button" className="btn btn-primary" style={{fontSize:'0.72rem',padding:'0.3rem 0.7rem'}} onClick={()=>approve(vo.id)}>✔ Approve</button> : null}
                  <button type="button" className="btn-ghost" style={{fontSize:'0.7rem',padding:'0.2rem 0.5rem'}} onClick={()=>openEdit(vo)}>✎</button>
                  <button type="button" className="btn-ghost" style={{fontSize:'0.7rem',padding:'0.2rem 0.5rem'}} onClick={()=>deleteVO(vo.id)}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
