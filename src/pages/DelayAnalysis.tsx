import { useState, useId } from 'react';
import ExcelImport from '../components/ExcelImport';
import PageHeader from '../components/PageHeader';
import { pct } from '../data/projectData';
import { useProject } from '../store/projectStore';
import type { DelayEvent } from '../data/projectData';

function blankEvent(id: string): DelayEvent {
  return { id, event: '', startDate: '', endDate: null, daysClaimed: 0, category: '', status: 'Active' };
}

export default function DelayAnalysis() {
  const project = useProject();
  const uid = useId();

  const [events, setEvents] = useState<DelayEvent[]>([...project.delayEvents]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DelayEvent>(() => blankEvent('DE-NEW'));

  const allEvents = events;
  const totalClaimed = allEvents.reduce((s, e) => s + e.daysClaimed, 0);
  const last = project.progress.monthly[project.progress.monthly.length - 1];

  const nextId = () => `DE-${String(events.length + 1).padStart(3, '0')}`;

  const openAdd = () => { setForm(blankEvent(nextId())); setEditId(null); setShowForm(true); };
  const openEdit = (e: DelayEvent) => { setForm({ ...e }); setEditId(e.id); setShowForm(true); };
  const deleteEvent = (id: string) => setEvents(prev => prev.filter(e => e.id !== id));

  const handleSave = () => {
    if (editId) setEvents(prev => prev.map(e => e.id === editId ? form : e));
    else setEvents(prev => [...prev, form]);
    setShowForm(false);
  };

  const f = (field: keyof DelayEvent, val: string | number | null) =>
    setForm(prev => ({ ...prev, [field]: val }));

  const handleImport = (records: Record<string, string>[]) => {
    const imported: DelayEvent[] = records.filter(r => r['ID'] && r['Event']).map(r => ({
      id:          r['ID'] ?? '',
      event:       r['Event'] ?? '',
      startDate:   r['StartDate'] ?? '',
      endDate:     r['EndDate'] || null,
      daysClaimed: parseInt(r['DaysClaimed'] ?? '0') || 0,
      category:    r['Category'] ?? '',
      status:      (r['Status'] as DelayEvent['status']) ?? 'Active',
    }));
    setEvents(prev => [...prev, ...imported]);
  };

  return (
    <>
      <PageHeader
        title="Delay Analysis"
        subtitle="Root cause quantification & contractual entitlement mapping"
        badge={{ text: `${project.eot.claimedDays}-Day EOT`, variant: 'warning' }}
      />

      <ExcelImport
        moduleId="delay"
        label="Import Delay Events (Excel / CSV)"
        templateColumns={['ID','Event','StartDate','EndDate','DaysClaimed','Category','Status']}
        templateRows={[['DE-006','New delay event','2026-06-01','','5','Geological','Active']]}
        onImport={handleImport}
      />

      {/* KPIs */}
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card kpi-danger">
          <div className="card-label">Cumulative Variance</div>
          <div className="card-value">{pct(last.variance)}</div>
        </div>
        <div className="card kpi-warning">
          <div className="card-label">Delay Events</div>
          <div className="card-value">{allEvents.length}</div>
          <div className="card-sub">{allEvents.filter(e => e.status === 'Ongoing' || e.status === 'Active').length} active</div>
        </div>
        <div className="card kpi-accent">
          <div className="card-label">Total Days Claimed</div>
          <div className="card-value">{totalClaimed}</div>
          <div className="card-sub">EOT submission: {project.eot.claimedDays} days</div>
        </div>
        <div className="card">
          <div className="card-label">Reconciliation</div>
          <div className="card-value sm">{totalClaimed >= project.eot.claimedDays ? '✓ Covered' : '⚠ Gap'}</div>
          <div className="card-sub">{totalClaimed - project.eot.claimedDays > 0 ? `+${totalClaimed - project.eot.claimedDays}d buffer` : `${totalClaimed - project.eot.claimedDays}d shortfall`}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="sched-toolbar" style={{ marginBottom: '1rem' }}>
        <div />
        <div className="sched-actions">
          <button type="button" className="btn btn-primary" onClick={openAdd}>+ Add Delay Event</button>
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.25rem', borderColor: 'var(--accent)' }}>
          <div className="section-title">{editId ? `Edit ${editId}` : 'New Delay Event'}</div>
          <div className="rr-form-grid" style={{ marginTop: '0.75rem' }}>
            <label style={{ display:'flex', flexDirection:'column', gap:'0.3rem', fontSize:'0.78rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
              ID
              <input className="status-select" style={{ width:'100%' }} value={form.id} onChange={e => f('id', e.target.value)} />
            </label>
            <label style={{ display:'flex', flexDirection:'column', gap:'0.3rem', fontSize:'0.78rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
              Category
              <input className="status-select" style={{ width:'100%' }} placeholder="Geological, Environmental…" value={form.category} onChange={e => f('category', e.target.value)} />
            </label>
            <label style={{ display:'flex', flexDirection:'column', gap:'0.3rem', fontSize:'0.78rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
              Start Date
              <input type="date" className="status-select" style={{ width:'100%' }} value={form.startDate} onChange={e => f('startDate', e.target.value)} />
            </label>
            <label style={{ display:'flex', flexDirection:'column', gap:'0.3rem', fontSize:'0.78rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
              End Date (blank = ongoing)
              <input type="date" className="status-select" style={{ width:'100%' }} value={form.endDate ?? ''} onChange={e => f('endDate', e.target.value || null)} />
            </label>
            <label style={{ display:'flex', flexDirection:'column', gap:'0.3rem', fontSize:'0.78rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
              Days Claimed
              <input type="number" className="status-select" style={{ width:'100%' }} value={form.daysClaimed} onChange={e => f('daysClaimed', parseInt(e.target.value) || 0)} />
            </label>
            <label style={{ display:'flex', flexDirection:'column', gap:'0.3rem', fontSize:'0.78rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
              Status
              <select className="status-select" style={{ width:'100%' }} value={form.status} onChange={e => f('status', e.target.value as DelayEvent['status'])}>
                {(['Active','Ongoing','Resolved'] as DelayEvent['status'][]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <label htmlFor={`${uid}-event`} style={{ display:'block', marginTop:'0.75rem', fontSize:'0.78rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
            Event Description
            <textarea id={`${uid}-event`} className="rr-textarea" rows={2} style={{ marginTop:'0.3rem' }} value={form.event} onChange={e => f('event', e.target.value)} />
          </label>
          <div style={{ display:'flex', gap:'0.75rem', marginTop:'1rem' }}>
            <button type="button" className="btn btn-primary" onClick={handleSave}>Save</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Event register table */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-title">Delay Event Register ({allEvents.length} events · {totalClaimed} days total)</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Event</th><th>Category</th><th>Start</th><th>End</th><th>Days</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {allEvents.map((e) => (
                <tr key={e.id}>
                  <td><strong>{e.id}</strong></td>
                  <td style={{ maxWidth: 240, fontSize: '0.82rem' }}>{e.event}</td>
                  <td><span className="tag">{e.category}</span></td>
                  <td>{e.startDate}</td>
                  <td>{e.endDate ?? <span style={{ color:'var(--warning)' }}>Ongoing</span>}</td>
                  <td className="variance-neg"><strong>{e.daysClaimed}</strong></td>
                  <td>
                    <span className={`badge badge-${e.status === 'Resolved' ? 'success' : e.status === 'Active' || e.status === 'Ongoing' ? 'warning' : 'muted'}`}>
                      {e.status}
                    </span>
                  </td>
                  <td style={{ whiteSpace:'nowrap' }}>
                    <button type="button" className="btn-ghost" style={{ fontSize:'0.7rem', padding:'0.2rem 0.5rem' }} onClick={() => openEdit(e)}>✎</button>
                    <button type="button" className="btn-ghost" style={{ fontSize:'0.7rem', padding:'0.2rem 0.5rem', marginLeft:4 }} onClick={() => deleteEvent(e.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roadblocks */}
      <div className="card">
        <div className="section-title">Persistent Site Disruptions — Entitlement Basis</div>
        <div className="roadblock-list">
          {project.roadblocks.map((r) => (
            <div className="roadblock-item" key={r.id}>
              <div className="roadblock-header">
                <h4>{r.id}. {r.title}</h4>
                <span className="tag">{r.category}</span>
                <span className="delay-days">+{r.delayDays} days</span>
              </div>
              <p>{r.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
