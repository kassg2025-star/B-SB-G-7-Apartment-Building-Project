/**
 * Site Progress Card — photo & video uploads of on-site work.
 * Self-contained card for the Executive Dashboard.
 */
import { useState, useRef, useEffect } from 'react';

export type PostCategory = 'Excavation' | 'Concrete' | 'Rebar' | 'Formwork' | 'HSE' | 'Equipment' | 'General';

export interface SitePost {
  id: string; date: string; time: string;
  caption: string; location: string;
  category: PostCategory; postedBy: string;
  mediaType: 'photo' | 'video';
  dataUrl: string; fileName: string; fileSize: string;
}

const CAT_COLORS: Record<PostCategory, string> = {
  Excavation:'#e8a838', Concrete:'#4a9eff', Rebar:'#e05c5c',
  Formwork:'#4caf82',   HSE:'#d4a017',      Equipment:'#b06fd8', General:'#8fa3bc',
};

const STORAGE_KEY = 'kassa-site-progress';
const load = (): SitePost[] => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; } };
const save = (d: SitePost[]) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch { /**/ } };

const todayStr = () => new Date().toISOString().substring(0, 10);
const nowTime  = () => new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });

export default function SiteProgressCard({ projectManager, compact = true, maxVisible = 6 }:
  { projectManager: string; compact?: boolean; maxVisible?: number }) {

  const [posts, setPosts]       = useState<SitePost[]>(load);
  const [showForm, setShowForm] = useState(false);
  const [lightbox, setLightbox] = useState<SitePost | null>(null);
  const [filterCat, setFilter]  = useState<'All' | PostCategory>('All');
  const [showAll, setShowAll]   = useState(false);
  const [uploading, setUp]      = useState(false);
  const [pending, setPending]   = useState<Pick<SitePost,'dataUrl'|'mediaType'|'fileName'|'fileSize'> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    caption:'', location:'', category:'General' as PostCategory,
    postedBy: projectManager, date: todayStr(), time: nowTime(),
  });

  useEffect(() => { save(posts); }, [posts]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUp(true);
    const r = new FileReader();
    r.onload = ev => {
      setPending({ dataUrl: ev.target?.result as string,
        mediaType: file.type.startsWith('video/') ? 'video' : 'photo',
        fileName: file.name, fileSize: `${(file.size/1024/1024).toFixed(2)} MB` });
      setUp(false); setShowForm(true);
    };
    r.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const publish = () => {
    if (!pending || !form.caption.trim()) return;
    setPosts(p => [{ id:`SP-${Date.now()}`, ...form, ...pending }, ...p]);
    setPending(null); setShowForm(false);
    setForm(p => ({ ...p, caption:'', location:'' }));
  };

  const del = (id: string) => setPosts(p => p.filter(x => x.id !== id));

  const filtered = posts.filter(p => filterCat === 'All' || p.category === filterCat);
  const visible  = showAll ? filtered : filtered.slice(0, maxVisible);
  const todayCount = posts.filter(p => p.date === todayStr()).length;

  return (
    <div className="card" style={{ display:'flex', flexDirection:'column', gap:0, padding:0, overflow:'hidden' }}>
      {/* Card header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap',
        gap:'0.5rem', padding:'0.85rem 1.1rem', background:'var(--surface-2)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
          <span style={{ fontSize:'1rem' }}>📷</span>
          <span style={{ fontWeight:700, fontSize:'0.92rem' }}>Site Progress Feed</span>
          <span style={{ fontSize:'0.68rem', color:'var(--muted)' }}>Photos & Videos</span>
          <span style={{ fontSize:'0.68rem', background:'var(--surface-3)', border:'1px solid var(--border)',
            borderRadius:999, padding:'0.1rem 0.5rem', color:'var(--muted)' }}>{posts.length}</span>
          {todayCount > 0 && <span className="badge badge-success" style={{ fontSize:'0.62rem' }}>+{todayCount} today</span>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', flexWrap:'wrap' }}>
          <select className="status-select" style={{ fontSize:'0.7rem', padding:'0.2rem 0.4rem' }}
            value={filterCat} onChange={e => setFilter(e.target.value as typeof filterCat)}>
            <option value="All">All</option>
            {Object.keys(CAT_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display:'none' }} onChange={pick} />
          <button type="button" className="btn btn-primary" style={{ fontSize:'0.72rem', padding:'0.28rem 0.7rem' }}
            onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? '⏳' : '+ Photo / Video'}
          </button>
        </div>
      </div>

      {/* Upload form */}
      {showForm && pending && (
        <div style={{ padding:'0.85rem 1.1rem', borderBottom:'1px solid var(--border)', background:'var(--surface-2)',
          display:'flex', gap:'0.85rem', flexWrap:'wrap' }}>
          <div style={{ width:130, flexShrink:0, borderRadius:'var(--radius)', overflow:'hidden', background:'var(--bg)', border:'1px solid var(--border)' }}>
            {pending.mediaType === 'video'
              ? <video src={pending.dataUrl} style={{ width:'100%', height:90, objectFit:'cover', display:'block' }} muted />
              : <img src={pending.dataUrl} alt="preview" style={{ width:'100%', height:90, objectFit:'cover', display:'block' }} />}
          </div>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'0.45rem' }}>
            <div style={{ fontSize:'0.68rem', color:'var(--muted)' }}>{pending.fileName} · {pending.fileSize}</div>
            <input className="status-select" style={{ width:'100%' }} placeholder="Caption *"
              value={form.caption} onChange={e => setForm(p=>({...p,caption:e.target.value}))} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.35rem' }}>
              <input className="status-select" placeholder="Location" value={form.location}
                onChange={e => setForm(p=>({...p,location:e.target.value}))} />
              <select className="status-select" value={form.category}
                onChange={e => setForm(p=>({...p,category:e.target.value as PostCategory}))}>
                {Object.keys(CAT_COLORS).map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <input type="date" className="status-select" value={form.date}
                onChange={e => setForm(p=>({...p,date:e.target.value}))} />
            </div>
            <div style={{ display:'flex', gap:'0.5rem' }}>
              <button type="button" className="btn btn-primary" style={{ fontSize:'0.75rem', padding:'0.3rem 0.75rem' }}
                onClick={publish} disabled={!form.caption.trim()}>✔ Publish</button>
              <button type="button" className="btn btn-secondary" style={{ fontSize:'0.75rem', padding:'0.3rem 0.75rem' }}
                onClick={() => { setPending(null); setShowForm(false); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ padding:'2rem', textAlign:'center', color:'var(--muted)', fontSize:'0.82rem' }}>
          <div style={{ fontSize:'2rem', marginBottom:'0.4rem' }}>📷</div>
          No photos yet — click <strong>+ Photo / Video</strong> to post the first update.
        </div>
      ) : (
        <div style={{ padding:'0.75rem', display:'grid',
          gridTemplateColumns:'repeat(auto-fill, minmax(130px,1fr))', gap:'0.6rem' }}>
          {visible.map(post => (
            <div key={post.id} style={{ borderRadius:'var(--radius)', overflow:'hidden', background:'var(--surface-2)',
              border:'1px solid var(--border)', cursor:'pointer', transition:'border-color 0.15s, transform 0.1s' }}
              onClick={() => setLightbox(post)}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='var(--accent)'; (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLElement).style.transform=''; }}>
              {/* Thumb */}
              <div style={{ position:'relative', paddingTop:'65%', background:'var(--bg)', overflow:'hidden' }}>
                {post.mediaType === 'video'
                  ? <><video src={post.dataUrl} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} muted />
                     <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
                       width:28, height:28, borderRadius:'50%', background:'rgba(0,0,0,0.65)', display:'flex',
                       alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'0.7rem' }}>▶</div></>
                  : <img src={post.dataUrl} alt={post.caption} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />}
                <div style={{ position:'absolute', top:4, left:4, background:CAT_COLORS[post.category],
                  color:'#fff', fontSize:'0.55rem', fontWeight:700, padding:'1px 5px', borderRadius:3 }}>
                  {post.category}</div>
              </div>
              {/* Info */}
              <div style={{ padding:'0.4rem 0.5rem' }}>
                <div style={{ fontSize:'0.72rem', fontWeight:600, lineHeight:1.3, marginBottom:'0.2rem',
                  overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as never }}>
                  {post.caption}</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.62rem', color:'var(--muted)' }}>
                  <span>📅 {post.date}</span>
                  <button type="button" onClick={e=>{e.stopPropagation();del(post.id);}}
                    style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:'0.62rem', padding:'0 2px' }}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show more */}
      {filtered.length > maxVisible && (
        <div style={{ padding:'0.4rem 0.75rem', borderTop:'1px solid var(--border)' }}>
          <button type="button" className="btn-ghost" style={{ width:'100%', fontSize:'0.75rem', padding:'0.35rem' }}
            onClick={() => setShowAll(v=>!v)}>
            {showAll ? '▲ Show less' : `▼ Show all ${filtered.length} photos`}
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', backdropFilter:'blur(4px)' }}
          onClick={() => setLightbox(null)}>
          <div style={{ position:'relative', background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:'var(--radius)', overflow:'hidden', maxWidth:'min(900px,95vw)', maxHeight:'92vh',
            display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setLightbox(null)}
              style={{ position:'absolute', top:10, right:10, zIndex:2, background:'rgba(0,0,0,0.6)',
                border:'none', color:'#fff', width:32, height:32, borderRadius:'50%', cursor:'pointer', fontSize:'0.85rem' }}>✕</button>
            {lightbox.mediaType === 'video'
              ? <video src={lightbox.dataUrl} controls autoPlay style={{ maxWidth:'100%', maxHeight:'72vh', objectFit:'contain', background:'#000' }} />
              : <img src={lightbox.dataUrl} alt={lightbox.caption} style={{ maxWidth:'100%', maxHeight:'72vh', objectFit:'contain', background:'#000', display:'block' }} />}
            <div style={{ padding:'0.85rem 1.25rem', borderTop:'1px solid var(--border)', background:'var(--surface-2)' }}>
              <div style={{ fontWeight:700, fontSize:'0.9rem', marginBottom:'0.3rem' }}>{lightbox.caption}</div>
              <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', fontSize:'0.75rem', color:'var(--muted)' }}>
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
