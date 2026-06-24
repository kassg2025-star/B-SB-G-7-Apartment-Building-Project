import { useState, useRef, useEffect } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────
export type MediaType  = 'photo' | 'video' | 'document';
export type FeedTab    = 'photos' | 'reports';
export type PostCategory = 'Excavation' | 'Concrete' | 'Rebar' | 'Formwork' | 'HSE' | 'Equipment' | 'General';
export type ReportType = 'Daily Report' | 'Weekly Report' | 'Inspection' | 'Incident' | 'Other';

export interface ProgressPost {
  id: string; date: string; time: string;
  caption: string; location: string;
  category: PostCategory; postedBy: string;
  mediaType: MediaType;
  dataUrl: string;    // base64 for images/video; empty for docs
  fileName: string;   fileSize: string;
  approved: boolean;
}

export interface DailyReport {
  id: string; date: string; reportNo: string;
  reportType: ReportType; title: string;
  preparedBy: string; weather: string;
  workDone: string; issues: string; nextDay: string;
  workerCount: number; attachments: { name: string; size: string; dataUrl: string; type: string }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CAT_COLORS: Record<PostCategory, string> = {
  Excavation:'#e8a838', Concrete:'#4a9eff', Rebar:'#e05c5c',
  Formwork:'#4caf82',   HSE:'#d4a017',      Equipment:'#b06fd8', General:'#8fa3bc',
};

const FEED_KEY    = 'kassa-progress-feed';
const REPORTS_KEY = 'kassa-daily-reports';

const loadJSON = <T,>(key: string, fallback: T): T => {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) as T : fallback; } catch { return fallback; }
};
const saveJSON = (key: string, val: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota */ }
};

const todayStr = () => new Date().toISOString().substring(0,10);
const nowTime  = () => new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });

const FILE_ICON: Record<string, string> = {
  pdf:'📄', xlsx:'📊', xls:'📊', csv:'📊', doc:'📝', docx:'📝',
  ppt:'📑', pptx:'📑', txt:'📃', zip:'🗜', default:'📎',
};
const fileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return FILE_ICON[ext] ?? FILE_ICON.default;
};

const isPreviewable = (name: string) =>
  /\.(jpe?g|png|gif|svg|bmp|webp)$/i.test(name);

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  projectManager: string;
  compact?: boolean;
  maxVisible?: number;
}

// ── Daily Report Form ─────────────────────────────────────────────────────────
function DailyReportForm({ projectManager, onSave, onCancel }:
  { projectManager: string; onSave: (r: DailyReport) => void; onCancel: () => void }) {
  const attRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Omit<DailyReport,'id'>>({
    date: todayStr(), reportNo: `DR-${Date.now().toString().slice(-6)}`,
    reportType: 'Daily Report', title: '', preparedBy: projectManager,
    weather: 'Clear', workDone: '', issues: '', nextDay: '', workerCount: 0,
    attachments: [],
  });

  const f = (k: keyof typeof form, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const reader = new FileReader();
      const isPrev = isPreviewable(file.name);
      reader.onload = ev => {
        setForm(p => ({
          ...p, attachments: [...p.attachments, {
            name: file.name,
            size: `${(file.size/1024).toFixed(1)} KB`,
            dataUrl: isPrev ? ev.target?.result as string : '',
            type: file.type,
          }]
        }));
      };
      if (isPrev) reader.readAsDataURL(file);
      else reader.readAsArrayBuffer(file); // triggers onload but we only keep name
    });
    if (attRef.current) attRef.current.value = '';
  };

  const removeAtt = (i: number) => setForm(p => ({ ...p, attachments: p.attachments.filter((_,j) => j !== i) }));

  const submit = () => {
    if (!form.title.trim() || !form.workDone.trim()) return;
    onSave({ ...form, id: `DR-${Date.now()}` });
  };

  const inputStyle = { width:'100%', padding:'0.4rem 0.6rem', background:'var(--surface-2)',
    border:'1px solid var(--border)', borderRadius:'var(--radius)', color:'var(--text)',
    fontSize:'0.82rem', fontFamily:'var(--font)' };
  const labelStyle = { display:'flex' as const, flexDirection:'column' as const, gap:'0.25rem',
    fontSize:'0.72rem', color:'var(--muted)', fontWeight:600 as const, textTransform:'uppercase' as const };

  return (
    <div className="pfeed-upload-form" style={{ flexDirection:'column', gap:'0.85rem' }}>
      <div style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--accent)' }}>📋 New Daily Report</div>

      {/* Row 1 */}
      <div className="rr-form-grid">
        <label style={labelStyle}>Report No.<input style={inputStyle} value={form.reportNo} onChange={e=>f('reportNo',e.target.value)} /></label>
        <label style={labelStyle}>Date<input type="date" style={inputStyle} value={form.date} onChange={e=>f('date',e.target.value)} /></label>
        <label style={labelStyle}>Report Type
          <select style={inputStyle} value={form.reportType} onChange={e=>f('reportType',e.target.value)}>
            {(['Daily Report','Weekly Report','Inspection','Incident','Other'] as ReportType[]).map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label style={labelStyle}>Weather
          <select style={inputStyle} value={form.weather} onChange={e=>f('weather',e.target.value)}>
            {['Clear','Partly Cloudy','Overcast','Light Rain','Heavy Rain','Windy','Hot'].map(w=><option key={w} value={w}>{w}</option>)}
          </select>
        </label>
        <label style={labelStyle}>Workers on Site<input type="number" style={inputStyle} value={form.workerCount} onChange={e=>f('workerCount',parseInt(e.target.value)||0)} /></label>
        <label style={labelStyle}>Prepared By<input style={inputStyle} value={form.preparedBy} onChange={e=>f('preparedBy',e.target.value)} /></label>
      </div>

      {/* Title */}
      <label style={labelStyle}>Report Title *<input style={inputStyle} placeholder="e.g. Foundation F-2 excavation progress" value={form.title} onChange={e=>f('title',e.target.value)} /></label>

      {/* Text areas */}
      {([['Work Done Today *','workDone','What was completed today…'],['Issues / Problems','issues','Any problems, delays, NCRs…'],['Next Day Plan','nextDay','Planned activities for tomorrow…']] as [string, keyof typeof form, string][]).map(([label, key, ph]) => (
        <label key={key} style={labelStyle}>{label}
          <textarea style={{ ...inputStyle, resize:'vertical', minHeight:60 }} placeholder={ph}
            value={String(form[key])} onChange={e=>f(key,e.target.value)} rows={2} />
        </label>
      ))}

      {/* Attachments */}
      <div>
        <div style={{ ...labelStyle, marginBottom:'0.35rem' }}>Attachments (Excel, PDF, Word, Images…)</div>
        <input ref={attRef} type="file" multiple
          accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.ppt,.pptx,.txt,.zip,.jpg,.jpeg,.png,.gif,.svg,.bmp,.mp4,.mov,.avi,.mkv"
          style={{ display:'none' }} onChange={handleAttach} />
        <button type="button" className="btn btn-secondary" style={{ fontSize:'0.78rem', padding:'0.35rem 0.85rem', marginBottom:'0.5rem' }}
          onClick={() => attRef.current?.click()}>
          📎 Attach Files
        </button>
        {form.attachments.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem' }}>
            {form.attachments.map((a,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.3rem', background:'var(--surface-3)',
                border:'1px solid var(--border)', borderRadius:4, padding:'0.2rem 0.5rem', fontSize:'0.72rem' }}>
                <span>{fileIcon(a.name)}</span>
                <span style={{ maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.name}</span>
                <span style={{ color:'var(--muted)' }}>{a.size}</span>
                <button type="button" style={{ background:'none', border:'none', color:'var(--danger)', cursor:'pointer', padding:'0 2px' }}
                  onClick={()=>removeAtt(i)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.25rem' }}>
        <button type="button" className="btn btn-primary" onClick={submit}
          disabled={!form.title.trim() || !form.workDone.trim()}>✔ Submit Report</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Report Card ───────────────────────────────────────────────────────────────
function ReportCard({ report, onDelete }: { report: DailyReport; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string|null>(null);

  const typeColor: Record<ReportType, string> = {
    'Daily Report':'#4a9eff','Weekly Report':'#4caf82',
    Inspection:'#d4a017', Incident:'#e05c5c', Other:'#8fa3bc',
  };

  const downloadDoc = (att: DailyReport['attachments'][0]) => {
    // For non-previewable files we stored nothing — just show name
    // For images we can download from dataUrl
    if (!att.dataUrl) return;
    const a = document.createElement('a');
    a.href = att.dataUrl; a.download = att.name; a.click();
  };

  return (
    <>
      <div className="pfeed-report-card" onClick={() => setExpanded(v=>!v)}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.4rem' }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap', marginBottom:'0.3rem' }}>
              <span className="badge" style={{ background:`${typeColor[report.reportType]}22`, color:typeColor[report.reportType], fontSize:'0.65rem' }}>{report.reportType}</span>
              <strong style={{ fontSize:'0.8rem' }}>{report.reportNo}</strong>
              <span style={{ fontSize:'0.72rem', color:'var(--muted)' }}>📅 {report.date}</span>
              {report.attachments.length > 0 && <span style={{ fontSize:'0.68rem', color:'var(--accent)' }}>📎 {report.attachments.length} file{report.attachments.length>1?'s':''}</span>}
            </div>
            <div style={{ fontWeight:600, fontSize:'0.85rem', marginBottom:'0.15rem' }}>{report.title}</div>
            <div style={{ fontSize:'0.72rem', color:'var(--muted)' }}>
              👤 {report.preparedBy} · 🌤 {report.weather} · 👷 {report.workerCount} workers
            </div>
          </div>
          <div style={{ display:'flex', gap:'0.3rem' }}>
            <span style={{ fontSize:'0.72rem', color:'var(--muted)', alignSelf:'center' }}>{expanded?'▲':'▼'}</span>
            <button type="button" className="pfeed-delete" onClick={e=>{e.stopPropagation();onDelete();}}>✕</button>
          </div>
        </div>

        {expanded && (
          <div style={{ marginTop:'0.75rem', display:'flex', flexDirection:'column', gap:'0.55rem', fontSize:'0.8rem' }} onClick={e=>e.stopPropagation()}>
            {report.workDone && <div><span style={{ color:'var(--muted)', fontWeight:600 }}>Work Done: </span>{report.workDone}</div>}
            {report.issues && <div><span style={{ color:'var(--danger)', fontWeight:600 }}>Issues: </span>{report.issues}</div>}
            {report.nextDay && <div><span style={{ color:'var(--success)', fontWeight:600 }}>Next Day: </span>{report.nextDay}</div>}

            {report.attachments.length > 0 && (
              <div style={{ marginTop:'0.4rem' }}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--muted)', textTransform:'uppercase', marginBottom:'0.35rem' }}>Attachments</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem' }}>
                  {report.attachments.map((a,i) => (
                    <div key={i} style={{ background:'var(--surface-3)', border:'1px solid var(--border)',
                      borderRadius:4, overflow:'hidden', cursor: a.dataUrl ? 'pointer' : 'default' }}
                      onClick={() => a.dataUrl && isPreviewable(a.name) ? setLightboxUrl(a.dataUrl) : downloadDoc(a)}>
                      {isPreviewable(a.name) && a.dataUrl ? (
                        <img src={a.dataUrl} alt={a.name} style={{ width:80, height:60, objectFit:'cover', display:'block' }} />
                      ) : (
                        <div style={{ width:80, height:60, display:'flex', flexDirection:'column', alignItems:'center',
                          justifyContent:'center', fontSize:'1.4rem', gap:'2px' }}>
                          <span>{fileIcon(a.name)}</span>
                          <span style={{ fontSize:'0.55rem', color:'var(--muted)', textAlign:'center', padding:'0 4px',
                            overflow:'hidden', textOverflow:'ellipsis', width:'100%', whiteSpace:'nowrap' }}>{a.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {lightboxUrl && (
        <div className="pfeed-lightbox" onClick={() => setLightboxUrl(null)}>
          <div className="pfeed-lightbox-inner" onClick={e=>e.stopPropagation()}>
            <button type="button" className="pfeed-lightbox-close" onClick={() => setLightboxUrl(null)}>✕</button>
            <img src={lightboxUrl} alt="attachment" className="pfeed-lightbox-media" />
          </div>
        </div>
      )}
    </>
  );
}

// ── Main ProgressFeed component ───────────────────────────────────────────────
export default function ProgressFeed({ projectManager, compact = false, maxVisible = 4 }: Props) {
  const [tab, setTab] = useState<FeedTab>('photos');
  const [posts, setPosts]     = useState<ProgressPost[]>(() => loadJSON(FEED_KEY, []));
  const [reports, setReports] = useState<DailyReport[]>(() => loadJSON(REPORTS_KEY, []));

  // Photo/video state
  const [showPhotoForm, setShowPhotoForm] = useState(false);
  const [pending, setPending]   = useState<{ dataUrl:string; mediaType:MediaType; fileName:string; fileSize:string }|null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox]   = useState<ProgressPost|null>(null);
  const [filterCat, setFilterCat] = useState<'All'|PostCategory>('All');
  const [showAll, setShowAll]     = useState(!compact);
  const photoFileRef = useRef<HTMLInputElement>(null);

  // Report state
  const [showReportForm, setShowReportForm] = useState(false);
  const [filterType, setFilterType] = useState<'All'|ReportType>('All');

  const [photoForm, setPhotoForm] = useState({
    caption:'', location:'', category:'General' as PostCategory,
    postedBy: projectManager, date: todayStr(), time: nowTime(),
  });

  // Persist
  useEffect(() => { saveJSON(FEED_KEY,    posts);   }, [posts]);
  useEffect(() => { saveJSON(REPORTS_KEY, reports); }, [reports]);

  // Photo upload
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const isVideo = file.type.startsWith('video/');
    const reader = new FileReader();
    reader.onload = ev => {
      setPending({ dataUrl: ev.target?.result as string,
        mediaType: isVideo ? 'video' : 'photo',
        fileName: file.name, fileSize: `${(file.size/1024/1024).toFixed(2)} MB` });
      setUploading(false); setShowPhotoForm(true);
    };
    reader.readAsDataURL(file);
    if (photoFileRef.current) photoFileRef.current.value = '';
  };

  const submitPhoto = () => {
    if (!pending || !photoForm.caption.trim()) return;
    setPosts(prev => [{
      id:`P-${Date.now()}`, date:photoForm.date, time:photoForm.time,
      caption:photoForm.caption, location:photoForm.location, category:photoForm.category,
      postedBy:photoForm.postedBy, mediaType:pending.mediaType, dataUrl:pending.dataUrl,
      fileName:pending.fileName, fileSize:pending.fileSize, approved:true,
    }, ...prev]);
    setPending(null); setShowPhotoForm(false);
    setPhotoForm(p => ({ ...p, caption:'', location:'' }));
  };

  const deletePost   = (id: string) => setPosts(p => p.filter(x => x.id !== id));
  const deleteReport = (id: string) => setReports(p => p.filter(x => x.id !== id));

  const filteredPhotos  = posts.filter(p => filterCat === 'All' || p.category === filterCat);
  const filteredReports = reports.filter(r => filterType === 'All' || r.reportType === filterType);
  const visiblePhotos   = showAll ? filteredPhotos : filteredPhotos.slice(0, maxVisible);

  const totalToday = posts.filter(p => p.date === todayStr()).length;
  const reportsToday = reports.filter(r => r.date === todayStr()).length;

  return (
    <div className="pfeed-wrap">
      {/* ── Header ── */}
      <div className="pfeed-header">
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
          <span className="pfeed-title">📷 Site Progress &nbsp;|&nbsp; 📋 Daily Updates</span>
          <span className="pfeed-count">{posts.length} photos · {reports.length} reports</span>
          {totalToday > 0 && <span className="badge badge-success" style={{ fontSize:'0.65rem' }}>+{totalToday} today</span>}
        </div>

        {/* Tab filter menu */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap' }}>
          <div className="sched-tabs">
            <button type="button" className={`sched-tab${tab==='photos'?' active':''}`}
              onClick={() => setTab('photos')}>
              📷 Site Progress
              {posts.filter(p=>p.date===todayStr()).length > 0 && (
                <span style={{ marginLeft:4, fontSize:'0.65rem', background:'rgba(76,175,130,0.25)', color:'var(--success)', borderRadius:999, padding:'1px 5px' }}>
                  {posts.filter(p=>p.date===todayStr()).length}
                </span>
              )}
            </button>
            <button type="button" className={`sched-tab${tab==='reports'?' active':''}`}
              onClick={() => setTab('reports')}>
              📋 Daily Updates
              {reportsToday > 0 && (
                <span style={{ marginLeft:4, fontSize:'0.65rem', background:'rgba(76,175,130,0.25)', color:'var(--success)', borderRadius:999, padding:'1px 5px' }}>
                  {reportsToday}
                </span>
              )}
            </button>
          </div>

          {/* Category / type filter — always visible in both modes */}
          {tab === 'photos' && (
            <select className="status-select" style={{ fontSize:'0.72rem' }}
              value={filterCat} onChange={e => setFilterCat(e.target.value as typeof filterCat)}>
              <option value="All">All Categories</option>
              {Object.keys(CAT_COLORS).map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {tab === 'reports' && (
            <select className="status-select" style={{ fontSize:'0.72rem' }}
              value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}>
              <option value="All">All Types</option>
              {(['Daily Report','Weekly Report','Inspection','Incident','Other'] as ReportType[]).map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          )}

          {/* Action button */}
          <input ref={photoFileRef} type="file" accept="image/*,video/*" style={{ display:'none' }} onChange={handlePhotoSelect} />
          {tab === 'photos' && (
            <button type="button" className="btn btn-primary" style={{ fontSize:'0.78rem', padding:'0.35rem 0.85rem' }}
              onClick={() => photoFileRef.current?.click()} disabled={uploading}>
              {uploading ? '⏳…' : '+ Photo / Video'}
            </button>
          )}
          {tab === 'reports' && (
            <button type="button" className="btn btn-primary" style={{ fontSize:'0.78rem', padding:'0.35rem 0.85rem' }}
              onClick={() => setShowReportForm(v=>!v)}>
              + Daily Report
            </button>
          )}
        </div>
      </div>

      {/* ── PHOTOS TAB ── */}
      {tab === 'photos' && (
        <>
          {/* Photo upload form */}
          {showPhotoForm && pending && (
            <div className="pfeed-upload-form">
              <div className="pfeed-upload-preview">
                {pending.mediaType === 'video'
                  ? <video src={pending.dataUrl} controls className="pfeed-media-preview" />
                  : <img src={pending.dataUrl} alt="preview" className="pfeed-media-preview" />}
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                <div style={{ fontSize:'0.72rem', color:'var(--muted)' }}>
                  {pending.mediaType==='video'?'🎬':'🖼'} {pending.fileName} · {pending.fileSize}
                </div>
                <label style={{ display:'flex',flexDirection:'column',gap:'0.2rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase' }}>
                  Caption *
                  <input className="status-select" style={{ width:'100%' }} placeholder="Describe what's shown…"
                    value={photoForm.caption} onChange={e=>setPhotoForm(p=>({...p,caption:e.target.value}))} />
                </label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
                  {[['Location','location','Grid / area','text'],['Posted By','postedBy','','text']] .map(([label,key,ph,type]) => (
                    <label key={key} style={{ display:'flex',flexDirection:'column',gap:'0.2rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase' }}>
                      {label}
                      <input type={type} className="status-select" style={{ width:'100%' }} placeholder={ph}
                        value={(photoForm as Record<string,string>)[key]}
                        onChange={e=>setPhotoForm(p=>({...p,[key]:e.target.value}))} />
                    </label>
                  ))}
                  <label style={{ display:'flex',flexDirection:'column',gap:'0.2rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase' }}>
                    Category
                    <select className="status-select" style={{ width:'100%' }} value={photoForm.category}
                      onChange={e=>setPhotoForm(p=>({...p,category:e.target.value as PostCategory}))}>
                      {Object.keys(CAT_COLORS).map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label style={{ display:'flex',flexDirection:'column',gap:'0.2rem',fontSize:'0.75rem',color:'var(--muted)',fontWeight:600,textTransform:'uppercase' }}>
                    Date
                    <input type="date" className="status-select" style={{ width:'100%' }} value={photoForm.date}
                      onChange={e=>setPhotoForm(p=>({...p,date:e.target.value}))} />
                  </label>
                </div>
                <div style={{ display:'flex', gap:'0.5rem' }}>
                  <button type="button" className="btn btn-primary" onClick={submitPhoto} disabled={!photoForm.caption.trim()}>✔ Publish</button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setPending(null); setShowPhotoForm(false); }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {filteredPhotos.length === 0 ? (
            <div className="pfeed-empty">
              <div style={{ fontSize:'2.5rem' }}>📷</div>
              <div style={{ fontWeight:600, margin:'0.5rem 0 0.25rem' }}>No photos yet</div>
              <div style={{ fontSize:'0.82rem', color:'var(--muted)' }}>Click <strong>+ Photo / Video</strong> to post the first site update.</div>
            </div>
          ) : (
            <div className={`pfeed-grid${compact?' pfeed-grid--compact':''}`}>
              {visiblePhotos.map(post => (
                <div key={post.id} className="pfeed-post" onClick={() => setLightbox(post)}>
                  <div className="pfeed-thumb">
                    {post.mediaType === 'video'
                      ? <div className="pfeed-video-thumb"><video src={post.dataUrl} className="pfeed-thumb-media" muted /><div className="pfeed-play-icon">▶</div></div>
                      : <img src={post.dataUrl} alt={post.caption} className="pfeed-thumb-media" />}
                    <div className="pfeed-cat-badge" style={{ background: CAT_COLORS[post.category] }}>{post.category}</div>
                  </div>
                  <div className="pfeed-post-info">
                    <div className="pfeed-post-caption">{post.caption}</div>
                    <div className="pfeed-post-meta">
                      <span>📅 {post.date}</span>
                      {post.location && <span>📍 {post.location}</span>}
                      <span>👤 {post.postedBy}</span>
                      <button type="button" className="pfeed-delete" onClick={e=>{e.stopPropagation();deletePost(post.id);}}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {compact && filteredPhotos.length > maxVisible && (
            <div className="pfeed-show-more">
              <button type="button" className="btn-ghost" style={{ fontSize:'0.78rem', width:'100%', padding:'0.45rem' }}
                onClick={() => setShowAll(v=>!v)}>
                {showAll ? '▲ Show less' : `▼ Show all ${filteredPhotos.length} photos`}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── REPORTS TAB ── */}
      {tab === 'reports' && (
        <>
          {showReportForm && (
            <DailyReportForm projectManager={projectManager}
              onSave={r => { setReports(p => [r, ...p]); setShowReportForm(false); }}
              onCancel={() => setShowReportForm(false)} />
          )}

          {filteredReports.length === 0 ? (
            <div className="pfeed-empty">
              <div style={{ fontSize:'2.5rem' }}>📋</div>
              <div style={{ fontWeight:600, margin:'0.5rem 0 0.25rem' }}>No reports yet</div>
              <div style={{ fontSize:'0.82rem', color:'var(--muted)' }}>Click <strong>+ Daily Report</strong> to log the first report with attachments.</div>
            </div>
          ) : (
            <div style={{ padding:'0.75rem', display:'flex', flexDirection:'column', gap:'0.6rem' }}>
              {filteredReports.map(r => (
                <ReportCard key={r.id} report={r} onDelete={() => deleteReport(r.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="pfeed-lightbox" onClick={() => setLightbox(null)}>
          <div className="pfeed-lightbox-inner" onClick={e=>e.stopPropagation()}>
            <button type="button" className="pfeed-lightbox-close" onClick={() => setLightbox(null)}>✕</button>
            {lightbox.mediaType === 'video'
              ? <video src={lightbox.dataUrl} controls autoPlay className="pfeed-lightbox-media" />
              : <img src={lightbox.dataUrl} alt={lightbox.caption} className="pfeed-lightbox-media" />}
            <div className="pfeed-lightbox-meta">
              <div style={{ fontWeight:700, fontSize:'0.95rem', marginBottom:'0.4rem' }}>{lightbox.caption}</div>
              <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', fontSize:'0.78rem', color:'var(--muted)' }}>
                <span style={{ color:CAT_COLORS[lightbox.category], fontWeight:600 }}>● {lightbox.category}</span>
                <span>📅 {lightbox.date} {lightbox.time}</span>
                {lightbox.location && <span>📍 {lightbox.location}</span>}
                <span>👤 {lightbox.postedBy}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
