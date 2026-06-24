/**
 * Zero-dependency Excel/CSV parser for browser.
 *
 * Supports:
 *  - .csv  / .tsv  — parsed directly as text
 *  - .xlsx         — unzipped in-browser via DecompressionStream (Chrome/Edge/Firefox 103+)
 *                    with fallback XML extraction via regex for older browsers
 *
 * Returns: string[][] (rows of cells, first row = headers)
 */

// ── CSV / TSV ───────────────────────────────────────────────────────────────
export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let inQuote = false;
    let cell = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cell += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === delimiter && !inQuote) {
        cells.push(cell.trim()); cell = '';
      } else {
        cell += ch;
      }
    }
    cells.push(cell.trim());
    rows.push(cells);
  }
  return rows;
}

// ── Shared cell value extractor ─────────────────────────────────────────────
function extractCellValue(cellXml: string, sharedStrings: string[]): string {
  const tMatch = cellXml.match(/\st="([^"]*)"/);
  const vMatch = cellXml.match(/<v>([^<]*)<\/v>/);
  if (!vMatch) return '';
  const raw = vMatch[1];
  if (tMatch?.[1] === 's') return sharedStrings[parseInt(raw)] ?? '';
  return raw;
}

// ── XLSX parser (pure browser, no dependencies) ─────────────────────────────
export async function parseXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  // Step 1: unzip the xlsx (it's a ZIP archive)
  let files: Map<string, string>;
  try {
    files = await unzipXlsx(buffer);
  } catch {
    // Last-resort: try regex extraction directly on the raw bytes as text
    return parseXlsxFallback(buffer);
  }

  // Step 2: parse shared strings
  const sharedStrings: string[] = [];
  const ssXml = files.get('xl/sharedStrings.xml') ?? '';
  const siMatches = ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g);
  for (const m of siMatches) {
    const tMatches = m[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g);
    let val = '';
    for (const t of tMatches) val += t[1];
    sharedStrings.push(val);
  }

  // Step 3: find first sheet
  const workbookXml = files.get('xl/workbook.xml') ?? '';
  const sheetMatch = workbookXml.match(/<sheet[^>]+r:id="([^"]+)"/);
  const rId = sheetMatch?.[1] ?? 'rId1';
  const relsXml = files.get('xl/_rels/workbook.xml.rels') ?? '';
  const relMatch = relsXml.match(new RegExp(`Id="${rId}"[^>]+Target="([^"]+)"`));
  const sheetPath = relMatch ? `xl/${relMatch[1]}` : 'xl/worksheets/sheet1.xml';
  const sheetXml = files.get(sheetPath) ?? '';

  // Step 4: parse rows
  const rows: string[][] = [];
  const rowMatches = sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g);
  for (const rowMatch of rowMatches) {
    const cells: string[] = [];
    const cellMatches = rowMatch[1].matchAll(/<c\s([^>]*)>([\s\S]*?)<\/c>/g);
    let prevCol = 0;
    for (const cellMatch of cellMatches) {
      const attr = cellMatch[1];
      const inner = cellMatch[2];
      const rAttr = attr.match(/r="([A-Z]+)(\d+)"/);
      const colStr = rAttr?.[1] ?? '';
      const col = colToIndex(colStr);
      // Fill gaps (merged / empty cells)
      while (cells.length < col) cells.push('');
      const val = extractCellValue(`<c ${attr}>${inner}</c>`, sharedStrings);
      cells.push(val);
      prevCol = col + 1;
    }
    void prevCol;
    rows.push(cells);
  }
  return rows;
}

function colToIndex(col: string): number {
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx - 1;
}

// ── ZIP unzipper using browser DecompressionStream ──────────────────────────
async function unzipXlsx(buffer: ArrayBuffer): Promise<Map<string, string>> {
  const bytes = new Uint8Array(buffer);
  const files = new Map<string, string>();

  // Walk the ZIP central directory from the end
  const view = new DataView(buffer);
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocdOffset = i; break; }
  }
  if (eocdOffset < 0) throw new Error('Not a ZIP file');

  const cdOffset = view.getUint32(eocdOffset + 16, true);
  const cdSize   = view.getUint32(eocdOffset + 12, true);
  let pos = cdOffset;
  const dec = new TextDecoder();

  while (pos < cdOffset + cdSize) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;
    const compression = view.getUint16(pos + 10, true);
    const compSize    = view.getUint32(pos + 20, true);
    const nameLen     = view.getUint16(pos + 28, true);
    const extraLen    = view.getUint16(pos + 30, true);
    const commentLen  = view.getUint16(pos + 32, true);
    const localOffset = view.getUint32(pos + 42, true);
    const name = dec.decode(bytes.slice(pos + 46, pos + 46 + nameLen));
    pos += 46 + nameLen + extraLen + commentLen;

    // Only care about XML files
    if (!name.endsWith('.xml') && !name.endsWith('.rels')) continue;

    // Read local file header to get actual data start
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + nameLen + localExtraLen;
    const compData = bytes.slice(dataStart, dataStart + compSize);

    let text: string;
    if (compression === 0) {
      text = dec.decode(compData);
    } else if (compression === 8) {
      // DEFLATE via DecompressionStream
      if (typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        const reader = ds.readable.getReader();
        writer.write(compData);
        writer.close();
        const chunks: Uint8Array[] = [];
        let done = false;
        while (!done) {
          const { value, done: d } = await reader.read();
          if (value) chunks.push(value);
          done = d;
        }
        const total = chunks.reduce((s, c) => s + c.length, 0);
        const merged = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { merged.set(c, off); off += c.length; }
        text = dec.decode(merged);
      } else {
        // Browser too old — skip, fallback will handle it
        continue;
      }
    } else {
      continue;
    }
    files.set(name, text);
  }
  return files;
}

// ── Fallback: regex scan raw bytes as latin1 string ────────────────────────
function parseXlsxFallback(buffer: ArrayBuffer): string[][] {
  const bytes = new Uint8Array(buffer);
  let raw = '';
  for (let i = 0; i < Math.min(bytes.length, 500000); i++) raw += String.fromCharCode(bytes[i]);
  // Try to extract <row> elements naively
  const rows: string[][] = [];
  const rowRx = /<row[^>]*>([\s\S]*?)<\/row>/g;
  let rm: RegExpExecArray | null;
  while ((rm = rowRx.exec(raw)) !== null) {
    const cells: string[] = [];
    const cellRx = /<v>([^<]*)<\/v>/g;
    let cm: RegExpExecArray | null;
    while ((cm = cellRx.exec(rm[1])) !== null) cells.push(cm[1]);
    if (cells.length) rows.push(cells);
  }
  return rows;
}

// ── Main entry: accepts File, returns rows ──────────────────────────────────
export async function parseSpreadsheet(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return parseCsv(text, ',');
  }
  if (name.endsWith('.tsv') || name.endsWith('.txt')) {
    const text = await file.text();
    return parseCsv(text, '\t');
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) {
    const buf = await file.arrayBuffer();
    return parseXlsx(buf);
  }
  throw new Error(`Unsupported file type: ${file.name}`);
}
