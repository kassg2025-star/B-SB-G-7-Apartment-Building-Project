import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import ExcelImport from '../components/ExcelImport';
import { useProject, useProjectStore } from '../store/projectStore';
import { formatETB } from '../data/projectData';

type Tab = 'identity' | 'dates' | 'financial' | 'progress';

export default function ProjectSettings() {
  const project          = useProject();
  const setProjectFields = useProjectStore((s) => s.setProjectFields);
  const reset            = useProjectStore((s) => s.resetToPreloaded);

  const [tab,   setTab]   = useState<Tab>('identity');
  const [saved, setSaved] = useState(false);

  const [identity, setIdentity] = useState({
    name:           project.name,
    location:       project.location,
    contractId:     project.contractId,
    employer:       project.employer,
    consultant:     project.consultant,
    contractor:     project.contractor,
    projectManager: project.projectManager,
  });

  const [dates, setDates] = useState({
    contractSigning:      project.dates.contractSigning,
    siteCommencement:     project.dates.siteCommencement,
    originalCompletion:   project.dates.originalCompletion,
    contractDurationDays: String(project.dates.contractDurationDays),
    daysElapsed:          String(project.dates.daysElapsed),
    daysRemaining:        String(project.dates.daysRemaining),
  });

  const [financial, setFinancial] = useState({
    originalContractValue: String(project.financial.originalContractValue),
    advancePayment:        String(project.financial.advancePayment),
    ipc01Certified:        String(project.financial.ipc01Certified),
    ipc02Estimate:         String(project.financial.ipc02Estimate),
    currency:              project.financial.currency,
  });

  const [progress, setProgress] = useState({
    status:            project.progress.status,
    spi:               String(project.progress.spi),
    cpi:               String(project.progress.cpi),
    currentActual:     String(project.progress.currentActual),
    currentPlanned:    String(project.progress.currentPlanned),
    eotClaimedDays:    String(project.eot.claimedDays),
    eotStatus:         project.eot.status,
    revisedCompletion: project.eot.revisedCompletionEstimate,
  });

  const handleSave = () => {
    setProjectFields({
      name:           identity.name,
      location:       identity.location,
      contractId:     identity.contractId,
      employer:       identity.employer,
      consultant:     identity.consultant,
      contractor:     identity.contractor,
      projectManager: identity.projectManager,
      dates: {
        ...project.dates,
        contractSigning:      dates.contractSigning,
        siteCommencement:     dates.siteCommencement,
        originalCompletion:   dates.originalCompletion,
        contractDurationDays: parseInt(dates.contractDurationDays) || project.dates.contractDurationDays,
        daysElapsed:          parseInt(dates.daysElapsed)          || project.dates.daysElapsed,
        daysRemaining:        parseInt(dates.daysRemaining)        || project.dates.daysRemaining,
      },
      financial: {
        originalContractValue: parseFloat(financial.originalContractValue) || project.financial.originalContractValue,
        advancePayment:        parseFloat(financial.advancePayment)        || project.financial.advancePayment,
        ipc01Certified:        parseFloat(financial.ipc01Certified)        || project.financial.ipc01Certified,
        ipc02Estimate:         parseFloat(financial.ipc02Estimate)         || project.financial.ipc02Estimate,
        currency:              financial.currency,
      },
      progress: {
        ...project.progress,
        status:         progress.status,
        spi:            parseFloat(progress.spi)            || project.progress.spi,
        cpi:            parseFloat(progress.cpi)            || project.progress.cpi,
        currentActual:  parseFloat(progress.currentActual)  || project.progress.currentActual,
        currentPlanned: parseFloat(progress.currentPlanned) || project.progress.currentPlanned,
      },
      eot: {
        ...project.eot,
        claimedDays:               parseInt(progress.eotClaimedDays) || project.eot.claimedDays,
        status:                    progress.eotStatus,
        revisedCompletionEstimate: progress.revisedCompletion,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Field = ({ label, value, onChange, type = 'text', wide = false }:
    { label: string; value: string; onChange: (v: string) => void; type?: string; wide?: boolean }) => (
    <label style={{
      display: 'flex', flexDirection: 'column', gap: '0.3rem',
      fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.04em',
      gridColumn: wide ? '1 / -1' : undefined,
    }}>
      {label}
      <input type={type} className="status-select"
        style={{ width: '100%', padding: '0.45rem 0.65rem', fontSize: '0.875rem', color: 'var(--text)' }}
        value={value} onChange={e => onChange(e.target.value)} />
    </label>
  );

  return (
    <>
      <PageHeader
        title="Project Settings"
        subtitle="Edit project identity, dates, financials and progress — changes update all modules instantly"
      />

      <div className="sched-toolbar" style={{ marginBottom: '1.5rem' }}>
        <div className="sched-tabs">
          {([
            ['identity',  '🏗 Identity'],
            ['dates',     '📅 Dates'],
            ['financial', '💰 Financial'],
            ['progress',  '📊 Progress & EOT'],
          ] as [Tab, string][]).map(([id, lbl]) => (
            <button key={id} type="button"
              className={`sched-tab${tab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}>{lbl}
            </button>
          ))}
        </div>
        <div className="sched-actions">
          <button type="button" className="btn btn-primary" onClick={handleSave}>💾 Save Changes</button>
          <button type="button" className="btn btn-secondary" onClick={() => { reset(); setSaved(false); }}>↺ Reset to Default</button>
        </div>
      </div>

      {saved && (
        <div className="alert-item alert-success" style={{ marginBottom: '1rem' }}>
          <strong>✔ Settings saved</strong>
          <p>All modules now reflect the updated project data.</p>
        </div>
      )}

      {tab === 'identity' && (
        <div className="card">
          <div className="section-title">Project Identity</div>
          <ExcelImport
            moduleId="settings-identity"
            label="Import Project Info from Excel / CSV (single-row)"
            templateColumns={['Name','Location','ContractID','Employer','Consultant','Contractor','ProjectManager']}
            templateRows={[['B+SB+G+7 Commercial Building','Addis Ababa','KAS/AA/YK/2026/002','Ato Alemu Mamo','Adey Engineering','Kassa & Sons Construction PLC','Eng. Kasaye Getachew Abebe']]}
            onImport={(records) => {
              const r = records[0]; if (!r) return;
              setIdentity(p => ({
                name:           r['Name']           ?? p.name,
                location:       r['Location']       ?? p.location,
                contractId:     r['ContractID']     ?? p.contractId,
                employer:       r['Employer']       ?? p.employer,
                consultant:     r['Consultant']     ?? p.consultant,
                contractor:     r['Contractor']     ?? p.contractor,
                projectManager: r['ProjectManager'] ?? p.projectManager,
              }));
            }}
          />
          <div className="rr-form-grid" style={{ marginTop: '1rem' }}>
            <Field label="Project Name"    value={identity.name}           onChange={v => setIdentity(p => ({ ...p, name: v }))}           wide />
            <Field label="Location"        value={identity.location}       onChange={v => setIdentity(p => ({ ...p, location: v }))} />
            <Field label="Contract ID"     value={identity.contractId}     onChange={v => setIdentity(p => ({ ...p, contractId: v }))} />
            <Field label="Employer"        value={identity.employer}       onChange={v => setIdentity(p => ({ ...p, employer: v }))} />
            <Field label="Consultant"      value={identity.consultant}     onChange={v => setIdentity(p => ({ ...p, consultant: v }))} />
            <Field label="Contractor"      value={identity.contractor}     onChange={v => setIdentity(p => ({ ...p, contractor: v }))} />
            <Field label="Project Manager" value={identity.projectManager} onChange={v => setIdentity(p => ({ ...p, projectManager: v }))} />
          </div>
        </div>
      )}

      {tab === 'dates' && (
        <div className="card">
          <div className="section-title">Contract Dates & Duration</div>
          <ExcelImport
            moduleId="settings-dates"
            label="Import Dates from Excel / CSV (single-row)"
            templateColumns={['ContractSigning','SiteCommencement','OriginalCompletion','DurationDays','DaysElapsed','DaysRemaining']}
            templateRows={[['December 23, 2025','January 20, 2026','January 27, 2027','365','129','236']]}
            onImport={(records) => {
              const r = records[0]; if (!r) return;
              setDates(p => ({
                contractSigning:      r['ContractSigning']    ?? p.contractSigning,
                siteCommencement:     r['SiteCommencement']   ?? p.siteCommencement,
                originalCompletion:   r['OriginalCompletion'] ?? p.originalCompletion,
                contractDurationDays: r['DurationDays']       ?? p.contractDurationDays,
                daysElapsed:          r['DaysElapsed']        ?? p.daysElapsed,
                daysRemaining:        r['DaysRemaining']      ?? p.daysRemaining,
              }));
            }}
          />
          <div className="rr-form-grid" style={{ marginTop: '1rem' }}>
            <Field label="Contract Signing"         value={dates.contractSigning}      onChange={v => setDates(p => ({ ...p, contractSigning: v }))} />
            <Field label="Site Commencement"        value={dates.siteCommencement}     onChange={v => setDates(p => ({ ...p, siteCommencement: v }))} />
            <Field label="Original Completion"      value={dates.originalCompletion}   onChange={v => setDates(p => ({ ...p, originalCompletion: v }))} />
            <Field label="Contract Duration (days)" value={dates.contractDurationDays} type="number" onChange={v => setDates(p => ({ ...p, contractDurationDays: v }))} />
            <Field label="Days Elapsed"             value={dates.daysElapsed}          type="number" onChange={v => setDates(p => ({ ...p, daysElapsed: v }))} />
            <Field label="Days Remaining"           value={dates.daysRemaining}        type="number" onChange={v => setDates(p => ({ ...p, daysRemaining: v }))} />
          </div>
        </div>
      )}

      {tab === 'financial' && (
        <div className="card">
          <div className="section-title">Financial Values (ETB)</div>
          <ExcelImport
            moduleId="settings-financial"
            label="Import Financial Values from Excel / CSV (single-row)"
            templateColumns={['ContractValue','AdvancePayment','IPC01Certified','IPC02Estimate','Currency']}
            templateRows={[['76881056.13','15400000','4196828','1709980','ETB']]}
            onImport={(records) => {
              const r = records[0]; if (!r) return;
              setFinancial(p => ({
                originalContractValue: r['ContractValue']  ?? p.originalContractValue,
                advancePayment:        r['AdvancePayment'] ?? p.advancePayment,
                ipc01Certified:        r['IPC01Certified'] ?? p.ipc01Certified,
                ipc02Estimate:         r['IPC02Estimate']  ?? p.ipc02Estimate,
                currency:              r['Currency']       ?? p.currency,
              }));
            }}
          />
          <div className="rr-form-grid" style={{ marginTop: '1rem' }}>
            <Field label="Original Contract Value (ETB)" value={financial.originalContractValue} type="number" onChange={v => setFinancial(p => ({ ...p, originalContractValue: v }))} wide />
            <Field label="Advance Payment (ETB)"         value={financial.advancePayment}        type="number" onChange={v => setFinancial(p => ({ ...p, advancePayment: v }))} />
            <Field label="IPC-01 Certified (ETB)"        value={financial.ipc01Certified}        type="number" onChange={v => setFinancial(p => ({ ...p, ipc01Certified: v }))} />
            <Field label="IPC-02 Estimate (ETB)"         value={financial.ipc02Estimate}         type="number" onChange={v => setFinancial(p => ({ ...p, ipc02Estimate: v }))} />
            <Field label="Currency"                      value={financial.currency}              onChange={v => setFinancial(p => ({ ...p, currency: v }))} />
          </div>
          <div className="exec-strip" style={{ marginTop: '1.25rem' }}>
            <span>Contract: <strong>{formatETB(parseFloat(financial.originalContractValue) || 0)} ETB</strong></span>
            <span>Advance: <strong>{formatETB(parseFloat(financial.advancePayment) || 0)} ETB</strong></span>
            <span>IPC-01: <strong>{formatETB(parseFloat(financial.ipc01Certified) || 0)} ETB</strong></span>
            <span>IPC-02 Est.: <strong>{formatETB(parseFloat(financial.ipc02Estimate) || 0)} ETB</strong></span>
          </div>
        </div>
      )}

      {tab === 'progress' && (
        <div className="card">
          <div className="section-title">Progress Indicators & EOT</div>
          <div className="rr-form-grid" style={{ marginTop: '0.5rem' }}>
            <Field label="Status"              value={progress.status}            onChange={v => setProgress(p => ({ ...p, status: v }))} />
            <Field label="SPI"                 value={progress.spi}               type="number" onChange={v => setProgress(p => ({ ...p, spi: v }))} />
            <Field label="CPI"                 value={progress.cpi}               type="number" onChange={v => setProgress(p => ({ ...p, cpi: v }))} />
            <Field label="Actual % (current)"  value={progress.currentActual}     type="number" onChange={v => setProgress(p => ({ ...p, currentActual: v }))} />
            <Field label="Planned % (current)" value={progress.currentPlanned}    type="number" onChange={v => setProgress(p => ({ ...p, currentPlanned: v }))} />
            <Field label="EOT Claimed Days"    value={progress.eotClaimedDays}    type="number" onChange={v => setProgress(p => ({ ...p, eotClaimedDays: v }))} />
            <Field label="EOT Status"          value={progress.eotStatus}         onChange={v => setProgress(p => ({ ...p, eotStatus: v }))} />
            <Field label="Revised Completion"  value={progress.revisedCompletion} onChange={v => setProgress(p => ({ ...p, revisedCompletion: v }))} wide />
          </div>
        </div>
      )}
    </>
  );
}
