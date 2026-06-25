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
  { id:"B001", section:"A SUB-STRUCTURE", itemNo:"1", description:"EXCAVATION & EARTH WORKS", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B002", section:"A SUB-STRUCTURE", itemNo:"1.1", description:"BULK EXCAVATION IN ORDINARY", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B003", section:"A SUB-STRUCTURE", itemNo:"", description:"a) Soil to depth not exceeding  1500mm from  reduced level.", unit:"m3", billQty:334, unitRate:481, billAmount:160654, executedQty:50.74, executedAmount:24405.41, percentComplete:15.2, remarks:"In Progress" },
  { id:"B004", section:"A SUB-STRUCTURE", itemNo:"", description:"b) Ditto as a but  from 1500mm to 3000mm from reduced level.", unit:"m3", billQty:334, unitRate:534, billAmount:178356, executedQty:324.84, executedAmount:173462.08, percentComplete:97.3, remarks:"In Progress" },
  { id:"B005", section:"A SUB-STRUCTURE", itemNo:"", description:"c) Ditto as a but  from 3000mm to 4500mm from reduced level.", unit:"m3", billQty:334, unitRate:600, billAmount:200400, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B006", section:"A SUB-STRUCTURE", itemNo:"", description:"d) Ditto as a but  from 4500mm to 6000mm from reduced level.", unit:"m3", billQty:334, unitRate:686, billAmount:229124, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B007", section:"A SUB-STRUCTURE", itemNo:"", description:"e) Ditto as a but  from 6000mm to required depth (13.5m) from reduced level.", unit:"m3", billQty:334, unitRate:1372, billAmount:458248, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B008", section:"A SUB-STRUCTURE", itemNo:"", description:"Fill", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B009", section:"A SUB-STRUCTURE", itemNo:"1.2", description:"Granular selected & imported backfill under foundation, slab and around retaining wall. Compaction shall be made in layers of 200mm with roller and by sprinkling water to achieve the required proctor density, which is (95% of the maximum dry Density).", unit:"m3", billQty:957.03, unitRate:2028, billAmount:1940856.84, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B010", section:"A SUB-STRUCTURE", itemNo:"1.3", description:"Cart Away", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B011", section:"A SUB-STRUCTURE", itemNo:"", description:"Cart away surplus excavated material to a distance not exceeding 10kms. The contractor is responsible for permission from relevant authorities.", unit:"m3", billQty:1670, unitRate:469, billAmount:783230, executedQty:1392.15, executedAmount:652916.16, percentComplete:83.4, remarks:"In Progress" },
  { id:"B012", section:"A SUB-STRUCTURE", itemNo:"1.4", description:"Massonry", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B013", section:"A SUB-STRUCTURE", itemNo:"", description:"Provide & construct Hard basaltic or equivalent stone masonry wall bedded in cement sand mortar (1:3) in full joints as per the design.", unit:"m3", billQty:58.8, unitRate:6165, billAmount:362502, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B014", section:"A SUB-STRUCTURE", itemNo:"1.5", description:"Demolishing and Clearing of site to a depth not exceeding 20cm from natural ground surface and cartawy the surples material", unit:"LS", billQty:1, unitRate:91390, billAmount:91390, executedQty:1, executedAmount:91390, percentComplete:100, remarks:"Complete" },
  { id:"B015", section:"A SUB-STRUCTURE", itemNo:"1.6", description:"25cm Hard Core", unit:"m2", billQty:179.41, unitRate:910, billAmount:163263.1, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B016", section:"A SUB-STRUCTURE", itemNo:"2", description:"CONCRETE WORK", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B017", section:"A SUB-STRUCTURE", itemNo:"2.1", description:"50mmn lean concrete quality C-5, with minimum cement content 150kg of cement/m3, of concrete.", unit:"m2", billQty:150, unitRate:584, billAmount:87600, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B018", section:"A SUB-STRUCTURE", itemNo:"", description:"Reinforced concrete in", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B019", section:"A SUB-STRUCTURE", itemNo:"2.2", description:"Reinforced concrete in C-40 with minimum cement content of 450Kg./m3, filled and vibrated into formwork and around reinforcement bar. Formwork and reinforcement bar measured separately. In column and shear wall", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B020", section:"A SUB-STRUCTURE", itemNo:"a", description:"in Column and Sheer wall", unit:"m3", billQty:79.2, unitRate:16096, billAmount:1274803.2, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B021", section:"A SUB-STRUCTURE", itemNo:"2.3", description:"Reinforced concrete quality C-30, 400 kg of cement/m3) filled in to formwork and vibrated around, rod reinforcement (formwork and reinforcement measured separately).in slab and beam stair", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B022", section:"A SUB-STRUCTURE", itemNo:"", description:"a) in footing & pad", unit:"m3", billQty:95.53, unitRate:14710, billAmount:1405246.3, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B023", section:"A SUB-STRUCTURE", itemNo:"", description:"b) in beam and slab", unit:"m3", billQty:117.04, unitRate:14710, billAmount:1721658.4, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B024", section:"A SUB-STRUCTURE", itemNo:"", description:"c) in 1st basement floor slab", unit:"m2", billQty:182.34, unitRate:1471, billAmount:268222.14, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B025", section:"A SUB-STRUCTURE", itemNo:"", description:"d) in retaining wall", unit:"m3", billQty:216.89, unitRate:14710, billAmount:3190451.9, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B026", section:"A SUB-STRUCTURE", itemNo:"", description:"c) in Stair", unit:"m3", billQty:6.26, unitRate:14710, billAmount:92084.6, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B027", section:"A SUB-STRUCTURE", itemNo:"2.4", description:"Provide, cut and fix in position sawn zigba wood or steel formwork which ever appropriate", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B028", section:"A SUB-STRUCTURE", itemNo:"a", description:"To footing", unit:"m2", billQty:84.21, unitRate:1342, billAmount:113009.82, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B029", section:"A SUB-STRUCTURE", itemNo:"b", description:"To Column and Shear wall", unit:"m2", billQty:467.37, unitRate:1342, billAmount:627210.54, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B030", section:"A SUB-STRUCTURE", itemNo:"c", description:"To beam and slab", unit:"m2", billQty:637.61, unitRate:1342, billAmount:855672.62, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B031", section:"A SUB-STRUCTURE", itemNo:"d", description:"To Retaining wall", unit:"m2", billQty:1445.96, unitRate:1342, billAmount:1940478.32, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B032", section:"A SUB-STRUCTURE", itemNo:"e", description:"ToStair", unit:"m2", billQty:41.96, unitRate:1342, billAmount:56310.32, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B033", section:"A SUB-STRUCTURE", itemNo:"2.5", description:"Reinforcement Bar", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B034", section:"A SUB-STRUCTURE", itemNo:"", description:"Use grade 75 (S 500) based on ASTM A615 (Shall have minimum yield Strength of 500mPA) for re-bar greater than 14mm", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B035", section:"A SUB-STRUCTURE", itemNo:"a", description:"Dia 6 mm deformed bar", unit:"Kg", billQty:0, unitRate:223.56, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B036", section:"A SUB-STRUCTURE", itemNo:"b", description:"Dia 8 mm deformed bar", unit:"Kg", billQty:9525.1, unitRate:206.99, billAmount:1971600.45, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B037", section:"A SUB-STRUCTURE", itemNo:"c", description:"Dia 10 mm deformed bar", unit:"Kg", billQty:11428.4, unitRate:206.99, billAmount:2365564.52, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B038", section:"A SUB-STRUCTURE", itemNo:"d", description:"Dia 12 mm deformed bar", unit:"Kg", billQty:16052, unitRate:206.99, billAmount:3322603.48, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B039", section:"A SUB-STRUCTURE", itemNo:"e", description:"Dia 14 mm deformed bar", unit:"Kg", billQty:2018.6, unitRate:206.99, billAmount:417830.01, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B040", section:"A SUB-STRUCTURE", itemNo:"f", description:"Dia 16 mm deformed bar", unit:"Kg", billQty:241.5, unitRate:206.99, billAmount:49988.09, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B041", section:"A SUB-STRUCTURE", itemNo:"g", description:"Dia 20 mm deformed bar", unit:"Kg", billQty:8576.4, unitRate:206.99, billAmount:1775229.04, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B042", section:"A SUB-STRUCTURE", itemNo:"h", description:"Dia 24 mm deformed bar", unit:"Kg", billQty:492.8, unitRate:206.99, billAmount:102004.67, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B043", section:"B SUPER STRUCTURE", itemNo:"1", description:"CONCRETE WORK", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B044", section:"B SUPER STRUCTURE", itemNo:"1.1", description:"Reinforced concrete in C-40 with minimum cement content of 450Kg/m3, filled and vibrated into formwork. and around reinforcement bar. Formwork and reinforcement bar measured separately. In column and shear wall", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B045", section:"B SUPER STRUCTURE", itemNo:"", description:"a) In Columns & Shear walls", unit:"m3", billQty:239.76, unitRate:16096, billAmount:3859176.96, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B046", section:"B SUPER STRUCTURE", itemNo:"1.2", description:"Reinforced concrete quality C-30, 400 kg of cement/m3 filled in to formwork and vibrated around rod reinforcement (formwork and reinforcement measured separately).in slab and beam Stair", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B047", section:"B SUPER STRUCTURE", itemNo:"a", description:"0n Floor Beam & Slabs", unit:"m3", billQty:471.8, unitRate:14710, billAmount:6940178, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B048", section:"B SUPER STRUCTURE", itemNo:"b", description:"On Staircase", unit:"m3", billQty:35.8, unitRate:14710, billAmount:526618, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B049", section:"B SUPER STRUCTURE", itemNo:"1.3", description:"Provide, cut and fix in position sawn zigba wood or  steel  formwork which ever appropriate", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B050", section:"B SUPER STRUCTURE", itemNo:"a", description:"To beam and slab", unit:"m2", billQty:3010.89, unitRate:1342, billAmount:4040614.38, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B051", section:"B SUPER STRUCTURE", itemNo:"b", description:"To Column and Shear wall", unit:"m2", billQty:1479.81, unitRate:1342, billAmount:1985905.02, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B052", section:"B SUPER STRUCTURE", itemNo:"c", description:"To Staircase", unit:"m2", billQty:272.16, unitRate:1342, billAmount:365238.72, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B053", section:"B SUPER STRUCTURE", itemNo:"1.4", description:"Reinforcement Bar", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B054", section:"B SUPER STRUCTURE", itemNo:"", description:"Use grade 75 (S 500) based on ASTM A615 (Shall have minimum yield Strength of 500mPA) for re-bar greater than 14mm", unit:"", billQty:0, unitRate:0, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B055", section:"B SUPER STRUCTURE", itemNo:"a", description:"Dia 6 mm deformed bar", unit:"Kg", billQty:0, unitRate:223.56, billAmount:0, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B056", section:"B SUPER STRUCTURE", itemNo:"b", description:"Dia 8 mm deformed bar", unit:"Kg", billQty:24885.52, unitRate:206.99, billAmount:5151053.78, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B057", section:"B SUPER STRUCTURE", itemNo:"c", description:"Dia 10 mm deformed bar", unit:"Kg", billQty:30126.34, unitRate:206.99, billAmount:6235851.12, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B058", section:"B SUPER STRUCTURE", itemNo:"d", description:"Dia 12 mm deformed bar", unit:"Kg", billQty:13375, unitRate:206.99, billAmount:2768491.25, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B059", section:"B SUPER STRUCTURE", itemNo:"e", description:"Dia 14 mm deformed bar", unit:"Kg", billQty:1493.1, unitRate:206.99, billAmount:309056.77, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B060", section:"B SUPER STRUCTURE", itemNo:"f", description:"Dia 16 mm deformed bar", unit:"Kg", billQty:4945.7, unitRate:206.99, billAmount:1023710.44, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B061", section:"B SUPER STRUCTURE", itemNo:"g", description:"Dia 20 mm deformed bar", unit:"Kg", billQty:27403.33, unitRate:206.99, billAmount:5672215.28, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
  { id:"B062", section:"B SUPER STRUCTURE", itemNo:"h", description:"Dia 24 mm deformed bar", unit:"Kg", billQty:8575.18, unitRate:206.99, billAmount:1774976.51, executedQty:0, executedAmount:0, percentComplete:0, remarks:"" },
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
