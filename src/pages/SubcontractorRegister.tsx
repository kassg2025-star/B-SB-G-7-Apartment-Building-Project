import { useState, useId } from 'react';
import PageHeader from '../components/PageHeader';
import ExcelImport from '../components/ExcelImport';
import { useProject } from '../store/projectStore';
import { formatETB } from '../data/projectData';
import { exportCsv, exportXlsx, printTable } from '../utils/exportUtils';

type SubStatus = 'Active' | 'Mobilising' | 'Completed' | 'Terminated' | 'On Hold';

export interface Subcontractor {
  id: string;
  name: string;
  scope: string;
  category: string;
  contractValue: number;
  paidToDate: number;
  retentionPct: number;
  startDate: string;
  endDate: string;
  status: SubStatus;
  contactName: string;
  contactPhone: string;
  tinNo: string;
  performanceRating: 1|2|3|4|5;
  notes: string;
}

const SEED_SUBS: Subcontractor[] = [
  { id:'SC-001', name:'Tsehay Rock Drilling & Chiseling', scope:'Manual rock chiseling sub-contract — basaltic strata below -4.8m', category:'Specialist Excavation', contractValue:280_000, paidToDate:140_000, retentionPct:5, startDate:'2026-03-10', endDate:'2026-08-01', status:'Active', contactName:'Ato Tsehay Bekele', contactPhone:'+251911234567', tinNo:'TIN0078901', performanceRating:4, notes:'Mobilised following primary excavator breakdown. Working 2 shifts.' },
  { id:'SC-002', name:'Addis Dewatering Services PLC', scope:'24/7 dewatering — 3 pump units, maintenance & operators', category:'Dewatering', contractValue:95_000, paidToDate:47_500, retentionPct:5, startDate:'2026-05-20', endDate:'2026-09-01', status:'Active', contactName:'Eng. Mulugeta Haile', contactPhone:'+251922345678', tinNo:'TIN0078902', performanceRating:5, notes:'Deployed post pit-face collapse 20/05/2026. Running 24/7.' },
  { id:'SC-003', name:'Kefyalew Soil Nailing Works', scope:'Engineered soil nailing — deep excavation perimeter stabilisation', category:'Geotechnical', contractValue:180_000, paidToDate:90_000, retentionPct:10, startDate:'2026-04-01', endDate:'2026-07-01', status:'Active', contactName:'Eng. Kefyalew Alemu', contactPhone:'+251933456789', tinNo:'TIN0078903', performanceRating:4, notes:'Replacing standard perimeter shoring per RE instruction.' },
];

const todayStr = () => new Date().toISOString().substring(0,10);

export default function SubcontractorRegister() {
  const project = useProject();
  const uid = useId();
  const [subs, setSubs] = useState<Subcontractor[]>(SEED_SUBS);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const blank = (): Subcontractor => ({ id:`SC-${String(subs.length+1).padStart(3,'0')}`, name:'', scope:'', category:'', contractValue:0, paidToDate:0, retentionPct:5, startDate:todayStr(), endDate:'', status:'Mobilising', contactName:'', contactPhone:'', tinNo:'', performanceRating:3, notes:'' });
  const [form, setForm] = useState<Subcontractor>(blank);
  const f = (k: keyof Subcontractor, v: string|number) => setForm(p=>({...p,[k]:v}));

  const save = () => {
    if (editId) setSubs(p=>p.map(s=>s.id===editId?form:s));
    else setSubs(p=>[...p,form]);
    setShowForm(false);
  };
  const del = (id: string) => setSubs(p=>p.filter(s=>s.id!==id));

  const totalContracted = subs.reduce((s,x)=>s+x.contractValue,0);
  const totalPaid       = subs.reduce((s,x)=>s+x.paidToDate,0);
  const totalRetention  = subs.reduce((s,x)=>s+x.contractValue*(x.retentionPct/100),0);
  const active          = subs.filter(s=>s.status==='Active').length;

  const statusColor = (s: SubStatus) =>({ Active:'var(--success)', Mobilising:'var(--warning)', Completed:'var(--muted)', Terminated:'var(--danger)', 'On Hold':'var(--accent)' }[s]);
  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5-n);

  const headers = ['ID','Name','Category','Scope','Contract (ETB)','Paid (ETB)','Retention %','Start','End','Status','Rating','Contact'];
  const rows = subs.map(s=>[s.id,s.name,s.category,s.scope.substring(0,50),s.contractValue,s.paidToDate,`${s.retentionPct}%`,s.startDate,s.endDate,s.status,`${s.performanceRating}/5`,s.contactName]);

  return (
    <>
      <PageHeader title="Subcontractor Register" subtitle={`${subs.length} subcontractors · Total contracted: ${formatETB(totalContracted)} ETB`} />
      <div className="grid grid-4" style={{marginBottom:'1.25rem'}}>
        <div className="card kpi-accent"><div className="card-label">Total Contracted</div><div className="card-value sm">{formatETB(totalContracted)}</div></div>
        <div className="card kpi-success"><div className="card-label">Total Paid</div><div className="card-value sm">{formatETB(totalPaid)}</div><div className="card-sub">{totalContracted>0?((totalPaid/totalContracted)*100).toFixed(1):0}% of contracted</div></div>
        <div className="card kpi-warning"><div className="card-label">Retention Held</div><div className="card-value sm">{formatETB(totalRetention)}</div></div>
        <div className="card"><div className="card-label">Active</div><div className="card-value">{active}</div><div className="card-sub">of {subs.length} total</div></div>
      </div>
      <div className="sched-toolbar" style={{marginBottom:'1rem'}}>
        <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
          <button type="button" className="btn btn-secondary" onClick={()=>exportCsv(headers,rows,'KAS-Subcontractors.csv')}>⬇ CSV</button>
          <button type="button" className="btn btn-secondary" onClick={()=>exportXlsx(headers,rows,'Subcontractors','KAS-Subcontractors.xlsx')}>⬇ Excel</button>
          <button type="button" className="btn btn-secondary" onClick={()=>printTable('Subcontractor Register','',headers,rows,project.contractor)}>🖨 Print</button>
        </div>
        <button type="button" className="btn btn-primary" onClick={()=>{setForm(blank());setEditId(null);setShowForm(true);}}>+ Add Subcontractor</button>
      </div>
      <ExcelImport moduleId="subcontractors" label="Import Subcontractors (Excel / CSV)"
        templateColumns={['Name','Category','Scope','ContractValue','PaidToDate','RetentionPct','StartDate','EndDate','ContactName','ContactPhone','TINNo']}
        templateRows={[['ABC Construction','Formwork','Slab formwork supply and fix','120000','0','5','2026-07-01','2026-10-01','Ato ABC','0911000000','TIN001']]}
        onImport={(records)=>{
          const imported:Subcontractor[]=records.filter(r=>r['Name']).map((r,i)=>({
            id:`SC-${String(subs.length+i+1).padStart(3,'0')}`,name:r['Name']??'',scope:r['Scope']??'',category:r['Category']??'',
            contractValue:parseFloat(r['ContractValue']??'0')||0,paidToDate:parseFloat(r['PaidToDate']??'0')||0,
            retentionPct:parseFloat(r['RetentionPct']??'5')||5,startDate:r['StartDate']??todayStr(),endDate:r['EndDate']??'',
            status:'Mobilising' as SubStatus,contactName:r['ContactName']??'',contactPhone:r['ContactPhone']??'',
            tinNo:r['TINNo']??'',performanceRating:3 as Subcontractor['performanceRating'],notes:'',
          }));
          setSubs(p=>[...p,...imported]);
        }} />
      {showForm && (
        <div className="card" style={{marginBottom:'1.25rem',borderColor:'var(--accent)'}}>
          <div className="section-title">{editId?`Edit ${editId}`:'New Subcontractor'}</div>
          <div className="rr-form-grid" style={{marginTop:'0.75rem'}}>
            {([['ID','id'],['Name','name'],['Category','category'],['Contact Name','contactName'],['Contact Phone','contactPhone'],['TIN No.','tinNo']] as [string,keyof Subcontractor][]).map(([label,k])=>(
              <label key={k} style={{display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
                {label}<input className="status-select" style={{width:'100%'}} value={String(form[k])} onChange={e=>f(k,e.target.value)} />
              </label>
            ))}
            {([['Contract Value (ETB)','contractValue'],['Paid To Date (ETB)','paidToDate'],['Retention %','retentionPct']] as [string,keyof Subcontractor][]).map(([label,k])=>(
              <label key={k} style={{display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
                {label}<input type="number" className="status-select" style={{width:'100%'}} value={Number(form[k])} onChange={e=>f(k,parseFloat(e.target.value)||0)} />
              </label>
            ))}
            <label style={{display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
              Start Date<input type="date" className="status-select" style={{width:'100%'}} value={form.startDate} onChange={e=>f('startDate',e.target.value)} />
            </label>
            <label style={{display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
              End Date<input type="date" className="status-select" style={{width:'100%'}} value={form.endDate} onChange={e=>f('endDate',e.target.value)} />
            </label>
            <label style={{display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
              Status<select className="status-select" style={{width:'100%'}} value={form.status} onChange={e=>f('status',e.target.value)}>
                {(['Active','Mobilising','Completed','Terminated','On Hold'] as SubStatus[]).map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label style={{display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
              Performance (1–5)<select className="status-select" style={{width:'100%'}} value={form.performanceRating} onChange={e=>f('performanceRating',parseInt(e.target.value) as 1|2|3|4|5)}>
                {[1,2,3,4,5].map(n=><option key={n} value={n}>{n} — {'★'.repeat(n)}</option>)}
              </select>
            </label>
          </div>
          <label htmlFor={`${uid}-scope`} style={{display:'block',marginTop:'0.65rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
            Scope of Work<textarea id={`${uid}-scope`} className="rr-textarea" rows={2} style={{marginTop:'0.3rem'}} value={form.scope} onChange={e=>f('scope',e.target.value)} />
          </label>
          <label htmlFor={`${uid}-notes`} style={{display:'block',marginTop:'0.65rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
            Notes<textarea id={`${uid}-notes`} className="rr-textarea" rows={2} style={{marginTop:'0.3rem'}} value={form.notes} onChange={e=>f('notes',e.target.value)} />
          </label>
          <div style={{display:'flex',gap:'0.75rem',marginTop:'1rem'}}>
            <button type="button" className="btn btn-primary" onClick={save}>Save</button>
            <button type="button" className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div className="card">
        <div className="section-title">Subcontractor Register ({subs.length})</div>
        <div style={{overflowX:'auto'}}>
          <table className="data-table" style={{fontSize:'0.78rem'}}>
            <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Scope</th><th>Contract (ETB)</th><th>Paid (ETB)</th><th>Balance</th><th>Ret.%</th><th>Start</th><th>End</th><th>Status</th><th>Rating</th><th>Contact</th><th></th></tr></thead>
            <tbody>
              {subs.map(s=>(
                <tr key={s.id}>
                  <td><strong>{s.id}</strong></td>
                  <td style={{fontWeight:600}}>{s.name}</td>
                  <td><span className="tag">{s.category}</span></td>
                  <td style={{fontSize:'0.72rem',maxWidth:200,color:'var(--muted)'}}>{s.scope.substring(0,60)}{s.scope.length>60?'…':''}</td>
                  <td>{formatETB(s.contractValue)}</td>
                  <td style={{color:'var(--success)'}}>{formatETB(s.paidToDate)}</td>
                  <td style={{color:s.contractValue-s.paidToDate<0?'var(--danger)':'inherit'}}>{formatETB(s.contractValue-s.paidToDate)}</td>
                  <td>{s.retentionPct}%</td>
                  <td style={{fontSize:'0.72rem'}}>{s.startDate}</td>
                  <td style={{fontSize:'0.72rem'}}>{s.endDate||'—'}</td>
                  <td><span className="badge" style={{background:`${statusColor(s.status)}22`,color:statusColor(s.status)}}>{s.status}</span></td>
                  <td style={{color:'var(--accent)',fontSize:'0.75rem'}}>{stars(s.performanceRating)}</td>
                  <td style={{fontSize:'0.72rem',color:'var(--muted)'}}>{s.contactName}<br/>{s.contactPhone}</td>
                  <td>
                    <button type="button" className="btn-ghost" style={{fontSize:'0.7rem',padding:'0.15rem 0.4rem'}} onClick={()=>{setForm(s);setEditId(s.id);setShowForm(true);}}>✎</button>
                    <button type="button" className="btn-ghost" style={{fontSize:'0.7rem',padding:'0.15rem 0.4rem',marginLeft:3}} onClick={()=>del(s.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
