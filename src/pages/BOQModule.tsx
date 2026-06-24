import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import ExcelImport from '../components/ExcelImport';
import { useProject } from '../store/projectStore';
import { formatETB } from '../data/projectData';
import { exportCsv, exportXlsx, printTable } from '../utils/exportUtils';

export interface BOQItem {
  id: string;
  section: string;
  itemNo: string;
  description: string;
  unit: string;
  billQty: number;
  unitRate: number;
  billAmount: number;
  executedQty: number;
  executedAmount: number;
  percentComplete: number;
  remarks: string;
}

const SEED_BOQ: BOQItem[] = [
  { id:'B001', section:'A - Site Preparation', itemNo:'A.01', description:'Site clearing and grubbing', unit:'m²', billQty:450, unitRate:85, billAmount:38250, executedQty:450, executedAmount:38250, percentComplete:100, remarks:'Complete' },
  { id:'B002', section:'A - Site Preparation', itemNo:'A.02', description:'Topsoil stripping and removal', unit:'m³', billQty:135, unitRate:120, billAmount:16200, executedQty:135, executedAmount:16200, percentComplete:100, remarks:'Complete' },
  { id:'B003', section:'B - Earthworks', itemNo:'B.01', description:'Bulk excavation in ordinary soil', unit:'m³', billQty:680, unitRate:280, billAmount:190400, executedQty:648, executedAmount:181440, percentComplete:95, remarks:'Final 32m³ pending' },
  { id:'B004', section:'B - Earthworks', itemNo:'B.02', description:'Rock excavation by chiseling — basaltic strata', unit:'m³', billQty:350, unitRate:1850, billAmount:647500, executedQty:210, executedAmount:388500, percentComplete:60, remarks:'DE-001 active — unforeseen rock depth' },
  { id:'B005', section:'B - Earthworks', itemNo:'B.03', description:'Rock spoil carting and disposal', unit:'trip', billQty:null as unknown as number, unitRate:3200, billAmount:0, executedQty:15, executedAmount:48000, percentComplete:0, remarks:'Daywork — no bill qty' },
  { id:'B006', section:'C - Substructure', itemNo:'C.01', description:'PCC blinding C15 — 100mm thick', unit:'m²', billQty:53, unitRate:850, billAmount:45050, executedQty:24, executedAmount:20400, percentComplete:45, remarks:'' },
  { id:'B007', section:'C - Substructure', itemNo:'C.02', description:'Reinforced concrete C25 — foundations', unit:'m³', billQty:64, unitRate:8500, billAmount:544000, executedQty:29.65, executedAmount:252025, percentComplete:46, remarks:'F-1 complete. F-2/F-3 pending NCR-005 closure' },
  { id:'B008', section:'C - Substructure', itemNo:'C.03', description:'Reinforcement steel — Ø8–Ø14mm', unit:'kg', billQty:3500, unitRate:75, billAmount:262500, executedQty:1200, executedAmount:90000, percentComplete:34, remarks:'Ø20mm frozen per NCR-005' },
  { id:'B009', section:'C - Substructure', itemNo:'C.04', description:'Reinforcement steel — Ø20mm', unit:'kg', billQty:2048, unitRate:78, billAmount:159744, executedQty:0, executedAmount:0, percentComplete:0, remarks:'BLOCKED — NCR-005 quarantine' },
  { id:'B010', section:'C - Substructure', itemNo:'C.05', description:'Formwork to foundations', unit:'m²', billQty:102, unitRate:680, billAmount:69360, executedQty:34, executedAmount:23120, percentComplete:33, remarks:'' },
  { id:'B011', section:'C - Substructure', itemNo:'C.06', description:'Soil nailing — engineered deep pit stabilisation', unit:'LS', billQty:1, unitRate:180000, billAmount:180000, executedQty:1, executedAmount:180000, percentComplete:100, remarks:'VO-001 addition' },
  { id:'B012', section:'D - Superstructure', itemNo:'D.01', description:'RC columns C30 — ground to 7th floor', unit:'m³', billQty:485, unitRate:9200, billAmount:4462000, executedQty:0, executedAmount:0, percentComplete:0, remarks:'Not started — SI-012 hold' },
];

export default function BOQModule() {
  const project = useProject();
  const [items, setItems] = useState<BOQItem[]>(SEED_BOQ);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [filterSection, setFilterSection] = useState('All');

  const blank = (): BOQItem => ({
    id:`B${String(items.length+1).padStart(3,'0')}`, section:'', itemNo:'', description:'',
    unit:'', billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:'',
  });
  const [form, setForm] = useState<BOQItem>(blank);
  const f = (k: keyof BOQItem, v: string|number) => {
    setForm(prev => {
      const updated = { ...prev, [k]: v };
      if (k === 'billQty' || k === 'unitRate') updated.billAmount = (updated.billQty||0) * (updated.unitRate||0);
      if (k === 'executedQty' || k === 'unitRate') {
        updated.executedAmount = (updated.executedQty||0) * (updated.unitRate||0);
        updated.percentComplete = updated.billQty > 0 ? Math.round((updated.executedQty/updated.billQty)*100) : 0;
      }
      return updated;
    });
  };

  const save = () => {
    if (editId) setItems(p=>p.map(i=>i.id===editId?form:i));
    else setItems(p=>[...p,form]);
    setShowForm(false);
  };

  const sections = ['All', ...Array.from(new Set(items.map(i=>i.section)))];
  const filtered = filterSection === 'All' ? items : items.filter(i=>i.section===filterSection);

  const totalBill     = items.reduce((s,i)=>s+i.billAmount,0);
  const totalExecuted = items.reduce((s,i)=>s+i.executedAmount,0);
  const overallPct    = totalBill > 0 ? (totalExecuted/totalBill)*100 : 0;
  const blocked       = items.filter(i=>i.percentComplete===0 && i.billQty>0).length;

  const headers = ['Item No.','Section','Description','Unit','Bill Qty','Unit Rate (ETB)','Bill Amount (ETB)','Executed Qty','Executed Amount (ETB)','% Complete','Remarks'];
  const rows = filtered.map(i=>[i.itemNo,i.section,i.description,i.unit,i.billQty,i.unitRate,i.billAmount,i.executedQty,i.executedAmount,`${i.percentComplete}%`,i.remarks]);

  return (
    <>
      <PageHeader title="Bill of Quantities (BOQ)" subtitle={`${items.length} items · ${formatETB(totalBill)} ETB total bill · ${overallPct.toFixed(1)}% executed`} />
      <div className="grid grid-4" style={{marginBottom:'1.25rem'}}>
        <div className="card kpi-accent"><div className="card-label">Total Bill Value</div><div className="card-value sm">{formatETB(totalBill)}</div></div>
        <div className="card kpi-success"><div className="card-label">Executed Value</div><div className="card-value sm">{formatETB(totalExecuted)}</div><div className="card-sub">{overallPct.toFixed(1)}% of BOQ</div></div>
        <div className="card kpi-warning"><div className="card-label">Remaining</div><div className="card-value sm">{formatETB(totalBill-totalExecuted)}</div></div>
        <div className="card kpi-danger"><div className="card-label">Blocked Items</div><div className="card-value">{blocked}</div><div className="card-sub">0% progress</div></div>
      </div>

      <div className="sched-toolbar" style={{marginBottom:'1rem'}}>
        <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',alignItems:'center'}}>
          <select className="status-select" value={filterSection} onChange={e=>setFilterSection(e.target.value)}>
            {sections.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <button type="button" className="btn btn-secondary" onClick={()=>exportCsv(headers,rows,'KAS-BOQ.csv')}>⬇ CSV</button>
          <button type="button" className="btn btn-secondary" onClick={()=>exportXlsx(headers,rows,'BOQ','KAS-BOQ.xlsx')}>⬇ Excel</button>
          <button type="button" className="btn btn-secondary" onClick={()=>printTable('Bill of Quantities',project.contractId,headers,rows,project.contractor)}>🖨 Print</button>
        </div>
        <button type="button" className="btn btn-primary" onClick={()=>{setForm(blank());setEditId(null);setShowForm(true);}}>+ Add Item</button>
      </div>

      <ExcelImport moduleId="boq" label="Import BOQ Items (Excel / CSV)"
        templateColumns={['ItemNo','Section','Description','Unit','BillQty','UnitRate','ExecutedQty','Remarks']}
        templateRows={[['D.02','D - Superstructure','RC beams C30','m³','320','9000','0','']]}
        onImport={(records)=>{
          const imported:BOQItem[]=records.filter(r=>r['Description']).map((r,i)=>{
            const bq=parseFloat(r['BillQty']??'0')||0, ur=parseFloat(r['UnitRate']??'0')||0;
            const eq=parseFloat(r['ExecutedQty']??'0')||0;
            return { id:`B${String(items.length+i+1).padStart(3,'0')}`, section:r['Section']??'', itemNo:r['ItemNo']??'',
              description:r['Description']??'', unit:r['Unit']??'', billQty:bq, unitRate:ur,
              billAmount:bq*ur, executedQty:eq, executedAmount:eq*ur,
              percentComplete:bq>0?Math.round((eq/bq)*100):0, remarks:r['Remarks']??'' };
          });
          setItems(p=>[...p,...imported]);
        }} />

      {showForm && (
        <div className="card" style={{marginBottom:'1.25rem',borderColor:'var(--accent)'}}>
          <div className="section-title">{editId?`Edit ${editId}`:'Add BOQ Item'}</div>
          <div className="rr-form-grid" style={{marginTop:'0.75rem'}}>
            {([['Item No.','itemNo'],['Section','section'],['Unit','unit']] as [string,keyof BOQItem][]).map(([label,k])=>(
              <label key={k} style={{display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
                {label}<input className="status-select" style={{width:'100%'}} value={String(form[k])} onChange={e=>f(k,e.target.value)} />
              </label>
            ))}
            {([['Bill Qty','billQty'],['Unit Rate (ETB)','unitRate'],['Executed Qty','executedQty']] as [string,keyof BOQItem][]).map(([label,k])=>(
              <label key={k} style={{display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
                {label}<input type="number" className="status-select" style={{width:'100%'}} value={Number(form[k])} onChange={e=>f(k,parseFloat(e.target.value)||0)} />
              </label>
            ))}
          </div>
          <label style={{display:'block',marginTop:'0.65rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
            Description<input className="status-select" style={{width:'100%',marginTop:'0.3rem'}} value={form.description} onChange={e=>f('description',e.target.value)} />
          </label>
          <label style={{display:'block',marginTop:'0.5rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
            Remarks<input className="status-select" style={{width:'100%',marginTop:'0.3rem'}} value={form.remarks} onChange={e=>f('remarks',e.target.value)} />
          </label>
          <div style={{fontSize:'0.78rem',color:'var(--muted)',marginTop:'0.75rem'}}>
            Bill Amount: <strong>{formatETB(form.billAmount)} ETB</strong> · Executed: <strong>{formatETB(form.executedAmount)} ETB</strong> · Complete: <strong>{form.percentComplete}%</strong>
          </div>
          <div style={{display:'flex',gap:'0.75rem',marginTop:'1rem'}}>
            <button type="button" className="btn btn-primary" onClick={save}>Save</button>
            <button type="button" className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="section-title">BOQ — {filterSection} ({filtered.length} items)</div>
        <div style={{overflowX:'auto'}}>
          <table className="data-table" style={{fontSize:'0.75rem'}}>
            <thead><tr><th>Item</th><th>Description</th><th>Unit</th><th>Bill Qty</th><th>Rate (ETB)</th><th>Bill Amount</th><th>Exec. Qty</th><th>Exec. Amount</th><th>% Done</th><th>Remarks</th><th></th></tr></thead>
            <tbody>
              {filtered.map((i,idx)=>{
                const isSection = idx===0||filtered[idx-1].section!==i.section;
                return <>
                  {isSection&&<tr key={`sec-${i.section}`} style={{background:'var(--surface-2)'}}><td colSpan={11} style={{fontWeight:700,color:'var(--accent)',padding:'0.5rem 0.85rem',fontSize:'0.8rem'}}>{i.section}</td></tr>}
                  <tr key={i.id}>
                    <td style={{fontWeight:600,color:'var(--accent)'}}>{i.itemNo}</td>
                    <td style={{maxWidth:240}}>{i.description}</td>
                    <td>{i.unit}</td>
                    <td>{i.billQty||'—'}</td>
                    <td>{formatETB(i.unitRate)}</td>
                    <td style={{fontWeight:600}}>{formatETB(i.billAmount)}</td>
                    <td style={{color:i.executedQty>0?'var(--success)':'var(--muted)'}}>{i.executedQty}</td>
                    <td style={{color:i.executedQty>0?'var(--success)':'var(--muted)'}}>{formatETB(i.executedAmount)}</td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}>
                        <div style={{flex:1,height:6,background:'var(--surface-3)',borderRadius:3,minWidth:50}}>
                          <div style={{height:'100%',borderRadius:3,background:i.percentComplete===100?'var(--success)':i.percentComplete===0?'var(--danger)':'var(--accent)',width:`${i.percentComplete}%`}} />
                        </div>
                        <span style={{fontSize:'0.7rem',minWidth:28,color:i.percentComplete===0?'var(--danger)':'inherit'}}>{i.percentComplete}%</span>
                      </div>
                    </td>
                    <td style={{fontSize:'0.7rem',color:'var(--muted)',maxWidth:120}}>{i.remarks}</td>
                    <td>
                      <button type="button" className="btn-ghost" style={{fontSize:'0.7rem',padding:'0.15rem 0.4rem'}} onClick={()=>{setForm(i);setEditId(i.id);setShowForm(true);}}>✎</button>
                      <button type="button" className="btn-ghost" style={{fontSize:'0.7rem',padding:'0.15rem 0.4rem',marginLeft:3}} onClick={()=>setItems(p=>p.filter(x=>x.id!==i.id))}>✕</button>
                    </td>
                  </tr>
                </>;
              })}
            </tbody>
            <tfoot>
              <tr style={{borderTop:'2px solid var(--border)',fontWeight:700}}>
                <td colSpan={5}>TOTALS ({filtered.length} items)</td>
                <td>{formatETB(filtered.reduce((s,i)=>s+i.billAmount,0))}</td>
                <td></td>
                <td style={{color:'var(--success)'}}>{formatETB(filtered.reduce((s,i)=>s+i.executedAmount,0))}</td>
                <td>{(filtered.reduce((s,i)=>s+i.billAmount,0)>0?(filtered.reduce((s,i)=>s+i.executedAmount,0)/filtered.reduce((s,i)=>s+i.billAmount,0)*100):0).toFixed(1)}%</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
