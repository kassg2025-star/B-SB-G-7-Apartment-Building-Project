/**
 * Zero-dependency export utility.
 * Exports any table data as:
 *  - .csv  (works everywhere)
 *  - .xlsx  (generates a real xlsx file using pure JS — no library needed)
 *  - PDF-ready print window
 */

// ── CSV export ───────────────────────────────────────────────────────────────
export function exportCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(r => r.map(escape).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Minimal XLSX writer (pure JS, no dependency) ─────────────────────────────
// Generates a valid .xlsx (Office Open XML) with one sheet.
export function exportXlsx(headers: string[], rows: (string | number)[][], sheetName: string, filename: string) {
  const allRows = [headers, ...rows];
  const colCount = headers.length;
  const rowCount = allRows.length;

  // Build shared strings
  const strings: string[] = [];
  const strIdx: Map<string, number> = new Map();
  const si = (v: string | number): string => {
    if (typeof v === 'number') return `<v>${v}</v>`;
    const s = String(v ?? '');
    if (!strIdx.has(s)) { strIdx.set(s, strings.length); strings.push(s); }
    return `t="s"><v>${strIdx.get(s)}</v>`;
  };

  // Column letters
  const colLetter = (n: number): string => {
    let s = '';
    n++;
    while (n > 0) { s = String.fromCharCode(65 + (n - 1) % 26) + s; n = Math.floor((n - 1) / 26); }
    return s;
  };

  // Sheet XML
  const sheetRows = allRows.map((row, ri) => {
    const cells = row.map((v, ci) => {
      const ref = `${colLetter(ci)}${ri + 1}`;
      const isNum = typeof v === 'number';
      const inner = isNum ? `<v>${v}</v>` : `t="s"><v>${strIdx.get(String(v ?? '')) ?? 0}</v>`;
      // Pre-populate strings for text
      if (!isNum) si(v);
      return `<c r="${ref}" ${isNum ? '' : 't="s"'}><v>${isNum ? v : strIdx.get(String(v ?? '')) ?? 0}</v></c>`;
    });
    return `<row r="${ri + 1}">${cells.join('')}</row>`;
  }).join('');

  // Rebuild with correct indices after all strings collected
  const sheetRowsFixed = allRows.map((row, ri) =>
    `<row r="${ri + 1}">${row.map((v, ci) => {
      const ref = `${colLetter(ci)}${ri + 1}`;
      if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
      return `<c r="${ref}" t="s"><v>${strIdx.get(String(v ?? '')) ?? 0}</v></c>`;
    }).join('')}</row>`
  ).join('');

  void sheetRows; // suppress unused warning

  const ssXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
${strings.map(s => `<si><t>${s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</t></si>`).join('')}
</sst>`;

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${colLetter(colCount - 1)}${rowCount}"/>
<sheetData>${sheetRowsFixed}</sheetData>
</worksheet>`;

  const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  const pkgRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

  // Zip everything using a minimal ZIP writer
  const enc = new TextEncoder();
  const files: { name: string; data: Uint8Array }[] = [
    { name: '[Content_Types].xml',          data: enc.encode(contentTypes) },
    { name: '_rels/.rels',                   data: enc.encode(pkgRels) },
    { name: 'xl/workbook.xml',               data: enc.encode(wbXml) },
    { name: 'xl/_rels/workbook.xml.rels',    data: enc.encode(wbRels) },
    { name: 'xl/sharedStrings.xml',          data: enc.encode(ssXml) },
    { name: 'xl/worksheets/sheet1.xml',      data: enc.encode(sheetXml) },
  ];

  const zip = buildZip(files);
  const blob = new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Minimal ZIP builder (stored, no compression) ──────────────────────────────
function buildZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const localHeaders: Uint8Array[] = [];
  const offsets: number[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = new TextEncoder().encode(f.name);
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);  // local file header sig
    view.setUint16(4, 20, true);           // version needed
    view.setUint16(6, 0, true);            // flags
    view.setUint16(8, 0, true);            // compression: stored
    view.setUint16(10, 0, true);           // mod time
    view.setUint16(12, 0, true);           // mod date
    view.setUint32(14, crc32(f.data), true); // CRC-32
    view.setUint32(18, f.data.length, true); // compressed size
    view.setUint32(22, f.data.length, true); // uncompressed size
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);           // extra length
    header.set(nameBytes, 30);
    offsets.push(offset);
    offset += header.length + f.data.length;
    localHeaders.push(header);
  }

  // Central directory
  const cdEntries: Uint8Array[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const nameBytes = new TextEncoder().encode(f.name);
    const cd = new Uint8Array(46 + nameBytes.length);
    const view = new DataView(cd.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(16, crc32(f.data), true);
    view.setUint32(20, f.data.length, true);
    view.setUint32(24, f.data.length, true);
    view.setUint16(28, nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, offsets[i], true);
    cd.set(nameBytes, 46);
    cdEntries.push(cd);
  }

  const cdSize   = cdEntries.reduce((s, e) => s + e.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const parts: Uint8Array[] = [];
  for (let i = 0; i < files.length; i++) {
    parts.push(localHeaders[i], files[i].data);
  }
  parts.push(...cdEntries, eocd);

  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.length; }
  return out;
}

// ── CRC-32 ───────────────────────────────────────────────────────────────────
function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (const byte of data) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc & 1) ? (crc >>> 1) ^ 0xEDB88320 : crc >>> 1;
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ── Print-to-PDF helper ───────────────────────────────────────────────────────
export function printTable(title: string, subtitle: string, headers: string[], rows: (string | number)[][], projectName: string) {
  const tableRows = rows.map(r =>
    `<tr>${r.map(c => `<td>${String(c ?? '').replace(/</g,'&lt;')}</td>`).join('')}</tr>`
  ).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:9pt;margin:0;padding:1cm;color:#000}
    h2{text-align:center;font-size:13pt;margin:0}
    h3{text-align:center;font-size:9pt;margin:2px 0 8px;color:#444}
    .meta{display:flex;justify-content:space-between;font-size:8pt;border-bottom:1px solid #999;padding-bottom:4px;margin-bottom:8px}
    table{width:100%;border-collapse:collapse;margin-top:6px}
    th{background:#1a3a5c;color:#fff;padding:4px 6px;font-size:8pt;text-align:left}
    td{padding:3px 6px;border-bottom:1px solid #ddd;font-size:8.5pt}
    tr:nth-child(even) td{background:#f9f9f9}
    @page{size:A3 landscape;margin:1cm}
  </style></head><body>
  <h2>${projectName}</h2>
  <h3>${title} — ${subtitle}</h3>
  <div class="meta">
    <span>Generated: ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</span>
    <span>Total records: ${rows.length}</span>
  </div>
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}</script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=1100,height=700');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
