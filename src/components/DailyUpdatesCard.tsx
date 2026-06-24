/**
 * Daily Updates Card — formal daily reports with file attachments.
 * Self-contained card for the Executive Dashboard.
 */
import { useState, useRef, useEffect } from 'react';

export type ReportType = 'Daily Report' | 'Weekly Report' | 'Inspection' | 'Incident' | 'Material Delivery' | 'Other';

export interface DailyUpdate {
  id: string; date: string; reportNo: string;
  reportType: ReportType; title: string;
  preparedBy: string; weather: string;
  workDone: string; issues: string; nextDay: string;
  workerCount: number;
  attachments: { name: string; size: string; dataUrl: string }[];
}

const STORAGE_KEY = 'kassa-daily-updates';
const load = (): DailyUpdate[] => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; } };
const save = (d: DailyUpdate[]) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch { /**/ } };

const todayStr = () => new Date().toISOString().substring(0, 10);

const TYPE_COLORS: Record<ReportType, string> = {
  'Daily Report':'#4a9eff', 'Weekly Report':'#4caf82',
  Inspection:'#d4a017', Incident:'#e05c5c',
  'Material Delivery':'#b06fd8', Other:'#8fa3bc',
};

const FILE_EXT_ICON: Record<string, string> = {
  pdf:'📄', xlsx:'📊', xls:'📊', csv:'📊',
  doc:'📝', docx:'📝', ppt:'📑', pptx:'📑',
  txt:'📃', zip:'🗜',
};
const fileIcon = (name: string) => FILE_EXT_ICON[name.split('.').pop()?.toLowerCase() ?? ''] ?? '📎';
const isImg    = (name: string) => /\.(jpe?g|png|gif|svg|bmp|webp)$/i.test(name);

export default function DailyUpdatesCard({ projectManager, compact = true, maxVisible = 5 }:
  { projectManager: string; compact?: boolean; maxVisible?: number }) {

  const [reports, setReports]   = useState<DailyUpdate[]>(load);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterType, setFilter] = useState<'All' | ReportType>('All');
  const [showAll, setShowAll]   = useState(false);
  const [lightboxUrl, setLbUrl] = useState<string | null>(null);
  const attRef = useRef<HTMLInputElement>(null);

  const blankForm = () => ({
    date: todayStr(),
    reportNo: `DR-${Date.now().toString().slice(-5)}`,
    reportType: 'Daily Report' as ReportType,
    title: '', preparedBy: projectManager,
    weather: 'Clear', workDone: '', issues: '', nextDay: '',
    workerCount: 0, attachments: [] as DailyUpdate['attachments'],
  });
  const [form, setForm] = useState(blankForm);

  useEffect(() => { save(reports); }, [reports]);

  const f = (k: keyof typeof form, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  const addAttachments = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setForm(p => ({
          ...p, attachments: [...p.attachments, {
            name: file.name,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            dataUrl: isImg(file.name) ? ev.target?.result as string : '',
          }]
        }));
      };
      if (isImg(file.name)) reader.readAsDataURL(file);
      else reader.readAsArrayBuffer(file);
    });
    if (attRef.current) attRef.current.value = '';
  };

  const submit = () => {
    if (!form.title.trim() || !form.workDone.trim()) return;
    setReports(p => [{ ...form, id: `DU-${Date.now()}` }, ...p]);
    setForm(blankForm()); setShowForm(false);
  };

  const del = (id: string) => setReports(p => p.filter(x => x.id !== id));

  const filtered = reports.filter(r => filterType === 'All' || r.reportType === filterType);
  const visible  = showAll ? filtered : filtered.slice(0, maxVisible);
  const todayCount = reports.filter(r => r.date === todayStr()).length;

  const inputSt = { width:'100%', background:'var(--surface-2)', border:'1px solid var(--border)',
    borderRadius:'var(--radius)', color:'var(--text)', padding:'0.38rem 0.55rem',
    fontSize:'0.8rem', fontFamily:'var(--font)' };
  const labelSt: React.CSSProperties = { display:'flex', flexDirection:'column', gap:'0.2rem',
    fontSize:'0.68rem', color:'var(--muted)', fontWeight:700, textTransform:'uppercase' };

  return (
    <div className="card" style={{ display:'flex', flexDirection:'column', gap:0, padding:0, overflow:'hidden' }}>
      {/* Card header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap',
        gap:'0.5rem', padding:'0.85rem 1.1rem', background:'var(--surface-2)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
          <span style={{ fontSize:'1rem' }}>📋</span>
          <span style={{ fontWeight:700, fontSize:'0.92rem' }}>Site Progress Feed</span>
          <span style={{ fontSize:'0.68rem', color:'var(--muted)' }}>Daily Updates & Reports</span>
          <span style={{ fontSize:'0.68rem', background:'var(--surface-3)', border:'1px solid var(--border)',
            borderRadius:999, padding:'0.1rem 0.5rem', color:'var(--muted)' }}>{reports.length}</span>
          {todayCount > 0 && <span className="badge badge-success" style={{ fontSize:'0.62rem' }}>+{todayCount} today</span>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', flexWrap:'wrap' }}>
          <select className="status-select" style={{ fontSize:'0.7rem', padding:'0.2rem 0.4rem' }}
            value={filterType} onChange={e => setFilter(e.target.value as typeof filterType)}>
            <option value="All">All Types</option>
            {Object.keys(TYPE_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button type="button" className="btn btn-primary" style={{ fontSize:'0.72rem', padding:'0.28rem 0.7rem' }}
            onClick={() => { setForm(blankForm()); setShowForm(v => !v); }}>
            + Daily Report
          </button>
        </div>
      </div>

      {/* Report form */}
      {showForm && (
        <div style={{ padding:'0.85rem 1.1rem', borderBottom:'1px solid var(--border)', background:'var(--surface-2)',
          display:'flex', flexDirection:'column', gap:'0.55rem' }}>
          <div style={{ fontWeight:700, fontSize:'0.85rem', color:'var(--accent)', marginBottom:'0.1rem' }}>📋 New Report</div>

          {/* Row 1 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:'0.45rem' }}>
            <label style={labelSt}>Report No.<input style={inputSt} value={form.reportNo} onChange={e=>f('reportNo',e.target.value)} /></label>
            <label style={labelSt}>Date<input type="date" style={inputSt} value={form.date} onChange={e=>f('date',e.target.value)} /></label>
            <label style={labelSt}>Type
              <select style={inputSt} value={form.reportType} onChange={e=>f('reportType',e.target.value)}>
                {Object.keys(TYPE_COLORS).map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label style={labelSt}>Weather
              <select style={inputSt} value={form.weather} onChange={e=>f('weather',e.target.value)}>
                {['Clear','Partly Cloudy','Overcast','Light Rain','Heavy Rain','Windy','Hot'].map(w=><option key={w} value={w}>{w}</option>)}
              </select>
            </label>
            <label style={labelSt}>Workers<input type="number" style={inputSt} value={form.workerCount} onChange={e=>f('workerCount',parseInt(e.target.value)||0)} /></label>
            <label style={labelSt}>Prepared By<input style={inputSt} value={form.preparedBy} onChange={e=>f('preparedBy',e.target.value)} /></label>
          </div>

          {/* Title */}
          <label style={labelSt}>Title *
            <input style={inputSt} placeholder="e.g. Foundation F-2 rebar placement" value={form.title} onChange={e=>f('title',e.target.value)} />
          </label>

          {/* Text areas */}
          {([['Work Done Today *','workDone','Activities completed today…'],
             ['Issues / Problems','issues','Delays, NCRs, shortages…'],
             ['Next Day Plan','nextDay','Planned tasks for tomorrow…']] as [string, keyof typeof form, string][]).map(([label,key,ph]) => (
            <label key={key} style={labelSt}>{label}
              <textarea style={{ ...inputSt, resize:'vertical' } as React.CSSProperties} rows={2} placeholder={ph}
                value={String(form[key])} onChange={e=>f(key,e.target.value)} />
            </label>
          ))}

          {/* Attachments */}
          <div>
            <div style={{ ...labelSt, marginBottom:'0.3rem' }}>Attachments</div>
            <input ref={attRef} type="file" multiple
              accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.ppt,.pptx,.txt,.zip,.jpg,.jpeg,.png,.gif,.svg,.bmp,.mp4,.mov"
              style={{ display:'none' }} onChange={addAttachments} />
            <button type="button" className="btn btn-secondary"
              style={{ fontSize:'0.72rem', padding:'0.28rem 0.65rem', marginBottom:'0.35rem' }}
              onClick={() => attRef.current?.click()}>
              📎 Attach Files (Excel, PDF, Word, Images…)
            </button>
            {form.attachments.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'0.35rem' }}>
                {form.attachments.map((a,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.25rem',
                    background:'var(--surface-3)', border:'1px solid var(--border)',
                    borderRadius:4, padding:'0.15rem 0.45rem', fontSize:'0.68rem' }}>
                    <span>{fileIcon(a.name)}</span>
                    <span style={{ maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.name}</span>
                    <span style={{ color:'var(--muted)' }}>{a.size}</span>
                    <button type="button" style={{ background:'none', border:'none', color:'var(--danger)', cursor:'pointer', padding:'0 1px', fontSize:'0.65rem' }}
                      onClick={() => setForm(p=>({...p,attachments:p.attachments.filter((_,j)=>j!==i)}))}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display:'flex', gap:'0.5rem' }}>
            <button type="button" className="btn btn-primary" style={{ fontSize:'0.75rem', padding:'0.3rem 0.8rem' }}
              onClick={submit} disabled={!form.title.trim()||!form.workDone.trim()}>✔ Submit Report</button>
            <button type="button" className="btn btn-secondary" style={{ fontSize:'0.75rem', padding:'0.3rem 0.8rem' }}
              onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Report list */}
      {filtered.length === 0 ? (
        <div style={{ padding:'2rem', textAlign:'center', color:'var(--muted)', fontSize:'0.82rem' }}>
          <div style={{ fontSize:'2rem', marginBottom:'0.4rem' }}>📋</div>
          No reports yet — click <strong>+ Daily Report</strong> to log the first update.
        </div>
      ) : (
        <div style={{ padding:'0.65rem 0.85rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          {visible.map(r => (
            <div key={r.id} style={{ background:'var(--surface-2)', border:'1px solid var(--border)',
              borderLeft:`3px solid ${TYPE_COLORS[r.reportType]}`,
              borderRadius:'var(--radius)', padding:'0.6rem 0.85rem', cursor:'pointer',
              transition:'border-color 0.15s' }}
              onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
              {/* Header row */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.3rem' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', flexWrap:'wrap', marginBottom:'0.2rem' }}>
                    <span className="badge" style={{ background:`${TYPE_COLORS[r.reportType]}22`,
                      color:TYPE_COLORS[r.reportType], fontSize:'0.62rem' }}>{r.reportType}</span>
                    <strong style={{ fontSize:'0.78rem' }}>{r.reportNo}</strong>
                    <span style={{ fontSize:'0.68rem', color:'var(--muted)' }}>📅 {r.date}</span>
                    <span style={{ fontSize:'0.68rem', color:'var(--muted)' }}>🌤 {r.weather}</span>
                    <span style={{ fontSize:'0.68rem', color:'var(--muted)' }}>👷 {r.workerCount}</span>
                    {r.attachments.length > 0 && (
                      <span style={{ fontSize:'0.65rem', color:'var(--accent)' }}>📎 {r.attachments.length}</span>
                    )}
                  </div>
                  <div style={{ fontSize:'0.82rem', fontWeight:600 }}>{r.title}</div>
                  <div style={{ fontSize:'0.68rem', color:'var(--muted)', marginTop:'0.15rem' }}>👤 {r.preparedBy}</div>
                </div>
                <div style={{ display:'flex', gap:'0.25rem', alignItems:'center' }}>
                  <span style={{ fontSize:'0.68rem', color:'var(--muted)' }}>{expanded===r.id?'▲':'▼'}</span>
                  <button type="button" onClick={e=>{e.stopPropagation();del(r.id);}}
                    style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer',
                      fontSize:'0.72rem', padding:'0.1rem 0.3rem', borderRadius:3 }}>✕</button>
                </div>
              </div>

              {/* Expanded content */}
              {expanded === r.id && (
                <div style={{ marginTop:'0.6rem', display:'flex', flexDirection:'column', gap:'0.4rem',
                  fontSize:'0.78rem', borderTop:'1px solid var(--border)', paddingTop:'0.6rem' }}
                  onClick={e=>e.stopPropagation()}>
                  {r.workDone && <div><strong style={{ color:'var(--muted)' }}>Work Done:</strong> {r.workDone}</div>}
                  {r.issues   && <div><strong style={{ color:'var(--danger)' }}>Issues:</strong> {r.issues}</div>}
                  {r.nextDay  && <div><strong style={{ color:'var(--success)' }}>Next Day:</strong> {r.nextDay}</div>}
                  {r.attachments.length > 0 && (
                    <div style={{ marginTop:'0.3rem' }}>
                      <div style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--muted)',
                        textTransform:'uppercase', marginBottom:'0.3rem' }}>Attachments</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'0.35rem' }}>
                        {r.attachments.map((a,i) => (
                          <div key={i} style={{ background:'var(--surface-3)', border:'1px solid var(--border)',
                            borderRadius:4, overflow:'hidden',
                            cursor: a.dataUrl ? 'pointer' : 'default', width:72 }}
                            onClick={() => a.dataUrl && isImg(a.name) ? setLbUrl(a.dataUrl) : undefined}>
                            {isImg(a.name) && a.dataUrl
                              ? <img src={a.dataUrl} alt={a.name} style={{ width:72, height:54, objectFit:'cover', display:'block' }} />
                              : <div style={{ width:72, height:54, display:'flex', flexDirection:'column',
                                  alignItems:'center', justifyContent:'center', gap:2 }}>
                                  <span style={{ fontSize:'1.2rem' }}>{fileIcon(a.name)}</span>
                                  <span style={{ fontSize:'0.52rem', color:'var(--muted)', padding:'0 3px',
                                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%', textAlign:'center' }}>{a.name}</span>
                                </div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Show more */}
      {filtered.length > maxVisible && (
        <div style={{ padding:'0.4rem 0.75rem', borderTop:'1px solid var(--border)' }}>
          <button type="button" className="btn-ghost" style={{ width:'100%', fontSize:'0.75rem', padding:'0.35rem' }}
            onClick={() => setShowAll(v=>!v)}>
            {showAll ? '▲ Show less' : `▼ Show all ${filtered.length} reports`}
          </button>
        </div>
      )}

      {/* Lightbox for image attachments */}
      {lightboxUrl && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}
          onClick={() => setLbUrl(null)}>
          <div style={{ position:'relative', maxWidth:'90vw', maxHeight:'90vh' }} onClick={e=>e.stopPropagation()}>
            <button type="button" onClick={() => setLbUrl(null)}
              style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.6)', border:'none',
                color:'#fff', width:30, height:30, borderRadius:'50%', cursor:'pointer', fontSize:'0.8rem', zIndex:1 }}>✕</button>
            <img src={lightboxUrl} alt="attachment"
              style={{ maxWidth:'90vw', maxHeight:'88vh', objectFit:'contain', borderRadius:'var(--radius)', display:'block' }} />
          </div>
        </div>
      )}
    </div>
  );
}
