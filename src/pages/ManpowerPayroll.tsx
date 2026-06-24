import { useState, useId, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import ExcelImport from '../components/ExcelImport';
import { useProject } from '../store/projectStore';
import { formatETB } from '../data/projectData';

// ── Types ───────────────────────────────────────────────────────────────────
export type Grade = 'Unskilled' | 'Semi-Skilled' | 'Skilled' | 'Foreman' | 'Supervisor' | 'Engineer';
export type AttStat = 'P' | 'A' | 'H' | 'L' | 'HD'; // Present/Absent/Holiday/Leave/HalfDay

export interface Worker {
  id: string; name: string; grade: Grade; position: string;
  tinNo: string; penNo: string;
  basicSalary: number; transportAllowance: number; housingAllowance: number;
}
export interface AttRow { date: string; workerId: string; status: AttStat; normalHrs: number; otHrs: number; note: string; }

// ── Ethiopian Income Tax Bands (ERCA) ───────────────────────────────────────
function incomeTax(taxable: number): number {
  if (taxable <= 600)    return 0;
  if (taxable <= 1650)   return (taxable - 600)   * 0.10;
  if (taxable <= 3200)   return 105    + (taxable - 1650) * 0.15;
  if (taxable <= 5250)   return 337.5  + (taxable - 3200) * 0.20;
  if (taxable <= 7800)   return 747.5  + (taxable - 5250) * 0.25;
  if (taxable <= 10900)  return 1385   + (taxable - 7800)  * 0.30;
  return 2315 + (taxable - 10900) * 0.35;
}

export function calcPayroll(w: Worker, att: AttRow[], period: string) {
  const presentDays = att.filter(a => a.status === 'P').length
                    + att.filter(a => a.status === 'HD').length * 0.5;
  const absentDays  = att.filter(a => a.status === 'A').length;
  const totalOtHrs  = att.reduce((s, a) => s + a.otHrs, 0);
  const workDays    = att.filter(a => a.status !== 'H').length;

  const dailyRate   = w.basicSalary / 26;
  const hourlyRate  = w.basicSalary / (26 * 8);
  const proratedBasic = dailyRate * presentDays;
  const otPay         = totalOtHrs * hourlyRate * 1.25;

  // Taxable: basic + housing; transport exempt up to 400 ETB
  const taxableTransport = Math.max(0, w.transportAllowance - 400);
  const taxable   = proratedBasic + w.housingAllowance + taxableTransport;
  const tax       = incomeTax(taxable);
  const empPension = proratedBasic * 0.07;
  const erPension  = proratedBasic * 0.11;

  const grossSalary  = proratedBasic + w.transportAllowance + w.housingAllowance;
  const totalGross   = grossSalary + otPay;
  const netPay       = totalGross - tax - empPension;

  return { workerId: w.id, period,
    basicSalary: proratedBasic, transportAllowance: w.transportAllowance,
    housingAllowance: w.housingAllowance, otPay, grossSalary, totalGross,
    incomeTax: tax, employeePension: empPension, employerPension: erPension,
    netPay, workDays, absentDays, otHours: totalOtHrs };
}

// ── Seed data ───────────────────────────────────────────────────────────────
const SEED_WORKERS: Worker[] = [
  { id:'W01', name:'Bekele Girma',   grade:'Foreman',      position:'Site Foreman',       tinNo:'001234567', penNo:'PEN001', basicSalary:8500,  transportAllowance:400, housingAllowance:800 },
  { id:'W02', name:'Tigist Alemu',   grade:'Skilled',      position:'Steel Fixer',        tinNo:'001234568', penNo:'PEN002', basicSalary:5200,  transportAllowance:400, housingAllowance:500 },
  { id:'W03', name:'Hailu Tesfaye',  grade:'Semi-Skilled', position:'Concrete Worker',    tinNo:'001234569', penNo:'PEN003', basicSalary:3800,  transportAllowance:400, housingAllowance:400 },
  { id:'W04', name:'Meron Tadesse',  grade:'Unskilled',    position:'General Labourer',   tinNo:'001234570', penNo:'PEN004', basicSalary:2400,  transportAllowance:400, housingAllowance:300 },
  { id:'W05', name:'Dawit Kebede',   grade:'Semi-Skilled', position:'Mason',              tinNo:'001234571', penNo:'PEN005', basicSalary:3800,  transportAllowance:400, housingAllowance:400 },
  { id:'W06', name:'Selam Haile',    grade:'Unskilled',    position:'General Labourer',   tinNo:'001234572', penNo:'PEN006', basicSalary:2400,  transportAllowance:400, housingAllowance:300 },
  { id:'W07', name:'Yonas Mengistu', grade:'Skilled',      position:'Carpenter',          tinNo:'001234573', penNo:'PEN007', basicSalary:5500,  transportAllowance:400, housingAllowance:500 },
  { id:'W08', name:'Hanna Worku',    grade:'Unskilled',    position:'General Labourer',   tinNo:'001234574', penNo:'PEN008', basicSalary:2400,  transportAllowance:400, housingAllowance:300 },
  { id:'W09', name:'Abebe Chala',    grade:'Skilled',      position:'Electrician',        tinNo:'001234575', penNo:'PEN009', basicSalary:5200,  transportAllowance:400, housingAllowance:500 },
  { id:'W10', name:'Fikadu Dereje',  grade:'Foreman',      position:'Conc. Foreman',      tinNo:'001234576', penNo:'PEN010', basicSalary:7800,  transportAllowance:400, housingAllowance:700 },
];

function seedAttendance(workers: Worker[], yr: number, mo: number): AttRow[] {
  const rows: AttRow[] = [];
  const dim = new Date(yr, mo, 0).getDate();
  const statuses: AttStat[] = ['P','P','P','P','P','P','A','P','P','P','P','HD','P','P','P','P','P','P','P','P','P','P','P','A','P','P','P','P','P','P','P'];
  workers.forEach(w => {
    for (let d = 1; d <= dim; d++) {
      const dow = new Date(yr, mo - 1, d).getDay();
      if (dow === 0) continue;
      const dateStr = `${yr}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const st = statuses[(d + parseInt(w.id.slice(1))) % statuses.length];
      const ot = st === 'P' && d % 5 === 0 ? 2 : 0;
      rows.push({ date: dateStr, workerId: w.id, status: st, normalHrs: st === 'HD' ? 4 : st === 'P' ? 8 : 0, otHrs: ot, note: '' });
    }
  });
  return rows;
}

// ── Period helpers ───────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const todayIso = () => new Date().toISOString().substring(0,10);

// ── Attendance Sheet Component ───────────────────────────────────────────────
function AttendanceSheet({ workers, attendance, setAttendance, yr, mo }:
  { workers: Worker[]; attendance: AttRow[]; setAttendance: (a: AttRow[]) => void; yr: number; mo: number }) {

  const dim = new Date(yr, mo, 0).getDate();
  const days = Array.from({ length: dim }, (_, i) => {
    const d = i + 1;
    const dateStr = `${yr}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow = new Date(yr, mo - 1, d).getDay();
    return { d, dateStr, isSun: dow === 0, isSat: dow === 6 };
  }).filter(x => !x.isSun);

  const getCell = (wid: string, dateStr: string) =>
    attendance.find(a => a.workerId === wid && a.date === dateStr) ??
    { date: dateStr, workerId: wid, status: 'P' as AttStat, normalHrs: 8, otHrs: 0, note: '' };

  const setCell = (wid: string, dateStr: string, field: keyof AttRow, val: string | number) => {
    setAttendance(attendance.map(a =>
      a.workerId === wid && a.date === dateStr ? { ...a, [field]: val } : a
    ).concat(
      attendance.some(a => a.workerId === wid && a.date === dateStr) ? [] :
      [{ date: dateStr, workerId: wid, status: field === 'status' ? val as AttStat : 'P',
         normalHrs: 8, otHrs: 0, note: '', [field]: val }]
    ));
  };

  const statColors: Record<AttStat, string> = {
    P: 'var(--success)', A: 'var(--danger)', H: 'var(--muted)', L: 'var(--warning)', HD: 'var(--accent)'
  };

  // Summary per worker
  const summary = (wid: string) => {
    const rows = attendance.filter(a => a.workerId === wid);
    return {
      P: rows.filter(a => a.status === 'P').length,
      A: rows.filter(a => a.status === 'A').length,
      HD: rows.filter(a => a.status === 'HD').length,
      OT: rows.reduce((s, a) => s + a.otHrs, 0),
    };
  };

  return (
    <div style={{ overflowX: 'auto', fontSize: '0.72rem' }}>
      <table className="data-table" style={{ minWidth: 900, borderCollapse: 'collapse', fontSize: '0.7rem' }}>
        <thead>
          <tr>
            <th style={{ minWidth: 130, position: 'sticky', left: 0, background: 'var(--surface-2)', zIndex: 2 }}>Worker</th>
            <th style={{ minWidth: 80 }}>Position</th>
            {days.map(({ d, dateStr, isSat }) => (
              <th key={dateStr} style={{ minWidth: 32, textAlign: 'center', color: isSat ? 'var(--accent)' : 'inherit', padding: '0.3rem 0.15rem' }}>
                {d}<br /><span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>{['S','M','T','W','T','F','S'][new Date(yr, mo-1, d).getDay()]}</span>
              </th>
            ))}
            <th style={{ minWidth: 32, textAlign: 'center' }}>P</th>
            <th style={{ minWidth: 32, textAlign: 'center' }}>A</th>
            <th style={{ minWidth: 32, textAlign: 'center' }}>HD</th>
            <th style={{ minWidth: 40, textAlign: 'center' }}>OT hrs</th>
          </tr>
        </thead>
        <tbody>
          {workers.map(w => {
            const sum = summary(w.id);
            return (
              <tr key={w.id}>
                <td style={{ position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1, fontWeight: 600 }}>{w.name}</td>
                <td style={{ color: 'var(--muted)', fontSize: '0.68rem' }}>{w.position}</td>
                {days.map(({ dateStr }) => {
                  const cell = getCell(w.id, dateStr);
                  return (
                    <td key={dateStr} style={{ textAlign: 'center', padding: '0.1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <select
                          value={cell.status}
                          onChange={e => setCell(w.id, dateStr, 'status', e.target.value)}
                          style={{ width: 28, fontSize: '0.62rem', background: `${statColors[cell.status]}22`,
                            border: `1px solid ${statColors[cell.status]}`, color: statColors[cell.status],
                            borderRadius: 3, padding: '1px', cursor: 'pointer', fontWeight: 700 }}>
                          {(['P','A','H','L','HD'] as AttStat[]).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input type="number" min={0} max={6} value={cell.otHrs}
                          onChange={e => setCell(w.id, dateStr, 'otHrs', parseFloat(e.target.value) || 0)}
                          style={{ width: 28, fontSize: '0.6rem', background: 'var(--surface-2)',
                            border: '1px solid var(--border)', borderRadius: 3, padding: '1px', textAlign: 'center', color: cell.otHrs > 0 ? 'var(--accent)' : 'var(--muted)' }}
                          placeholder="OT" title="OT hours" />
                      </div>
                    </td>
                  );
                })}
                <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 700 }}>{sum.P}</td>
                <td style={{ textAlign: 'center', color: 'var(--danger)',  fontWeight: 700 }}>{sum.A}</td>
                <td style={{ textAlign: 'center', color: 'var(--accent)',  fontWeight: 700 }}>{sum.HD}</td>
                <td style={{ textAlign: 'center', color: 'var(--warning)', fontWeight: 700 }}>{sum.OT}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem', fontSize: '0.72rem' }}>
        {([['P','Present','var(--success)'],['A','Absent','var(--danger)'],['H','Holiday','var(--muted)'],['L','Leave','var(--warning)'],['HD','Half-Day','var(--accent)']] as [string,string,string][]).map(([k,l,c]) => (
          <span key={k} style={{ color: c }}><strong>{k}</strong> = {l}</span>
        ))}
        <span style={{ color: 'var(--accent)', marginLeft: '0.5rem' }}>Bottom cell = OT hours</span>
      </div>
    </div>
  );
}

// ── Payroll Table Component ──────────────────────────────────────────────────
function PayrollTable({ workers, payrolls }: { workers: Worker[]; payrolls: ReturnType<typeof calcPayroll>[] }) {
  const totals = payrolls.reduce((acc, p) => ({
    basic:      acc.basic      + p.basicSalary,
    transport:  acc.transport  + p.transportAllowance,
    housing:    acc.housing    + p.housingAllowance,
    ot:         acc.ot         + p.otPay,
    gross:      acc.gross      + p.totalGross,
    tax:        acc.tax        + p.incomeTax,
    empPen:     acc.empPen     + p.employeePension,
    erPen:      acc.erPen      + p.employerPension,
    net:        acc.net        + p.netPay,
  }), { basic:0, transport:0, housing:0, ot:0, gross:0, tax:0, empPen:0, erPen:0, net:0 });

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ fontSize: '0.75rem', minWidth: 900 }}>
        <thead>
          <tr>
            <th>#</th><th>Name</th><th>Grade</th><th>TIN</th>
            <th>Basic (ETB)</th><th>Transport</th><th>Housing</th>
            <th>OT Pay</th><th>Gross</th>
            <th>Income Tax</th><th>Emp. Pension<br/>(7%)</th><th>Er. Pension<br/>(11%)</th>
            <th>Net Pay</th><th>Days</th><th>Absent</th><th>OT hrs</th>
          </tr>
        </thead>
        <tbody>
          {payrolls.map((p, i) => {
            const w = workers.find(x => x.id === p.workerId);
            return (
              <tr key={p.workerId}>
                <td>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{w?.name}</td>
                <td><span className="tag">{w?.grade}</span></td>
                <td style={{ color: 'var(--muted)', fontSize: '0.68rem' }}>{w?.tinNo}</td>
                <td>{formatETB(p.basicSalary)}</td>
                <td>{formatETB(p.transportAllowance)}</td>
                <td>{formatETB(p.housingAllowance)}</td>
                <td style={{ color: 'var(--accent)' }}>{formatETB(p.otPay)}</td>
                <td style={{ fontWeight: 600 }}>{formatETB(p.totalGross)}</td>
                <td style={{ color: 'var(--danger)' }}>{formatETB(p.incomeTax)}</td>
                <td style={{ color: 'var(--warning)' }}>{formatETB(p.employeePension)}</td>
                <td style={{ color: 'var(--muted)' }}>{formatETB(p.employerPension)}</td>
                <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatETB(p.netPay)}</td>
                <td>{p.workDays}</td>
                <td style={{ color: p.absentDays > 0 ? 'var(--danger)' : 'inherit' }}>{p.absentDays}</td>
                <td style={{ color: p.otHours > 0 ? 'var(--accent)' : 'inherit' }}>{p.otHours}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
            <td colSpan={4}>TOTALS</td>
            <td>{formatETB(totals.basic)}</td>
            <td>{formatETB(totals.transport)}</td>
            <td>{formatETB(totals.housing)}</td>
            <td style={{ color: 'var(--accent)' }}>{formatETB(totals.ot)}</td>
            <td>{formatETB(totals.gross)}</td>
            <td style={{ color: 'var(--danger)' }}>{formatETB(totals.tax)}</td>
            <td style={{ color: 'var(--warning)' }}>{formatETB(totals.empPen)}</td>
            <td style={{ color: 'var(--muted)' }}>{formatETB(totals.erPen)}</td>
            <td style={{ color: 'var(--success)', fontSize: '0.9rem' }}>{formatETB(totals.net)}</td>
            <td colSpan={3} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Print payroll ────────────────────────────────────────────────────────────
function printPayroll(workers: Worker[], payrolls: ReturnType<typeof calcPayroll>[], project: ReturnType<typeof useProject>, period: string) {
  const totals = payrolls.reduce((acc, p) => ({
    gross: acc.gross + p.totalGross, tax: acc.tax + p.incomeTax,
    pen: acc.pen + p.employeePension, net: acc.net + p.netPay,
  }), { gross: 0, tax: 0, pen: 0, net: 0 });

  const rows = payrolls.map((p, i) => {
    const w = workers.find(x => x.id === p.workerId)!;
    return `<tr>
      <td>${i+1}</td><td>${w.name}</td><td>${w.grade}</td><td>${w.tinNo}</td>
      <td>${formatETB(p.basicSalary)}</td><td>${formatETB(p.transportAllowance)}</td>
      <td>${formatETB(p.housingAllowance)}</td><td>${formatETB(p.otPay)}</td>
      <td><strong>${formatETB(p.totalGross)}</strong></td>
      <td>${formatETB(p.incomeTax)}</td><td>${formatETB(p.employeePension)}</td>
      <td>${formatETB(p.employerPension)}</td>
      <td><strong>${formatETB(p.netPay)}</strong></td>
      <td style="text-align:center">${p.workDays}</td><td style="text-align:center">${p.absentDays}</td>
      <td style="text-align:center">${p.otHours}</td><td>_____________</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>Payroll — ${period}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 9pt; color: #000; margin: 0; padding: 1cm; }
    h2 { text-align: center; font-size: 13pt; margin: 0; }
    h3 { text-align: center; font-size: 10pt; margin: 2px 0 8px; color: #333; }
    .meta { display: flex; justify-content: space-between; font-size: 8pt; margin-bottom: 8px; border-bottom: 1px solid #999; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #1a3a5c; color: #fff; padding: 4px 3px; font-size: 8pt; text-align: left; }
    td { padding: 3px; border-bottom: 1px solid #ddd; font-size: 8pt; }
    tfoot td { font-weight: bold; border-top: 2px solid #333; background: #f5f5f5; }
    .footer { margin-top: 20px; display: flex; justify-content: space-between; font-size: 8pt; }
    .sig { border-top: 1px solid #333; width: 160px; text-align: center; padding-top: 4px; }
    @page { size: A3 landscape; margin: 1cm; }
  </style></head><body>
  <h2>${project.contractor}</h2>
  <h3>PAYROLL SHEET — ${period.toUpperCase()}</h3>
  <div class="meta">
    <span>Project: ${project.name}</span>
    <span>Contract: ${project.contractId}</span>
    <span>Prepared by: ${project.projectManager}</span>
    <span>Date: ${new Date().toLocaleDateString('en-GB')}</span>
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>Name</th><th>Grade</th><th>TIN No.</th>
      <th>Basic (ETB)</th><th>Transport</th><th>Housing</th>
      <th>OT Pay</th><th>Total Gross</th>
      <th>Income Tax</th><th>Emp Pension (7%)</th><th>Er Pension (11%)</th>
      <th>Net Pay</th><th>W.Days</th><th>Abs.</th><th>OT hrs</th><th>Signature</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="4">TOTALS</td>
      <td colspan="4"></td>
      <td>${formatETB(totals.gross)}</td>
      <td>${formatETB(totals.tax)}</td>
      <td>${formatETB(totals.pen)}</td>
      <td></td>
      <td>${formatETB(totals.net)}</td>
      <td colspan="4"></td>
    </tr></tfoot>
  </table>
  <div class="footer">
    <div class="sig">Prepared by<br/>${project.projectManager}</div>
    <div class="sig">Checked by<br/>Finance Officer</div>
    <div class="sig">Approved by<br/>Project Director</div>
  </div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=1100,height=700');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

// ── Print Attendance Sheet ───────────────────────────────────────────────────
function printAttendance(workers: Worker[], attendance: AttRow[], project: ReturnType<typeof useProject>, period: string, yr: number, mo: number) {
  const dim = new Date(yr, mo, 0).getDate();
  const days = Array.from({ length: dim }, (_, i) => {
    const d = i + 1;
    const dow = new Date(yr, mo - 1, d).getDay();
    return { d, dow };
  }).filter(x => x.dow !== 0);

  const dayHeaders = days.map(({ d, dow }) =>
    `<th style="min-width:18px;text-align:center;font-size:7pt">${d}<br/>${['S','M','T','W','T','F','S'][dow]}</th>`
  ).join('');

  const statColor: Record<AttStat, string> = { P:'#2e7d32', A:'#c62828', H:'#888', L:'#e65100', HD:'#1565c0' };

  const workerRows = workers.map((w, i) => {
    const cells = days.map(({ d }) => {
      const dateStr = `${yr}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const att = attendance.find(a => a.workerId === w.id && a.date === dateStr);
      const st = att?.status ?? 'P';
      const ot = att?.otHrs ?? 0;
      return `<td style="text-align:center;padding:1px;font-size:7pt">
        <div style="color:${statColor[st] ?? '#000'};font-weight:bold">${st}</div>
        ${ot > 0 ? `<div style="color:#b8890f;font-size:6pt">${ot}h</div>` : ''}
      </td>`;
    }).join('');
    const pCount = attendance.filter(a => a.workerId === w.id && a.status === 'P').length;
    const aCount = attendance.filter(a => a.workerId === w.id && a.status === 'A').length;
    const otTotal = attendance.filter(a => a.workerId === w.id).reduce((s, a) => s + a.otHrs, 0);
    return `<tr>
      <td style="font-size:8pt">${i+1}</td>
      <td style="font-size:8pt;font-weight:bold;min-width:110px">${w.name}</td>
      <td style="font-size:7pt">${w.position}</td>
      ${cells}
      <td style="text-align:center;font-weight:bold;color:#2e7d32">${pCount}</td>
      <td style="text-align:center;font-weight:bold;color:#c62828">${aCount}</td>
      <td style="text-align:center;color:#b8890f">${otTotal}</td>
      <td style="min-width:70px">_________</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>Attendance — ${period}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:9pt;margin:0;padding:0.8cm}
    h2{text-align:center;font-size:12pt;margin:0}
    h3{text-align:center;font-size:9pt;margin:2px 0 6px;color:#333}
    .meta{display:flex;justify-content:space-between;font-size:8pt;border-bottom:1px solid #999;padding-bottom:4px;margin-bottom:6px}
    table{width:100%;border-collapse:collapse}
    th{background:#1a3a5c;color:#fff;padding:3px 2px;font-size:8pt}
    td{border:1px solid #ddd;padding:2px;vertical-align:middle}
    .footer{display:flex;justify-content:space-between;margin-top:16px;font-size:8pt}
    .sig{border-top:1px solid #333;width:140px;text-align:center;padding-top:3px}
    @page{size:A3 landscape;margin:0.8cm}
  </style></head><body>
  <h2>${project.contractor}</h2>
  <h3>ATTENDANCE SHEET — ${period.toUpperCase()}</h3>
  <div class="meta">
    <span>Project: ${project.name}</span>
    <span>Contract: ${project.contractId}</span>
    <span>Prepared: ${new Date().toLocaleDateString('en-GB')}</span>
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>Name</th><th>Position</th>${dayHeaders}
      <th>P</th><th>A</th><th>OT hrs</th><th>Signature</th>
    </tr></thead>
    <tbody>${workerRows}</tbody>
  </table>
  <div style="font-size:7pt;margin-top:6px">
    <strong>Key:</strong> P=Present · A=Absent · H=Holiday · L=Leave · HD=Half-Day · OT=Overtime hrs
  </div>
  <div class="footer">
    <div class="sig">Prepared by<br/>${project.projectManager}</div>
    <div class="sig">Checked by<br/>HR / Admin</div>
    <div class="sig">Approved by<br/>Site Manager</div>
  </div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script>
  </body></html>`;

  const win = window.open('', '_blank', 'width=1100,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

// ── Main Page ────────────────────────────────────────────────────────────────
type MPTab = 'attendance' | 'payroll' | 'reports';

export default function ManpowerPayroll() {
  const project = useProject();
  const uid = useId();

  const now = new Date();
  const [tab, setTab] = useState<MPTab>('attendance');
  const [selYr, setSelYr] = useState(now.getFullYear());
  const [selMo, setSelMo] = useState(now.getMonth() + 1);
  const [workers, setWorkers] = useState<Worker[]>(SEED_WORKERS);
  const [attendance, setAttendance] = useState<AttRow[]>(() => seedAttendance(SEED_WORKERS, now.getFullYear(), now.getMonth() + 1));
  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [workerForm, setWorkerForm] = useState<Worker>({ id:'', name:'', grade:'Unskilled', position:'', tinNo:'', penNo:'', basicSalary:0, transportAllowance:400, housingAllowance:300 });

  const period = `${MONTHS[selMo - 1]} ${selYr}`;

  // Filter attendance for selected period
  const periodAtt = attendance.filter(a => {
    const d = new Date(a.date);
    return d.getFullYear() === selYr && (d.getMonth() + 1) === selMo;
  });

  // Payrolls for selected period
  const payrolls = useMemo(() =>
    workers.map(w => calcPayroll(w, periodAtt.filter(a => a.workerId === w.id), period)),
    [workers, periodAtt, period]
  );

  const totalNet   = payrolls.reduce((s, p) => s + p.netPay, 0);
  const totalGross = payrolls.reduce((s, p) => s + p.totalGross, 0);
  const totalOtPay = payrolls.reduce((s, p) => s + p.otPay, 0);
  const totalTax   = payrolls.reduce((s, p) => s + p.incomeTax, 0);
  const totalPen   = payrolls.reduce((s, p) => s + p.employeePension + p.employerPension, 0);
  const presentToday = periodAtt.filter(a => a.date === todayIso() && a.status === 'P').length;

  // Text report generators
  const generateDailyReport = () => {
    const dateStr = todayIso();
    const todayAtt = attendance.filter(a => a.date === dateStr);
    const present = todayAtt.filter(a => a.status === 'P').length;
    const absent  = todayAtt.filter(a => a.status === 'A').length;
    const otHrs   = todayAtt.reduce((s, a) => s + a.otHrs, 0);
    let s = `${project.contractor}\nDAILY MANPOWER REPORT — ${dateStr}\nProject: ${project.name}\n${'─'.repeat(60)}\n\n`;
    s += `Present : ${present} workers\nAbsent  : ${absent} workers\nOT Hours: ${otHrs} hrs\n\n`;
    s += `ATTENDANCE DETAIL\n${'─'.repeat(60)}\n`;
    workers.forEach(w => {
      const a = todayAtt.find(x => x.workerId === w.id);
      const st = a?.status ?? '—';
      const ot = a?.otHrs ?? 0;
      s += `${w.name.padEnd(22)} ${w.position.padEnd(20)} ${st}${ot > 0 ? ` OT:${ot}h` : ''}\n`;
    });
    s += `\nPrepared by: ${project.projectManager}`;
    return s;
  };

  const generateWeeklyReport = () => {
    const day = now.getDay() || 7;
    const mon = new Date(now); mon.setDate(now.getDate() - day + 1); mon.setHours(0,0,0,0);
    const weekDates: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(mon); d.setDate(mon.getDate() + i);
      weekDates.push(d.toISOString().substring(0,10));
    }
    const weekAtt = attendance.filter(a => weekDates.includes(a.date));
    let s = `${project.contractor}\nWEEKLY MANPOWER REPORT\nWeek: ${weekDates[0]} to ${weekDates[weekDates.length-1]}\nProject: ${project.name}\n${'─'.repeat(72)}\n\n`;
    s += `${'Worker'.padEnd(22)} ${'Grade'.padEnd(14)} P  A  OT hrs  Cost Est.\n${'─'.repeat(72)}\n`;
    workers.forEach(w => {
      const wa = weekAtt.filter(a => a.workerId === w.id);
      const p = wa.filter(a => a.status === 'P').length;
      const ab = wa.filter(a => a.status === 'A').length;
      const ot = wa.reduce((s, a) => s + a.otHrs, 0);
      const dailyRate = w.basicSalary / 26;
      const cost = p * dailyRate + ot * (w.basicSalary / (26*8)) * 1.25;
      s += `${w.name.padEnd(22)} ${w.grade.padEnd(14)} ${String(p).padEnd(3)}${String(ab).padEnd(3)}${String(ot).padEnd(7)} ${formatETB(cost)} ETB\n`;
    });
    s += `\nPrepared by: ${project.projectManager}`;
    return s;
  };

  const generateMonthlyReport = () => {
    let s = `${project.contractor}\nMONTHLY MANPOWER & PAYROLL SUMMARY — ${period.toUpperCase()}\nProject: ${project.name} | Contract: ${project.contractId}\n${'─'.repeat(72)}\n\n`;
    s += `Total Workers    : ${workers.length}\n`;
    s += `Total Man-Days   : ${payrolls.reduce((sum, p) => sum + p.workDays, 0)}\n`;
    s += `Total OT Hours   : ${payrolls.reduce((sum, p) => sum + p.otHours, 0)}\n`;
    s += `Total Gross Pay  : ${formatETB(totalGross)} ETB\n`;
    s += `Total OT Pay     : ${formatETB(totalOtPay)} ETB\n`;
    s += `Total Income Tax : ${formatETB(totalTax)} ETB\n`;
    s += `Total Pension    : ${formatETB(totalPen)} ETB\n`;
    s += `Total Net Pay    : ${formatETB(totalNet)} ETB\n\n`;
    s += `${'─'.repeat(72)}\nPAYROLL SUMMARY BY GRADE\n${'─'.repeat(72)}\n`;
    const grades = [...new Set(workers.map(w => w.grade))];
    grades.forEach(g => {
      const gWorkers = workers.filter(w => w.grade === g);
      const gPayrolls = payrolls.filter(p => gWorkers.some(w => w.id === p.workerId));
      const gNet = gPayrolls.reduce((s, p) => s + p.netPay, 0);
      s += `${g.padEnd(16)} ${String(gWorkers.length).padEnd(4)} workers   Net: ${formatETB(gNet)} ETB\n`;
    });
    s += `\nPrepared by: ${project.projectManager}`;
    return s;
  };

  const wf = (field: keyof Worker, val: string | number) =>
    setWorkerForm(p => ({ ...p, [field]: val }));

  const saveWorker = () => {
    if (!workerForm.name || !workerForm.id) return;
    setWorkers(prev => {
      const exists = prev.find(w => w.id === workerForm.id);
      return exists ? prev.map(w => w.id === workerForm.id ? workerForm : w) : [...prev, workerForm];
    });
    setShowWorkerForm(false);
  };

  const removeWorker = (id: string) => setWorkers(prev => prev.filter(w => w.id !== id));

  return (
    <>
      <PageHeader
        title="Manpower & Payroll"
        subtitle="Attendance register · Ethiopian payroll · OT calculation · Daily, weekly & monthly reports"
      />

      {/* KPI strip */}
      <div className="exec-strip" style={{ marginBottom: '1.25rem' }}>
        <span>Workers: <strong>{workers.length}</strong></span>
        <span>Present Today: <strong style={{ color: 'var(--success)' }}>{presentToday}</strong></span>
        <span>Period Gross: <strong>{formatETB(totalGross)} ETB</strong></span>
        <span>OT Pay: <strong style={{ color: 'var(--accent)' }}>{formatETB(totalOtPay)} ETB</strong></span>
        <span>Income Tax: <strong style={{ color: 'var(--danger)' }}>{formatETB(totalTax)} ETB</strong></span>
        <span>Net Pay: <strong style={{ color: 'var(--success)' }}>{formatETB(totalNet)} ETB</strong></span>
      </div>

      {/* Period selector + tabs */}
      <div className="sched-toolbar" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label htmlFor={`${uid}-yr`} style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Year</label>
          <select id={`${uid}-yr`} className="status-select" value={selYr} onChange={e => setSelYr(+e.target.value)}>
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <label htmlFor={`${uid}-mo`} style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Month</label>
          <select id={`${uid}-mo`} className="status-select" value={selMo} onChange={e => setSelMo(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <div className="sched-tabs" style={{ marginLeft: '0.5rem' }}>
            {(['attendance','payroll','reports'] as MPTab[]).map(t => (
              <button key={t} type="button" className={`sched-tab${tab === t ? ' active' : ''}`}
                onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>
                {t === 'attendance' ? '📋 Attendance' : t === 'payroll' ? '💰 Payroll' : '📄 Reports'}
              </button>
            ))}
          </div>
        </div>
        <div className="sched-actions">
          {tab === 'attendance' && <>
            <button type="button" className="btn btn-secondary"
              onClick={() => printAttendance(workers, periodAtt, project, period, selYr, selMo)}>
              🖨 Print Attendance Sheet
            </button>
            <button type="button" className="btn btn-primary" onClick={() => { setWorkerForm({ id:`W${String(workers.length+1).padStart(2,'0')}`, name:'', grade:'Unskilled', position:'', tinNo:'', penNo:'', basicSalary:2400, transportAllowance:400, housingAllowance:300 }); setShowWorkerForm(true); }}>
              + Add Worker
            </button>
          </>}
          {tab === 'payroll' && (
            <button type="button" className="btn btn-primary"
              onClick={() => printPayroll(workers, payrolls, project, period)}>
              🖨 Print / Generate Payroll
            </button>
          )}
        </div>
      </div>

      {/* Worker form */}
      {showWorkerForm && (
        <div className="card" style={{ marginBottom: '1.25rem', borderColor: 'var(--accent)' }}>
          <div className="section-title">Add / Edit Worker</div>
          <div className="rr-form-grid" style={{ marginTop: '0.75rem' }}>
            {([['ID','id','text'],['Full Name','name','text'],['Position','position','text'],['TIN No.','tinNo','text'],['Pension No.','penNo','text']] as [string, keyof Worker, string][]).map(([label, field, type]) => (
              <label key={field} style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                {label}
                <input type={type} className="status-select" style={{ width:'100%' }}
                  value={String(workerForm[field])} onChange={e => wf(field, e.target.value)} />
              </label>
            ))}
            <label style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
              Grade
              <select className="status-select" style={{ width:'100%' }} value={workerForm.grade}
                onChange={e => wf('grade', e.target.value as Grade)}>
                {(['Unskilled','Semi-Skilled','Skilled','Foreman','Supervisor','Engineer'] as Grade[]).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            {([['Basic Salary (ETB)','basicSalary'],['Transport Allow.','transportAllowance'],['Housing Allow.','housingAllowance']] as [string, keyof Worker][]).map(([label, field]) => (
              <label key={field} style={{ display:'flex', flexDirection:'column', gap:'0.25rem', fontSize:'0.75rem', color:'var(--muted)', fontWeight:600, textTransform:'uppercase' }}>
                {label}
                <input type="number" className="status-select" style={{ width:'100%' }}
                  value={Number(workerForm[field])} onChange={e => wf(field, parseFloat(e.target.value) || 0)} />
              </label>
            ))}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.75rem' }}>
            Est. Net Pay: <strong style={{ color: 'var(--success)' }}>
              {formatETB(calcPayroll(workerForm, [], period).netPay + workerForm.basicSalary
                - calcPayroll(workerForm, [], period).incomeTax
                - calcPayroll(workerForm, [], period).employeePension)} ETB
            </strong> (full month, no absences)
          </div>
          <div style={{ display:'flex', gap:'0.75rem', marginTop:'1rem' }}>
            <button type="button" className="btn btn-primary" onClick={saveWorker}>Save</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowWorkerForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Excel import */}
      <ExcelImport
        moduleId="workers"
        label="Import Workers from Excel / CSV"
        templateColumns={['ID','Name','Grade','Position','TINNo','PenNo','BasicSalary','TransportAllowance','HousingAllowance']}
        templateRows={[['W11','Girma Tadesse','Skilled','Steel Fixer','001234590','PEN011','5200','400','500']]}
        onImport={(records) => {
          const imported: Worker[] = records.filter(r => r['Name']).map(r => ({
            id: r['ID'] || `W${Date.now()}`,
            name: r['Name'] ?? '', grade: (r['Grade'] ?? 'Unskilled') as Grade,
            position: r['Position'] ?? '', tinNo: r['TINNo'] ?? '', penNo: r['PenNo'] ?? '',
            basicSalary: parseFloat(r['BasicSalary'] ?? '0') || 0,
            transportAllowance: parseFloat(r['TransportAllowance'] ?? '400') || 400,
            housingAllowance: parseFloat(r['HousingAllowance'] ?? '300') || 300,
          }));
          setWorkers(prev => [...prev, ...imported]);
        }}
      />

      {/* ── ATTENDANCE TAB ── */}
      {tab === 'attendance' && (
        <div className="card">
          <div className="section-title" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>Attendance Sheet — {period}</span>
            <div style={{ display:'flex', gap:'0.5rem' }}>
              <span style={{ fontSize:'0.75rem', color:'var(--muted)' }}>{workers.length} workers · {periodAtt.filter(a => a.status === 'P').length} present-days</span>
            </div>
          </div>
          <AttendanceSheet workers={workers} attendance={periodAtt}
            setAttendance={(updated) => {
              setAttendance(prev => {
                const filtered = prev.filter(a => {
                  const d = new Date(a.date);
                  return !(d.getFullYear() === selYr && (d.getMonth() + 1) === selMo);
                });
                return [...filtered, ...updated];
              });
            }}
            yr={selYr} mo={selMo} />

          {/* Worker list */}
          <div className="section-title" style={{ marginTop: '1.5rem' }}>Worker Register ({workers.length})</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr><th>#</th><th>ID</th><th>Name</th><th>Grade</th><th>Position</th><th>TIN No.</th><th>Basic (ETB)</th><th>Transport</th><th>Housing</th><th></th></tr>
              </thead>
              <tbody>
                {workers.map((w, i) => (
                  <tr key={w.id}>
                    <td>{i + 1}</td>
                    <td><strong>{w.id}</strong></td>
                    <td>{w.name}</td>
                    <td><span className="tag">{w.grade}</span></td>
                    <td style={{ color: 'var(--muted)' }}>{w.position}</td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{w.tinNo}</td>
                    <td>{formatETB(w.basicSalary)}</td>
                    <td>{formatETB(w.transportAllowance)}</td>
                    <td>{formatETB(w.housingAllowance)}</td>
                    <td>
                      <button type="button" className="btn-ghost" style={{ fontSize:'0.7rem', padding:'0.15rem 0.45rem' }}
                        onClick={() => { setWorkerForm(w); setShowWorkerForm(true); }}>✎</button>
                      <button type="button" className="btn-ghost" style={{ fontSize:'0.7rem', padding:'0.15rem 0.45rem', marginLeft:3 }}
                        onClick={() => removeWorker(w.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PAYROLL TAB ── */}
      {tab === 'payroll' && (
        <div className="card">
          <div className="section-title" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>Payroll — {period}</span>
            <span style={{ fontSize:'0.75rem', color:'var(--muted)' }}>
              Ethiopian Income Tax · Pension 7% (employee) + 11% (employer) · OT @ 125%
            </span>
          </div>
          <PayrollTable workers={workers} payrolls={payrolls} />
          <div className="exec-strip" style={{ marginTop: '1rem' }}>
            <span>Gross: <strong>{formatETB(totalGross)} ETB</strong></span>
            <span>OT: <strong style={{ color:'var(--accent)' }}>{formatETB(totalOtPay)} ETB</strong></span>
            <span>Tax: <strong style={{ color:'var(--danger)' }}>{formatETB(totalTax)} ETB</strong></span>
            <span>Emp Pension: <strong style={{ color:'var(--warning)' }}>{formatETB(payrolls.reduce((s,p)=>s+p.employeePension,0))} ETB</strong></span>
            <span>Er Pension: <strong style={{ color:'var(--muted)' }}>{formatETB(payrolls.reduce((s,p)=>s+p.employerPension,0))} ETB</strong></span>
            <span>NET PAY: <strong style={{ color:'var(--success)', fontSize:'1.05rem' }}>{formatETB(totalNet)} ETB</strong></span>
          </div>
          <div className="card" style={{ marginTop:'1rem', background:'var(--surface-2)' }}>
            <div className="section-title" style={{ fontSize:'0.8rem' }}>Ethiopian Income Tax Reference</div>
            <table className="data-table" style={{ fontSize:'0.75rem', maxWidth:500 }}>
              <thead><tr><th>Taxable Income (ETB)</th><th>Rate</th><th>Deductible</th></tr></thead>
              <tbody>
                {[['0 – 600','0%','0'],['601 – 1,650','10%','0'],['1,651 – 3,200','15%','82.50'],
                  ['3,201 – 5,250','20%','242.50'],['5,251 – 7,800','25%','505'],
                  ['7,801 – 10,900','30%','895'],['Over 10,900','35%','1,440']].map(([r,t,d]) => (
                  <tr key={r}><td>{r}</td><td><strong>{t}</strong></td><td>{d}</td></tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize:'0.72rem', color:'var(--muted)', marginTop:'0.5rem' }}>
              Employee pension: 7% of basic · Employer contribution: 11% of basic · Transport exemption: 400 ETB/month
            </p>
          </div>
        </div>
      )}

      {/* ── REPORTS TAB ── */}
      {tab === 'reports' && (
        <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:'1.25rem', alignItems:'start' }}>
          <div className="card">
            <div className="section-title">Generate Report</div>
            {([
              ['📅 Daily Report', generateDailyReport, `KAS-Manpower-Daily-${todayIso()}.txt`],
              ['📆 Weekly Report', generateWeeklyReport, `KAS-Manpower-Weekly.txt`],
              ['📊 Monthly Report', generateMonthlyReport, `KAS-Manpower-${period.replace(' ','-')}.txt`],
            ] as [string, () => string, string][]).map(([label, gen, fname]) => (
              <div key={label} style={{ marginBottom:'0.75rem' }}>
                <button type="button" className="btn btn-secondary" style={{ width:'100%', marginBottom:'0.35rem' }}
                  onClick={() => {
                    const text = gen();
                    const blob = new Blob([text], { type:'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = fname; a.click();
                    URL.revokeObjectURL(url);
                  }}>
                  ⬇ {label}
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-primary" style={{ width:'100%', marginTop:'0.5rem' }}
              onClick={() => printPayroll(workers, payrolls, project, period)}>
              🖨 Print Payroll (A3)
            </button>
            <button type="button" className="btn btn-secondary" style={{ width:'100%', marginTop:'0.5rem' }}
              onClick={() => printAttendance(workers, periodAtt, project, period, selYr, selMo)}>
              🖨 Print Attendance (A3)
            </button>
          </div>
          <div className="card">
            <div className="section-title">Monthly Summary — {period}</div>
            <pre className="doc-output" style={{ maxHeight:420 }}>{generateMonthlyReport()}</pre>
          </div>
        </div>
      )}
    </>
  );
}
