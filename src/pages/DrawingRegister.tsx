import { useState, useRef } from 'react';
import PageHeader from '../components/PageHeader';
import ExcelImport from '../components/ExcelImport';
import { useProject } from '../store/projectStore';
import { exportCsv, exportXlsx, printTable } from '../utils/exportUtils';

type DrawingStatus = 'Issued for Construction' | 'Issued for Review' | 'For Information' | 'Superseded' | 'Rejected' | 'As-Built';
type Discipline    = 'Architectural' | 'Structural' | 'MEP' | 'Civil' | 'Geotechnical' | 'Landscape' | 'Other';

export interface DrawingRecord {
  id: string;
  drawingNo: string;
  title: string;
  discipline: Discipline;
  scale: string;
  revision: string;
  status: DrawingStatus;
  dateIssued: string;
  issuedBy: string;
  receivedBy: string;
  remarks: string;
  supersedes: string;
  fileDataUrl?: string;
  fileName?: string;
}

export interface RFI {
  id: string;
  rfiNo: string;
  date: string;
  drawingId: string;
  subject: string;
  question: string;
  requestedBy: string;
  answeredBy: string;
  answerDate: string;
  answer: string;
  status: 'Open' | 'Answered' | 'Closed';
}

const todayStr = () => new Date().toISOString().substring(0,10);

const SEED_DRAWINGS: DrawingRecord[] = [
  { id:'D001', drawingNo:'KAS-STR-001', title:'Foundation Layout Plan', discipline:'Structural', scale:'1:50', revision:'Rev.B', status:'Issued for Construction', dateIssued:'2026-01-15', issuedBy:'Adey Engineering', receivedBy:'Eng. Kasaye', remarks:'Revised after soil investigation report', supersedes:'KAS-STR-001 Rev.A' },
  { id:'D002', drawingNo:'KAS-STR-002', title:'Foundation Details — F1 to F5', discipline:'Structural', scale:'1:20', revision:'Rev.A', status:'Issued for Construction', dateIssued:'2026-01-20', issuedBy:'Adey Engineering', receivedBy:'Eng. Kasaye', remarks:'', supersedes:'' },
  { id:'D003', drawingNo:'KAS-STR-003', title:'Column Schedule — Substructure', discipline:'Structural', scale:'1:25', revision:'Rev.A', status:'Issued for Review', dateIssued:'2026-04-10', issuedBy:'Adey Engineering', receivedBy:'Eng. Kasaye', remarks:'Pending SI-012 impact review', supersedes:'' },
  { id:'D004', drawingNo:'KAS-STR-001', title:'Foundation Layout Plan (Original)', discipline:'Structural', scale:'1:50', revision:'Rev.A', status:'Superseded', dateIssued:'2025-12-10', issuedBy:'Adey Engineering', receivedBy:'Eng. Kasaye', remarks:'Superseded by Rev.B', supersedes:'' },
  { id:'D005', drawingNo:'KAS-GEO-001', title:'Geotechnical Investigation Report Drawings', discipline:'Geotechnical', scale:'1:100', revision:'Rev.A', status:'For Information', dateIssued:'2025-11-15', issuedBy:'GeoSurvey PLC', receivedBy:'Eng. Kasaye', remarks:'Borehole locations and soil profile', supersedes:'' },
];

const SEED_RFIS: RFI[] = [
  { id:'R001', rfiNo:'RFI-001', date:'2026-03-05', drawingId:'D001', subject:'Foundation depth confirmation at Grid C4', question:'Soil investigation indicates rock at -4.5m at Grid C4. Foundation drawing shows -5.5m. Please confirm final founding level.', requestedBy:'Eng. Kasaye Getachew', answeredBy:'Adey Engineering', answerDate:'2026-03-10', answer:'Founding level revised to -7.55m BGL following detailed ground investigation. See Rev.B foundation drawing.', status:'Closed' },
  { id:'R002', rfiNo:'RFI-002', date:'2026-04-22', drawingId:'D003', subject:'Column reinforcement detail — Ø20mm bar replacement', question:'NCR-005 quarantined all Ø20mm bars. Can Ø16mm bars be used as alternative pending re-test?', requestedBy:'Eng. Kasaye Getachew', answeredBy:'', answerDate:'', answer:'', status:'Open' },
];

export default function DrawingRegister() {
  const project = useProject();
  const [tab, setTab] = useState<'drawings'|'rfis'>('drawings');
  const [drawings, setDrawings] = useState<DrawingRecord[]>(SEED_DRAWINGS);
  const [rfis, setRfis] = useState<RFI[]>(SEED_RFIS);
  const [showDrawForm, setShowDrawForm] = useState(false);
  const [showRFIForm, setShowRFIForm] = useState(false);
  const [editDrawId, setEditDrawId] = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const blankDraw = (): DrawingRecord => ({ id:`D${String(drawings.length+1).padStart(3,'0')}`, drawingNo:'', title:'', discipline:'Structural', scale:'1:50', revision:'Rev.A', status:'Issued for Construction', dateIssued:todayStr(), issuedBy:'Adey Engineering', receivedBy:project.projectManager, remarks:'', supersedes:'' });
  const blankRFI  = (): RFI => ({ id:`R${String(rfis.length+1).padStart(3,'0')}`, rfiNo:`RFI-${String(rfis.length+1).padStart(3,'0')}`, date:todayStr(), drawingId:drawings[0]?.id??'', subject:'', question:'', requestedBy:project.projectManager, answeredBy:'', answerDate:'', answer:'', status:'Open' });

  const [drawForm, setDrawForm] = useState<DrawingRecord>(blankDraw);
  const [rfiForm,  setRfiForm]  = useState<RFI>(blankRFI);

  const df = (k: keyof DrawingRecord, v: string) => setDrawForm(p=>({...p,[k]:v}));
  const rf = (k: keyof RFI, v: string) => setRfiForm(p=>({...p,[k]:v}));

  const saveDraw = () => {
    if (editDrawId) setDrawings(p=>p.map(d=>d.id===editDrawId?drawForm:d));
    else setDrawings(p=>[...p,drawForm]);
    setShowDrawForm(false); setEditDrawId(null);
  };
  const saveRFI = () => { setRfis(p=>[...p,rfiForm]); setShowRFIForm(false); };
  const closeRFI = (id: string, answer: string) => setRfis(p=>p.map(r=>r.id===id?{...r,answer,answeredBy:project.projectManager,answerDate:todayStr(),status:'Answered'}:r));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase()??'';
    const isImg = ['jpg','jpeg','png','svg','pdf','bmp'].includes(ext);
    const reader = new FileReader();
    reader.onload = ev => {
      setDrawForm(p=>({...p,fileName:file.name,fileDataUrl:isImg?ev.target?.result as string:undefined}));
    };
    if (isImg) reader.readAsDataURL(file); else reader.readAsArrayBuffer(file);
    if (fileRef.current) fileRef.current.value='';
  };

  const statusColor = (s: DrawingStatus) => ({ 'Issued for Construction':'var(--success)', 'Issued for Review':'var(--warning)', 'For Information':'var(--muted)', Superseded:'var(--danger)', Rejected:'var(--danger)', 'As-Built':'var(--accent)' }[s]??'var(--muted)');
  const rfiStatusColor = (s: RFI['status']) => ({ Open:'var(--danger)', Answered:'var(--warning)', Closed:'var(--success)' }[s]);

  const current = drawings.filter(d=>d.status!=='Superseded');
  const superseded = drawings.filter(d=>d.status==='Superseded');
  const openRFIs = rfis.filter(r=>r.status==='Open').length;

  const dwgHeaders = ['Drawing No.','Title','Discipline','Scale','Revision','Status','Date Issued','Issued By','Supersedes','Remarks'];
  const dwgRows = drawings.map(d=>[d.drawingNo,d.title,d.discipline,d.scale,d.revision,d.status,d.dateIssued,d.issuedBy,d.supersedes||'—',d.remarks]);
  const rfiHeaders = ['RFI No.','Date','Drawing','Subject','Requested By','Status','Answer Date'];
  const rfiRows = rfis.map(r=>[r.rfiNo,r.date,drawings.find(d=>d.id===r.drawingId)?.drawingNo??r.drawingId,r.subject,r.requestedBy,r.status,r.answerDate||'—']);

  return (
    <>
      <PageHeader title="Drawing Register & RFIs" subtitle={`${current.length} current drawings · ${superseded.length} superseded · ${openRFIs} open RFIs`} />
      <div className="grid grid-4" style={{marginBottom:'1.25rem'}}>
        <div className="card kpi-success"><div className="card-label">Current Drawings</div><div className="card-value">{current.length}</div></div>
        <div className="card kpi-warning"><div className="card-label">Issued for Review</div><div className="card-value">{drawings.filter(d=>d.status==='Issued for Review').length}</div></div>
        <div className="card kpi-danger"><div className="card-label">Open RFIs</div><div className="card-value">{openRFIs}</div></div>
        <div className="card"><div className="card-label">Superseded</div><div className="card-value">{superseded.length}</div></div>
      </div>

      <div className="sched-toolbar" style={{marginBottom:'1rem'}}>
        <div className="sched-tabs">
          <button type="button" className={`sched-tab${tab==='drawings'?' active':''}`} onClick={()=>setTab('drawings')}>📐 Drawings</button>
          <button type="button" className={`sched-tab${tab==='rfis'?' active':''}`} onClick={()=>setTab('rfis')}>❓ RFIs ({openRFIs} open)</button>
        </div>
        <div className="sched-actions">
          {tab==='drawings'&&<>
            <button type="button" className="btn btn-secondary" onClick={()=>exportCsv(dwgHeaders,dwgRows,'KAS-Drawing-Register.csv')}>⬇ CSV</button>
            <button type="button" className="btn btn-secondary" onClick={()=>exportXlsx(dwgHeaders,dwgRows,'Drawings','KAS-Drawing-Register.xlsx')}>⬇ Excel</button>
            <button type="button" className="btn btn-secondary" onClick={()=>printTable('Drawing Register',project.contractId,dwgHeaders,dwgRows,project.contractor)}>🖨 Print</button>
            <button type="button" className="btn btn-primary" onClick={()=>{setDrawForm(blankDraw());setEditDrawId(null);setShowDrawForm(true);}}>+ Add Drawing</button>
          </>}
          {tab==='rfis'&&<>
            <button type="button" className="btn btn-secondary" onClick={()=>exportCsv(rfiHeaders,rfiRows,'KAS-RFIs.csv')}>⬇ CSV</button>
            <button type="button" className="btn btn-primary" onClick={()=>{setRfiForm(blankRFI());setShowRFIForm(true);}}>+ New RFI</button>
          </>}
        </div>
      </div>

      <ExcelImport moduleId="drawings" label="Import Drawings (Excel / CSV)"
        templateColumns={['DrawingNo','Title','Discipline','Scale','Revision','Status','DateIssued','IssuedBy','Supersedes']}
        templateRows={[['KAS-STR-004','Slab Layout — Ground Floor','Structural','1:50','Rev.A','Issued for Review','2026-06-15','Adey Engineering','']]}
        onImport={(records)=>{
          const imported:DrawingRecord[]=records.filter(r=>r['DrawingNo']).map((r,i)=>({
            id:`D${String(drawings.length+i+1).padStart(3,'0')}`, drawingNo:r['DrawingNo']??'', title:r['Title']??'',
            discipline:(r['Discipline']??'Structural') as Discipline, scale:r['Scale']??'1:50', revision:r['Revision']??'Rev.A',
            status:(r['Status']??'Issued for Review') as DrawingStatus, dateIssued:r['DateIssued']??todayStr(),
            issuedBy:r['IssuedBy']??'', receivedBy:project.projectManager, remarks:'', supersedes:r['Supersedes']??'',
          }));
          setDrawings(p=>[...p,...imported]);
        }} />

      {tab==='drawings' && <>
        {showDrawForm && (
          <div className="card" style={{marginBottom:'1.25rem',borderColor:'var(--accent)'}}>
            <div className="section-title">{editDrawId?`Edit ${editDrawId}`:'Add Drawing'}</div>
            <div className="rr-form-grid" style={{marginTop:'0.75rem'}}>
              {([['Drawing No.','drawingNo'],['Title','title'],['Scale','scale'],['Revision','revision'],['Issued By','issuedBy'],['Received By','receivedBy'],['Date Issued','dateIssued'],['Supersedes','supersedes']] as [string,keyof DrawingRecord][]).map(([label,k])=>(
                <label key={k} style={{display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
                  {label}<input type={k==='dateIssued'?'date':'text'} className="status-select" style={{width:'100%'}} value={String(drawForm[k]??'')} onChange={e=>df(k,e.target.value)} />
                </label>
              ))}
              <label style={{display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
                Discipline<select className="status-select" style={{width:'100%'}} value={drawForm.discipline} onChange={e=>df('discipline',e.target.value)}>
                  {(['Architectural','Structural','MEP','Civil','Geotechnical','Landscape','Other'] as Discipline[]).map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label style={{display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
                Status<select className="status-select" style={{width:'100%'}} value={drawForm.status} onChange={e=>df('status',e.target.value)}>
                  {(['Issued for Construction','Issued for Review','For Information','Superseded','Rejected','As-Built'] as DrawingStatus[]).map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <label style={{display:'block',marginTop:'0.65rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
              Remarks<input className="status-select" style={{width:'100%',marginTop:'0.3rem'}} value={drawForm.remarks} onChange={e=>df('remarks',e.target.value)} />
            </label>
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginTop:'0.75rem'}}>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.svg,.dwg,.dxf" style={{display:'none'}} onChange={handleFileUpload} />
              <button type="button" className="btn btn-secondary" onClick={()=>fileRef.current?.click()}>📎 Attach File</button>
              {drawForm.fileName && <span style={{fontSize:'0.75rem',color:'var(--success)'}}>✔ {drawForm.fileName}</span>}
            </div>
            <div style={{display:'flex',gap:'0.75rem',marginTop:'1rem'}}>
              <button type="button" className="btn btn-primary" onClick={saveDraw}>Save</button>
              <button type="button" className="btn btn-secondary" onClick={()=>setShowDrawForm(false)}>Cancel</button>
            </div>
          </div>
        )}
        <div className="card">
          <div className="section-title">Drawing Register ({drawings.length} total)</div>
          <div style={{overflowX:'auto'}}>
            <table className="data-table" style={{fontSize:'0.77rem'}}>
              <thead><tr><th>Drawing No.</th><th>Rev.</th><th>Title</th><th>Discipline</th><th>Scale</th><th>Status</th><th>Date Issued</th><th>Issued By</th><th>Supersedes</th><th>File</th><th></th></tr></thead>
              <tbody>
                {drawings.map(d=>(
                  <tr key={d.id} style={{opacity:d.status==='Superseded'?0.55:1}}>
                    <td style={{fontWeight:600,color:'var(--accent)'}}>{d.drawingNo}</td>
                    <td><span className="tag">{d.revision}</span></td>
                    <td>{d.title}</td>
                    <td><span className="tag">{d.discipline}</span></td>
                    <td style={{color:'var(--muted)'}}>{d.scale}</td>
                    <td><span className="badge" style={{background:`${statusColor(d.status)}22`,color:statusColor(d.status),fontSize:'0.65rem'}}>{d.status}</span></td>
                    <td style={{fontSize:'0.72rem'}}>{d.dateIssued}</td>
                    <td style={{fontSize:'0.72rem',color:'var(--muted)'}}>{d.issuedBy}</td>
                    <td style={{fontSize:'0.7rem',color:'var(--muted)'}}>{d.supersedes||'—'}</td>
                    <td>{d.fileDataUrl?<span style={{color:'var(--success)',fontSize:'0.72rem'}}>📎 {d.fileName}</span>:d.fileName?<span style={{color:'var(--muted)',fontSize:'0.72rem'}}>📎 {d.fileName}</span>:'—'}</td>
                    <td>
                      <button type="button" className="btn-ghost" style={{fontSize:'0.7rem',padding:'0.15rem 0.4rem'}} onClick={()=>{setDrawForm(d);setEditDrawId(d.id);setShowDrawForm(true);}}>✎</button>
                      <button type="button" className="btn-ghost" style={{fontSize:'0.7rem',padding:'0.15rem 0.4rem',marginLeft:3}} onClick={()=>setDrawings(p=>p.filter(x=>x.id!==d.id))}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>}

      {tab==='rfis' && <>
        {showRFIForm && (
          <div className="card" style={{marginBottom:'1.25rem',borderColor:'var(--accent)'}}>
            <div className="section-title">New RFI</div>
            <div className="rr-form-grid" style={{marginTop:'0.75rem'}}>
              <label style={{display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
                RFI No.<input className="status-select" style={{width:'100%'}} value={rfiForm.rfiNo} onChange={e=>rf('rfiNo',e.target.value)} />
              </label>
              <label style={{display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
                Date<input type="date" className="status-select" style={{width:'100%'}} value={rfiForm.date} onChange={e=>rf('date',e.target.value)} />
              </label>
              <label style={{display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
                Drawing<select className="status-select" style={{width:'100%'}} value={rfiForm.drawingId} onChange={e=>rf('drawingId',e.target.value)}>
                  {drawings.map(d=><option key={d.id} value={d.id}>{d.drawingNo} — {d.title}</option>)}
                </select>
              </label>
              <label style={{display:'flex',flexDirection:'column',gap:'0.25rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
                Requested By<input className="status-select" style={{width:'100%'}} value={rfiForm.requestedBy} onChange={e=>rf('requestedBy',e.target.value)} />
              </label>
            </div>
            <label style={{display:'block',marginTop:'0.65rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
              Subject<input className="status-select" style={{width:'100%',marginTop:'0.3rem'}} value={rfiForm.subject} onChange={e=>rf('subject',e.target.value)} />
            </label>
            <label style={{display:'block',marginTop:'0.65rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
              Question<textarea className="rr-textarea" rows={3} style={{marginTop:'0.3rem'}} value={rfiForm.question} onChange={e=>rf('question',e.target.value)} />
            </label>
            <div style={{display:'flex',gap:'0.75rem',marginTop:'1rem'}}>
              <button type="button" className="btn btn-primary" onClick={saveRFI}>Submit RFI</button>
              <button type="button" className="btn btn-secondary" onClick={()=>setShowRFIForm(false)}>Cancel</button>
            </div>
          </div>
        )}
        <div className="card">
          <div className="section-title">RFI Register ({rfis.length})</div>
          <div style={{display:'flex',flexDirection:'column',gap:'0.75rem',marginTop:'0.75rem'}}>
            {rfis.map(r=>{
              const dwg = drawings.find(d=>d.id===r.drawingId);
              const [showAnswer,setShowAnswer]=useState(false);
              const [answerText,setAnswerText]=useState('');
              return (
                <div key={r.id} className="roadblock-item" style={{borderLeftColor:rfiStatusColor(r.status)}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'0.5rem'}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',gap:'0.5rem',alignItems:'center',flexWrap:'wrap',marginBottom:'0.3rem'}}>
                        <strong>{r.rfiNo}</strong>
                        <span className="tag">{dwg?.drawingNo??r.drawingId}</span>
                        <span className="badge" style={{background:`${rfiStatusColor(r.status)}22`,color:rfiStatusColor(r.status)}}>{r.status}</span>
                        <span style={{fontSize:'0.72rem',color:'var(--muted)'}}>{r.date}</span>
                      </div>
                      <div style={{fontWeight:600,fontSize:'0.83rem',marginBottom:'0.2rem'}}>{r.subject}</div>
                      <div style={{fontSize:'0.78rem',color:'var(--muted)',marginBottom:'0.3rem'}}>{r.question}</div>
                      <div style={{fontSize:'0.75rem',color:'var(--muted)'}}>Requested by: {r.requestedBy}</div>
                      {r.answer && <div style={{fontSize:'0.78rem',color:'var(--success)',marginTop:'0.35rem'}}>✔ Answer ({r.answerDate}): {r.answer}</div>}
                      {showAnswer && r.status==='Open' && (
                        <div style={{marginTop:'0.65rem',display:'flex',flexDirection:'column',gap:'0.4rem'}}>
                          <textarea className="rr-textarea" rows={2} placeholder="Type answer..." value={answerText} onChange={e=>setAnswerText(e.target.value)} />
                          <div style={{display:'flex',gap:'0.5rem'}}>
                            <button type="button" className="btn btn-primary" style={{fontSize:'0.75rem',padding:'0.3rem 0.75rem'}} onClick={()=>{closeRFI(r.id,answerText);setShowAnswer(false);}}>Submit Answer</button>
                            <button type="button" className="btn btn-secondary" style={{fontSize:'0.75rem',padding:'0.3rem 0.75rem'}} onClick={()=>setShowAnswer(false)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{display:'flex',gap:'0.4rem',flexShrink:0}}>
                      {r.status==='Open'&&<button type="button" className="btn btn-primary" style={{fontSize:'0.72rem',padding:'0.3rem 0.7rem'}} onClick={()=>setShowAnswer(v=>!v)}>✎ Answer</button>}
                      {r.status==='Answered'&&<button type="button" className="btn btn-secondary" style={{fontSize:'0.72rem',padding:'0.3rem 0.7rem'}} onClick={()=>setRfis(p=>p.map(x=>x.id===r.id?{...x,status:'Closed'}:x))}>✔ Close</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>}
    </>
  );
}
