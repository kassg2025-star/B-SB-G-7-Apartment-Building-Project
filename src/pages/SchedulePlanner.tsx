import { useState, useRef } from 'react';
import ExcelImport from '../components/ExcelImport';
import PageHeader from '../components/PageHeader';
import { useProject } from '../store/projectStore';

// ── Types ──────────────────────────────────────────────────────────────────
export interface GanttTask {
  id: string;
  wbs: string;
  name: string;
  start: string;   // YYYY-MM-DD
  end: string;     // YYYY-MM-DD
  duration: number;
  progress: number; // 0–100
  predecessors: string;
  level: number;
  isMilestone: boolean;
  resource: string;
}

export interface DrawingAttachment {
  id: string;
  name: string;
  discipline: string;
  revision: string;
  uploadedAt: string;
  size: string;
  dataUrl?: string;
}

type ViewMode = 'gantt' | 'workplan' | 'drawings';
type WorkplanPeriod = 'daily' | 'weekly' | 'monthly';

// ── MS Project XML parser ──────────────────────────────────────────────────
function parseMspXml(xml: string): GanttTask[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const tasks: GanttTask[] = [];
  const taskNodes = doc.querySelectorAll('Task');
  taskNodes.forEach((t) => {
    const uid = t.querySelector('UID')?.textContent ?? '';
    if (uid === '0') return; // skip project summary node
    const name = t.querySelector('Name')?.textContent ?? '';
    if (!name) return;
    const wbs = t.querySelector('WBS')?.textContent ?? uid;
    const start = (t.querySelector('Start')?.textContent ?? '').substring(0, 10);
    const finish = (t.querySelector('Finish')?.textContent ?? '').substring(0, 10);
    const duration = parseInt(t.querySelector('Duration')?.textContent ?? '0');
    const pct = parseInt(t.querySelector('PercentComplete')?.textContent ?? '0');
    const preds = t.querySelector('PredecessorLink UID')?.textContent ?? '';
    const outline = parseInt(t.querySelector('OutlineLevel')?.textContent ?? '1');
    const milestone = t.querySelector('Milestone')?.textContent === '1';
    const resource = t.querySelector('ResourceUID')?.textContent ?? '';
    tasks.push({ id: uid, wbs, name, start, end: finish, duration, progress: pct,
      predecessors: preds, level: outline, isMilestone: milestone, resource });
  });
  return tasks;
}

// ── Demo tasks (fallback when no MSP file loaded) ──────────────────────────
function buildDemoTasks(project: ReturnType<typeof useProject>): GanttTask[] {
  const base = project.dates.siteCommencement; // "January 20, 2026"
  const d = (offset: number) => {
    const dt = new Date('2026-01-20');
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().substring(0, 10);
  };
  return [
    { id:'1', wbs:'1',   name:'Substructure Phase',         start:d(0),   end:d(180), duration:180, progress:8,  predecessors:'', level:1, isMilestone:false, resource:'' },
    { id:'2', wbs:'1.1', name:'Site Clearing & Setting Out', start:d(0),   end:d(14),  duration:14,  progress:100,predecessors:'', level:2, isMilestone:false, resource:'Site Crew' },
    { id:'3', wbs:'1.2', name:'Bulk Excavation',             start:d(10),  end:d(70),  duration:60,  progress:40, predecessors:'2',level:2, isMilestone:false, resource:'Excavator' },
    { id:'4', wbs:'1.3', name:'Rock Chiseling (DE-001)',     start:d(45),  end:d(120), duration:75,  progress:30, predecessors:'3',level:2, isMilestone:false, resource:'Chisel Crew' },
    { id:'5', wbs:'1.4', name:'Dewatering System',           start:d(50),  end:d(180), duration:130, progress:55, predecessors:'3',level:2, isMilestone:false, resource:'3 Pumps' },
    { id:'6', wbs:'1.5', name:'Soil Nailing',                start:d(90),  end:d(130), duration:40,  progress:10, predecessors:'4',level:2, isMilestone:false, resource:'Nailing Crew' },
    { id:'7', wbs:'1.6', name:'PCC Blinding',                start:d(110), end:d(140), duration:30,  progress:20, predecessors:'6',level:2, isMilestone:false, resource:'Concrete Team' },
    { id:'8', wbs:'1.7', name:'Foundation F-1 Rebar',        start:d(130), end:d(160), duration:30,  progress:15, predecessors:'7',level:2, isMilestone:false, resource:'Steel Fixers' },
    { id:'9', wbs:'1.8', name:'Foundation F-1 Pour',         start:d(155), end:d(175), duration:20,  progress:5,  predecessors:'8',level:2, isMilestone:false, resource:'Concrete Team' },
    { id:'10',wbs:'1.9', name:'Substructure Complete ★',     start:d(180), end:d(180), duration:0,   progress:0,  predecessors:'9',level:2, isMilestone:true,  resource:'' },
    { id:'11',wbs:'2',   name:'Superstructure Phase',        start:d(181), end:d(365), duration:184, progress:0,  predecessors:'10',level:1,isMilestone:false, resource:'' },
    { id:'12',wbs:'2.1', name:'Ground Floor Columns',        start:d(181), end:d(220), duration:39,  progress:0,  predecessors:'10',level:2,isMilestone:false, resource:'Formwork Team' },
    { id:'13',wbs:'2.2', name:'Ground Floor Slab',           start:d(215), end:d(250), duration:35,  progress:0,  predecessors:'12',level:2,isMilestone:false, resource:'Concrete Team' },
    { id:'14',wbs:'2.3', name:'1st–7th Floor Typical',       start:d(248), end:d(365), duration:117, progress:0,  predecessors:'13',level:2,isMilestone:false, resource:'All Trades' },
  ];
}

// ── Workplan generator ─────────────────────────────────────────────────────
function generateWorkplan(tasks: GanttTask[], period: WorkplanPeriod): string {
  const today = new Date();
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

  const periodEnd = new Date(today);
  if (period === 'daily')   periodEnd.setDate(today.getDate() + 1);
  if (period === 'weekly')  periodEnd.setDate(today.getDate() + 7);
  if (period === 'monthly') periodEnd.setMonth(today.getMonth() + 1);

  const active = tasks.filter((t) => {
    if (t.isMilestone || t.level === 1) return false;
    const s = new Date(t.start), e = new Date(t.end);
    return s <= periodEnd && e >= today;
  });

  const label = period === 'daily' ? 'DAILY' : period === 'weekly' ? 'WEEKLY' : 'MONTHLY';
  const range = period === 'daily'
    ? fmt(today)
    : `${fmt(today)} – ${fmt(periodEnd)}`;

  let out = `KASSA & SONS CONSTRUCTION PLC\n`;
  out += `${label} WORK PLAN\n`;
  out += `Period: ${range}\n`;
  out += `Generated: ${fmt(today)}\n`;
  out += `${'─'.repeat(72)}\n\n`;
  out += `${'WBS'.padEnd(8)} ${'ACTIVITY'.padEnd(32)} ${'START'.padEnd(12)} ${'END'.padEnd(12)} ${'%'.padEnd(5)} RESOURCE\n`;
  out += `${'─'.repeat(72)}\n`;

  if (active.length === 0) {
    out += `No active tasks in this period.\n`;
  } else {
    active.forEach((t) => {
      out += `${t.wbs.padEnd(8)} ${t.name.substring(0,31).padEnd(32)} ${t.start.padEnd(12)} ${t.end.padEnd(12)} ${String(t.progress+'%').padEnd(5)} ${t.resource}\n`;
    });
  }

  out += `\n${'─'.repeat(72)}\n`;
  out += `Total active tasks: ${active.length}\n`;
  out += `Tasks on critical path: ${active.filter(t => t.progress < 50).length}\n`;
  return out;
}

// ── Gantt chart component ──────────────────────────────────────────────────
function GanttChart({ tasks }: { tasks: GanttTask[] }) {
  const allDates = tasks.flatMap((t) => [new Date(t.start), new Date(t.end)]);
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000) + 1;
  const today = new Date();

  const toPercent = (dateStr: string) => {
    const d = new Date(dateStr);
    return ((d.getTime() - minDate.getTime()) / 86400000 / totalDays) * 100;
  };
  const widthPct = (start: string, end: string) => {
    const s = new Date(start), e = new Date(end);
    return (Math.ceil((e.getTime() - s.getTime()) / 86400000) / totalDays) * 100;
  };
  const todayPct = ((today.getTime() - minDate.getTime()) / 86400000 / totalDays) * 100;

  // Build month headers
  const months: { label: string; left: number; width: number }[] = [];
  const cur = new Date(minDate); cur.setDate(1);
  while (cur <= maxDate) {
    const mStart = Math.max(0, ((cur.getTime() - minDate.getTime()) / 86400000 / totalDays) * 100);
    const mEnd = new Date(cur); mEnd.setMonth(mEnd.getMonth() + 1);
    const mEndPct = Math.min(100, ((mEnd.getTime() - minDate.getTime()) / 86400000 / totalDays) * 100);
    months.push({ label: cur.toLocaleDateString('en-GB', { month:'short', year:'2-digit' }), left: mStart, width: mEndPct - mStart });
    cur.setMonth(cur.getMonth() + 1);
  }

  return (
    <div className="gantt-wrap">
      {/* Task list + bars */}
      <div className="gantt-header-row">
        <div className="gantt-task-col gantt-th">Activity</div>
        <div className="gantt-bar-col gantt-th" style={{ position:'relative' }}>
          {months.map((m) => (
            <div key={m.label} className="gantt-month-label" style={{ left:`${m.left}%`, width:`${m.width}%` }}>{m.label}</div>
          ))}
        </div>
      </div>
      <div className="gantt-scroll">
        {tasks.map((t) => (
          <div key={t.id} className={`gantt-row${t.level === 1 ? ' gantt-row-parent' : ''}${t.isMilestone ? ' gantt-row-milestone' : ''}`}>
            <div className="gantt-task-col" style={{ paddingLeft: `${(t.level - 1) * 14 + 6}px` }}>
              <span className={t.isMilestone ? 'gantt-milestone-icon' : ''}>
                {t.isMilestone ? '◆ ' : ''}{t.wbs} {t.name}
              </span>
            </div>
            <div className="gantt-bar-col" style={{ position:'relative' }}>
              {/* Today line */}
              {todayPct >= 0 && todayPct <= 100 && (
                <div className="gantt-today-line" style={{ left:`${todayPct}%` }} />
              )}
              {t.isMilestone ? (
                <div className="gantt-diamond" style={{ left:`${toPercent(t.start)}%` }} title={t.name} />
              ) : (
                <div className="gantt-bar-outer" style={{ left:`${toPercent(t.start)}%`, width:`${Math.max(widthPct(t.start, t.end), 0.5)}%` }}
                  title={`${t.name}: ${t.start} → ${t.end} | ${t.progress}%`}>
                  <div className="gantt-bar-fill" style={{ width:`${t.progress}%` }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page component ────────────────────────────────────────────────────
export default function SchedulePlanner() {
  const project = useProject();
  const [view, setView] = useState<ViewMode>('gantt');
  const [tasks, setTasks] = useState<GanttTask[]>(() => buildDemoTasks(project));
  const [mspLoaded, setMspLoaded] = useState(false);
  const [mspError, setMspError] = useState('');
  const [drawings, setDrawings] = useState<DrawingAttachment[]>([]);
  const [workplanPeriod, setWorkplanPeriod] = useState<WorkplanPeriod>('weekly');
  const [workplanText, setWorkplanText] = useState('');
  const mspRef = useRef<HTMLInputElement>(null);
  const dwgRef = useRef<HTMLInputElement>(null);
  const [selectedDwg, setSelectedDwg] = useState<DrawingAttachment | null>(null);

  // ── MSP import ──
  const handleMspUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMspError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const xml = ev.target?.result as string;
        const parsed = parseMspXml(xml);
        if (parsed.length === 0) throw new Error('No tasks found in file.');
        setTasks(parsed);
        setMspLoaded(true);
      } catch (err) {
        setMspError(`Could not parse file: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  // ── Drawing upload ──
  const handleDwgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const isImage = ['jpg','jpeg','png','pdf','svg','bmp','tif','tiff'].includes(ext);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const entry: DrawingAttachment = {
          id: `DWG-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
          name: file.name,
          discipline: ext === 'dwg' || ext === 'dxf' ? 'AutoCAD' : ext.toUpperCase(),
          revision: 'Rev.A',
          uploadedAt: new Date().toLocaleDateString('en-GB'),
          size: `${(file.size / 1024).toFixed(1)} KB`,
          dataUrl: isImage ? (ev.target?.result as string) : undefined,
        };
        setDrawings((prev) => [...prev, entry]);
      };
      if (isImage) reader.readAsDataURL(file);
      else reader.readAsArrayBuffer(file);
    });
    if (dwgRef.current) dwgRef.current.value = '';
  };

  const deleteDrawing = (id: string) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
    if (selectedDwg?.id === id) setSelectedDwg(null);
  };

  // ── Workplan ──
  const handleGenerateWorkplan = () => {
    setWorkplanText(generateWorkplan(tasks, workplanPeriod));
    setView('workplan');
  };

  const downloadWorkplan = () => {
    const blob = new Blob([workplanText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `KAS-Workplan-${workplanPeriod}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const totalTasks = tasks.filter(t => !t.isMilestone && t.level > 1).length;
  const completedTasks = tasks.filter(t => t.progress === 100).length;
  const criticalTasks = tasks.filter(t => t.progress < 20 && t.level > 1 && !t.isMilestone).length;

  return (
    <>
      <PageHeader
        title="Schedule Planner & Drawings"
        subtitle="MS Project import · Gantt chart · AutoCAD attachments · Workplan generator"
      />

      {/* KPI strip */}
      <div className="exec-strip" style={{ marginBottom:'1.25rem' }}>
        <span>Tasks: <strong>{totalTasks}</strong></span>
        <span>Completed: <strong style={{color:'var(--success)'}}>{completedTasks}</strong></span>
        <span>Critical: <strong style={{color:'var(--danger)'}}>{criticalTasks}</strong></span>
        <span>Source: <strong>{mspLoaded ? '📂 MS Project File' : '📋 Demo Data'}</strong></span>
        <span>Drawings: <strong>{drawings.length}</strong></span>
      </div>

      {/* Excel import for Gantt tasks */}
      <ExcelImport
        moduleId="gantt"
        label="Import Gantt Tasks from Excel / CSV"
        templateColumns={['WBS','Name','Start','End','Duration','Progress%','Resource','IsMilestone']}
        templateRows={[
          ['1.1','Site Clearing','2026-01-20','2026-02-03','14','100','Site Crew','0'],
          ['1.2','Excavation','2026-02-01','2026-04-01','60','40','Excavator','0'],
          ['1.M','Substructure Complete','2026-06-18','2026-06-18','0','0','','1'],
        ]}
        onImport={(records) => {
          const imported: GanttTask[] = records.filter(r => r['Name']).map((r, i) => ({
            id:           String(tasks.length + i + 1),
            wbs:          r['WBS'] ?? '',
            name:         r['Name'] ?? '',
            start:        r['Start'] ?? '',
            end:          r['End'] ?? '',
            duration:     parseInt(r['Duration'] ?? '0') || 0,
            progress:     parseInt(r['Progress%'] ?? '0') || 0,
            predecessors: r['Predecessors'] ?? '',
            level:        (r['WBS'] ?? '').split('.').length,
            isMilestone:  r['IsMilestone'] === '1' || r['IsMilestone']?.toLowerCase() === 'true',
            resource:     r['Resource'] ?? '',
          }));
          setTasks(prev => [...prev, ...imported]);
          setMspLoaded(true);
        }}
      />

      {/* Toolbar */}
      <div className="sched-toolbar">
        <div className="sched-tabs">
          <button type="button" className={`sched-tab${view==='gantt'?' active':''}`} onClick={() => setView('gantt')}>📊 Gantt Chart</button>
          <button type="button" className={`sched-tab${view==='workplan'?' active':''}`} onClick={() => setView('workplan')}>📋 Work Plans</button>
          <button type="button" className={`sched-tab${view==='drawings'?' active':''}`} onClick={() => setView('drawings')}>📐 Drawings</button>
        </div>        <div className="sched-actions">
          {/* MS Project import */}
          <input ref={mspRef} type="file" accept=".xml,.mpp" style={{display:'none'}} onChange={handleMspUpload} />
          <button type="button" className="btn btn-secondary" onClick={() => mspRef.current?.click()}>
            ⬆ Import MS Project (.xml)
          </button>
          {mspLoaded && (
            <button type="button" className="btn btn-secondary" onClick={() => { setTasks(buildDemoTasks(project)); setMspLoaded(false); }}>
              ↺ Reset Demo
            </button>
          )}
        </div>
      </div>

      {mspError && (
        <div className="alert-item alert-danger" style={{ marginBottom:'1rem' }}>
          <strong>Import Error</strong><p>{mspError}</p>
        </div>
      )}

      {/* ── GANTT VIEW ── */}
      {view === 'gantt' && (
        <div className="card" style={{ padding:'1.25rem' }}>
          <div className="section-title" style={{ marginBottom:'0.75rem' }}>
            Gantt Chart — {mspLoaded ? 'Imported Schedule' : 'Demo Schedule (import .xml to replace)'}
          </div>
          <GanttChart tasks={tasks} />
          <div style={{ marginTop:'1rem', display:'flex', gap:'1.25rem', flexWrap:'wrap', fontSize:'0.75rem', color:'var(--muted)' }}>
            <span><span style={{display:'inline-block',width:12,height:12,background:'var(--accent)',borderRadius:2,marginRight:4}} />Progress fill</span>
            <span><span style={{display:'inline-block',width:12,height:12,background:'var(--surface-3)',border:'1px solid var(--border)',borderRadius:2,marginRight:4}} />Remaining</span>
            <span><span style={{display:'inline-block',width:2,height:12,background:'var(--danger)',marginRight:4}} />Today</span>
            <span>◆ Milestone</span>
          </div>
        </div>
      )}

      {/* ── WORKPLAN VIEW ── */}
      {view === 'workplan' && (
        <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:'1.25rem', alignItems:'start' }}>
          <div className="card">
            <div className="section-title">Generate Work Plan</div>
            <p style={{ fontSize:'0.8rem', color:'var(--muted)', marginBottom:'1rem' }}>
              Extracts active tasks from the master schedule for the selected period.
            </p>
            {(['daily','weekly','monthly'] as WorkplanPeriod[]).map((p) => (
              <button key={p} type="button"
                className={`doc-type-btn${workplanPeriod===p?' active':''}`}
                onClick={() => setWorkplanPeriod(p)}>
                <strong>{p.charAt(0).toUpperCase()+p.slice(1)} Work Plan</strong>
                <span>{p==='daily'?'Today\'s tasks':p==='weekly'?'Next 7-day schedule':'Next 30-day look-ahead'}</span>
              </button>
            ))}
            <button type="button" className="btn btn-primary" style={{ width:'100%', marginTop:'0.75rem' }} onClick={handleGenerateWorkplan}>
              Generate
            </button>
          </div>
          <div className="card">
            {workplanText ? (
              <>
                <div className="doc-actions">
                  <button type="button" className="btn btn-primary" onClick={() => navigator.clipboard.writeText(workplanText)}>Copy</button>
                  <button type="button" className="btn btn-secondary" onClick={downloadWorkplan}>Download .txt</button>
                </div>
                <div className="doc-output">{workplanText}</div>
              </>
            ) : (
              <div style={{ color:'var(--muted)', fontSize:'0.875rem', padding:'2rem', textAlign:'center' }}>
                Select a period and click Generate to produce a work plan from the master schedule.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DRAWINGS VIEW ── */}
      {view === 'drawings' && (
        <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:'1.25rem', alignItems:'start' }}>
          <div className="card">
            <div className="section-title">Drawing Attachments</div>
            <p style={{ fontSize:'0.8rem', color:'var(--muted)', marginBottom:'1rem' }}>
              Attach AutoCAD exports (.dwg, .dxf), PDFs, or image files. Supports multi-file upload.
            </p>
            <input ref={dwgRef} type="file" multiple accept=".dwg,.dxf,.pdf,.jpg,.jpeg,.png,.svg,.tif,.tiff,.bmp" style={{display:'none'}} onChange={handleDwgUpload} />
            <button type="button" className="btn btn-primary" style={{ width:'100%', marginBottom:'1rem' }} onClick={() => dwgRef.current?.click()}>
              ⬆ Attach Drawings
            </button>
            {drawings.length === 0 ? (
              <div className="drop-hint">No drawings attached yet.<br/>Upload AutoCAD exports or PDFs.</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                {drawings.map((dwg) => (
                  <div key={dwg.id}
                    className={`drawing-item${selectedDwg?.id===dwg.id?' selected':''}`}
                    onClick={() => setSelectedDwg(dwg)}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <span style={{ fontWeight:600, fontSize:'0.8rem', wordBreak:'break-word', flex:1 }}>{dwg.name}</span>
                      <button type="button" className="btn-ghost" style={{ padding:'0.1rem 0.4rem', fontSize:'0.7rem', marginLeft:'0.5rem' }}
                        onClick={(e) => { e.stopPropagation(); deleteDrawing(dwg.id); }}>✕</button>
                    </div>
                    <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.25rem', flexWrap:'wrap' }}>
                      <span className="tag">{dwg.discipline}</span>
                      <span className="tag">{dwg.revision}</span>
                      <span className="tag">{dwg.size}</span>
                    </div>
                    <div style={{ fontSize:'0.7rem', color:'var(--muted)', marginTop:'0.2rem' }}>{dwg.uploadedAt}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            {selectedDwg ? (
              <>
                <div className="section-title" style={{ marginBottom:'0.75rem' }}>{selectedDwg.name}</div>
                <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'1rem' }}>
                  <span className="tag">{selectedDwg.discipline}</span>
                  <span className="tag">{selectedDwg.revision}</span>
                  <span className="tag">{selectedDwg.size}</span>
                  <span className="tag">Uploaded: {selectedDwg.uploadedAt}</span>
                </div>
                {selectedDwg.dataUrl ? (
                  <div style={{ textAlign:'center' }}>
                    <img src={selectedDwg.dataUrl} alt={selectedDwg.name}
                      style={{ maxWidth:'100%', maxHeight:'65vh', objectFit:'contain', borderRadius:'var(--radius)', border:'1px solid var(--border)' }} />
                  </div>
                ) : (
                  <div className="dwg-no-preview">
                    <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>📐</div>
                    <div style={{ fontWeight:600, marginBottom:'0.35rem' }}>{selectedDwg.name}</div>
                    <div style={{ fontSize:'0.8rem', color:'var(--muted)', marginBottom:'1rem' }}>
                      {selectedDwg.discipline === 'AutoCAD'
                        ? 'AutoCAD .dwg/.dxf files cannot be rendered in-browser. Export to PDF or PNG from AutoCAD to preview here.'
                        : 'Preview not available for this file type.'}
                    </div>
                    <div style={{ fontSize:'0.75rem', color:'var(--muted)' }}>File attached and registered in the drawing register.</div>
                  </div>
                )}
              </>
            ) : (
              <div className="dwg-no-preview">
                <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>📐</div>
                <div style={{ fontWeight:600, marginBottom:'0.5rem' }}>Drawing Viewer</div>
                <div style={{ fontSize:'0.85rem', color:'var(--muted)' }}>
                  Attach drawings from the panel and select one to preview.<br/>
                  Supported: PDF, PNG, JPG, SVG (preview) · DWG, DXF (register only)
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
