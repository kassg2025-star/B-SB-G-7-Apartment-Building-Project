import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useProject } from '../store/projectStore';

// ── Types ────────────────────────────────────────────────────────────────────
interface OrgNode {
  id: string;
  title: string;
  name: string;
  department: string;
  phone?: string;
  email?: string;
  color: string; // accent color for the card top border
  level: number; // hierarchy level (0 = PM)
}

// ── Org chart structure definition ──────────────────────────────────────────
// Layout: PM at top → 3 direct reports → sub-levels below each

const DEPT_COLORS = {
  management:   '#d4a017', // gold
  engineering:  '#4a9eff', // blue
  site:         '#4caf82', // green
  safety:       '#e05c5c', // red
  finance:      '#b06fd8', // purple
  procurement:  '#e8a838', // orange
  security:     '#8fa3bc', // steel
};

// Hierarchy: id, title, name, department, color, level
// plus parentId for connection drawing
const ORG_NODES: (OrgNode & { parentId: string | null; children?: string[] })[] = [
  // Level 0 — PM
  { id:'pm',    title:'Project Manager',                name:'Eng. Kasaye Getachew Abebe', department:'Management',    color: DEPT_COLORS.management,   level:0, parentId:null,   phone:'+251911000001', email:'pm@kassasons.com' },

  // Level 1 — Direct reports to PM
  { id:'se',    title:'Site Engineer',                  name:'Eng. Abebe Worku',           department:'Engineering',   color: DEPT_COLORS.engineering,  level:1, parentId:'pm',   phone:'+251911000002', email:'se@kassasons.com' },
  { id:'oe',    title:'Office Engineer',                name:'Eng. Tigist Haile',          department:'Engineering',   color: DEPT_COLORS.engineering,  level:1, parentId:'pm',   phone:'+251911000003', email:'oe@kassasons.com' },
  { id:'safety',title:'Safety Engineer (HSE)',         name:'Ato Dawit Mekonen',          department:'HSE & Safety',  color: DEPT_COLORS.safety,       level:1, parentId:'pm',   phone:'+251911000004', email:'hse@kassasons.com' },
  { id:'fin',   title:'Project Finance & Administration',name:'Ato Yonas Tesfaye',        department:'Finance & Admin',color: DEPT_COLORS.finance,      level:1, parentId:'pm',   phone:'+251911000005', email:'finance@kassasons.com' },

  // Level 2 — Reports to Site Engineer
  { id:'gf',    title:'General Foreman',               name:'Ato Bekele Girma',           department:'Site Operations',color: DEPT_COLORS.site,         level:2, parentId:'se',   phone:'+251911000006', email:'' },

  // Level 3 — Reports to General Foreman
  { id:'gc1',   title:'Gang Chief — Excavation',       name:'Ato Hailu Tesfaye',          department:'Site Operations',color: DEPT_COLORS.site,         level:3, parentId:'gf',   phone:'+251911000007', email:'' },
  { id:'gc2',   title:'Gang Chief — Concrete & Rebar', name:'Ato Fikadu Dereje',          department:'Site Operations',color: DEPT_COLORS.site,         level:3, parentId:'gf',   phone:'+251911000008', email:'' },
  { id:'gc3',   title:'Gang Chief — Formwork & Finish',name:'Ato Selam Tadesse',          department:'Site Operations',color: DEPT_COLORS.site,         level:3, parentId:'gf',   phone:'+251911000009', email:'' },

  // Level 2 — Reports to Finance
  { id:'pur',   title:'Purchaser',                     name:'Ato Meron Alemu',            department:'Procurement',   color: DEPT_COLORS.procurement,  level:2, parentId:'fin',  phone:'+251911000010', email:'purchase@kassasons.com' },
  { id:'sec',   title:'Security Guard (Lead)',          name:'Ato Girma Bekele',           department:'Security',      color: DEPT_COLORS.security,     level:2, parentId:'fin',  phone:'+251911000011', email:'' },
];

// ── OrgCard component ────────────────────────────────────────────────────────
function OrgCard({ node, isSelected, onClick, isEditing, onSave, onCancel }:
  { node: OrgNode & { parentId: string|null };
    isSelected: boolean;
    onClick: () => void;
    isEditing: boolean;
    onSave: (updated: Partial<OrgNode>) => void;
    onCancel: () => void;
  }) {
  const [editName,  setEditName]  = useState(node.name);
  const [editTitle, setEditTitle] = useState(node.title);
  const [editPhone, setEditPhone] = useState(node.phone ?? '');
  const [editEmail, setEditEmail] = useState(node.email ?? '');

  if (isEditing) {
    return (
      <div className="org-card org-card--editing" style={{ borderTopColor: node.color }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'0.3rem' }}>
          <input className="status-select" style={{ fontSize:'0.78rem', width:'100%' }} value={editTitle} onChange={e=>setEditTitle(e.target.value)} placeholder="Title" />
          <input className="status-select" style={{ fontSize:'0.78rem', width:'100%' }} value={editName}  onChange={e=>setEditName(e.target.value)}  placeholder="Name" />
          <input className="status-select" style={{ fontSize:'0.78rem', width:'100%' }} value={editPhone} onChange={e=>setEditPhone(e.target.value)} placeholder="Phone" />
          <input className="status-select" style={{ fontSize:'0.78rem', width:'100%' }} value={editEmail} onChange={e=>setEditEmail(e.target.value)} placeholder="Email" />
          <div style={{ display:'flex', gap:'0.4rem', marginTop:'0.25rem' }}>
            <button type="button" className="btn btn-primary"   style={{ flex:1, padding:'0.25rem', fontSize:'0.72rem' }}
              onClick={()=>onSave({ title:editTitle, name:editName, phone:editPhone, email:editEmail })}>✔ Save</button>
            <button type="button" className="btn btn-secondary" style={{ flex:1, padding:'0.25rem', fontSize:'0.72rem' }}
              onClick={onCancel}>✕</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`org-card${isSelected?' org-card--selected':''}`}
      style={{ borderTopColor: node.color }}
      onClick={onClick}
      title="Click to select / edit">
      <div className="org-card__dept" style={{ color: node.color }}>{node.department}</div>
      <div className="org-card__title">{node.title}</div>
      <div className="org-card__name">{node.name}</div>
      {node.phone && <div className="org-card__contact">📞 {node.phone}</div>}
      {node.email && <div className="org-card__contact">✉ {node.email}</div>}
    </div>
  );
}

// ── SVG connector helper ─────────────────────────────────────────────────────
// We render the tree level-by-level. Connectors are drawn in a separate SVG overlay.
// For simplicity we use CSS flexbox for layout and draw vertical/horizontal lines as
// pseudo-elements in CSS rather than a full D3 tree.

// ── Main Page ────────────────────────────────────────────────────────────────
export default function OrgChart() {
  const project = useProject();
  const [nodes, setNodes] = useState(ORG_NODES);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [editingId, setEditingId] = useState<string|null>(null);

  const updateNode = (id: string, patch: Partial<OrgNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n));
    setEditingId(null);
  };

  const printOrgChart = () => {
    const rows = nodes.map(n => `<tr><td>${n.title}</td><td>${n.name}</td><td>${n.department}</td><td>${n.phone??''}</td><td>${n.email??''}</td><td>${nodes.find(p=>p.id===n.parentId)?.title??'—'}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Org Chart — ${project.contractId}</title>
    <style>body{font-family:Arial,sans-serif;font-size:9pt;padding:1cm}h2{text-align:center;font-size:13pt}h3{text-align:center;font-size:10pt;color:#444}table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#1a3a5c;color:#fff;padding:5px 8px;text-align:left;font-size:8pt}td{padding:4px 8px;border-bottom:1px solid #ddd;font-size:8pt}@page{size:A4;margin:1cm}</style>
    </head><body><h2>${project.contractor}</h2><h3>PROJECT ORGANISATION CHART — ${project.contractId}</h3>
    <table><thead><tr><th>Title</th><th>Name</th><th>Department</th><th>Phone</th><th>Email</th><th>Reports To</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script></body></html>`;
    const w=window.open('','_blank','width=900,height=600');
    if(!w)return;
    w.document.write(html);
    w.document.close();
  };

  // Build level groups
  const byLevel: (typeof ORG_NODES[0])[][] = [];
  nodes.forEach(n => {
    if (!byLevel[n.level]) byLevel[n.level] = [];
    byLevel[n.level].push(n);
  });

  // Build parent→children map
  const childrenOf = (id: string) => nodes.filter(n => n.parentId === id);

  // Recursive tree renderer
  const renderBranch = (node: typeof ORG_NODES[0], isLast: boolean, depth: number): React.ReactNode => {
    const children = childrenOf(node.id);
    return (
      <div key={node.id} className="org-branch">
        {/* vertical line from parent (except root) */}
        <div className="org-branch__node">
          <OrgCard
            node={node}
            isSelected={selectedId === node.id}
            isEditing={editingId === node.id}
            onClick={() => { setSelectedId(node.id); setEditingId(null); }}
            onSave={(patch) => updateNode(node.id, patch)}
            onCancel={() => setEditingId(null)}
          />
          {selectedId === node.id && editingId !== node.id && (
            <div className="org-card__actions">
              <button type="button" className="btn-ghost" style={{ fontSize:'0.7rem', padding:'0.2rem 0.55rem' }}
                onClick={(e) => { e.stopPropagation(); setEditingId(node.id); }}>✎ Edit</button>
            </div>
          )}
        </div>
        {children.length > 0 && (
          <div className={`org-children org-children--${children.length}`}>
            {children.map((child, i) => renderBranch(child, i === children.length - 1, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const root = nodes.find(n => n.parentId === null);

  // Stats
  const deptCounts = nodes.reduce<Record<string, number>>((acc, n) => {
    acc[n.department] = (acc[n.department] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Project Organisation Chart"
        subtitle={`${project.name} — ${project.contractor}`}
      />

      {/* Header strip */}
      <div className="exec-strip" style={{ marginBottom:'1.25rem' }}>
        <span>Total Staff: <strong>{nodes.length}</strong></span>
        <span>PM: <strong>{project.projectManager}</strong></span>
        <span>Contract: <strong>{project.contractId}</strong></span>
        <span style={{ marginLeft:'auto' }}>
          <button type="button" className="btn btn-secondary" style={{ fontSize:'0.78rem', padding:'0.3rem 0.75rem' }}
            onClick={printOrgChart}>🖨 Print / Export</button>
        </span>
      </div>

      {/* Department legend */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', marginBottom:'1.5rem' }}>
        {Object.entries(deptCounts).map(([dept, count]) => {
          const color = nodes.find(n => n.department === dept)?.color ?? 'var(--muted)';
          return (
            <div key={dept} style={{ display:'flex', alignItems:'center', gap:'0.4rem', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'0.3rem 0.75rem', fontSize:'0.75rem' }}>
              <div style={{ width:10, height:10, borderRadius:2, background:color }} />
              <span>{dept}</span>
              <span style={{ color:'var(--muted)', fontSize:'0.7rem' }}>({count})</span>
            </div>
          );
        })}
      </div>

      {/* Org chart tree */}
      <div className="card" style={{ overflowX:'auto', padding:'2rem' }}>
        <div className="org-tree">
          {root && renderBranch(root, true, 0)}
        </div>
        <p style={{ fontSize:'0.72rem', color:'var(--muted)', marginTop:'1.5rem', textAlign:'center' }}>
          Click any card to select · Click ✎ Edit to update name, title, phone or email
        </p>
      </div>

      {/* Staff directory table */}
      <div className="card" style={{ marginTop:'1.25rem' }}>
        <div className="section-title">Staff Directory</div>
        <div style={{ overflowX:'auto' }}>
          <table className="data-table" style={{ fontSize:'0.8rem' }}>
            <thead>
              <tr><th>#</th><th>Title / Role</th><th>Name</th><th>Department</th><th>Reports To</th><th>Phone</th><th>Email</th><th></th></tr>
            </thead>
            <tbody>
              {nodes.map((n, i) => {
                const parent = nodes.find(p => p.id === n.parentId);
                return (
                  <tr key={n.id} style={{ background: selectedId === n.id ? 'rgba(212,160,23,0.08)' : undefined }}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight:600 }}>{n.title}</td>
                    <td>{n.name}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:n.color, flexShrink:0 }} />
                        {n.department}
                      </div>
                    </td>
                    <td style={{ color:'var(--muted)', fontSize:'0.75rem' }}>{parent?.title ?? '—'}</td>
                    <td style={{ fontSize:'0.75rem' }}>{n.phone ?? '—'}</td>
                    <td style={{ fontSize:'0.75rem', color:'var(--muted)' }}>{n.email || '—'}</td>
                    <td>
                      <button type="button" className="btn-ghost" style={{ fontSize:'0.7rem', padding:'0.15rem 0.4rem' }}
                        onClick={() => { setSelectedId(n.id); setEditingId(n.id); }}>✎</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
