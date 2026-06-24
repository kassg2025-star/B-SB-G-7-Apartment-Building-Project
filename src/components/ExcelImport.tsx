/**
 * Universal Excel / CSV import component.
 *
 * Usage:
 *   <ExcelImport
 *     moduleId="progress"
 *     onImport={(rows) => { ... map rows to your state ... }}
 *     templateColumns={['Month', 'Planned%', 'Actual%', 'Note']}
 *     templateRows={[['Jan 2026', '4.27', '0.5', '']]}
 *   />
 *
 * Shows:
 *  1. An upload button (xlsx / csv)
 *  2. A collapsible column-mapping table so user can fix mismatched headers
 *  3. A preview table of the parsed rows
 *  4. A "Confirm Import" button that fires onImport with mapped data
 */

import { useState, useRef } from 'react';
import { parseSpreadsheet } from '../utils/excelParser';

export interface ImportMapping {
  /** The target column name expected by the module */
  target: string;
  /** Which source column index to use (-1 = skip) */
  sourceIndex: number;
}

interface Props {
  moduleId: string;
  /** Human-readable labels for the expected columns (in order) */
  templateColumns: string[];
  /** Example rows shown in the download template */
  templateRows?: string[][];
  /** Called with an array of objects keyed by templateColumns */
  onImport: (records: Record<string, string>[]) => void;
  /** Optional label override */
  label?: string;
}

export default function ExcelImport({ moduleId, templateColumns, templateRows, onImport, label }: Props) {
  const [open, setOpen] = useState(false);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ImportMapping[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-map: find best matching source column for each target column
  function autoMap(srcHeaders: string[], targets: string[]): ImportMapping[] {
    return targets.map((target) => {
      const tLow = target.toLowerCase().replace(/[^a-z0-9]/g, '');
      let best = -1, bestScore = 0;
      srcHeaders.forEach((h, i) => {
        const hLow = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (hLow === tLow) { best = i; bestScore = 100; return; }
        // partial match
        const score = tLow.includes(hLow) || hLow.includes(tLow) ? 50 : 0;
        if (score > bestScore) { best = i; bestScore = score; }
      });
      return { target, sourceIndex: best };
    });
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setLoading(true); setImported(false);
    try {
      const rows = await parseSpreadsheet(file);
      if (rows.length < 2) throw new Error('File appears empty — need at least a header row and one data row.');
      const srcHeaders = rows[0];
      setHeaders(srcHeaders);
      setRawRows(rows.slice(1));
      setMapping(autoMap(srcHeaders, templateColumns));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleConfirm = () => {
    const records: Record<string, string>[] = rawRows.map((row) => {
      const rec: Record<string, string> = {};
      mapping.forEach(({ target, sourceIndex }) => {
        rec[target] = sourceIndex >= 0 ? (row[sourceIndex] ?? '') : '';
      });
      return rec;
    });
    onImport(records);
    setImported(true);
    setRawRows([]);
    setHeaders([]);
    setMapping([]);
  };

  const downloadTemplate = () => {
    const headerLine = templateColumns.join(',');
    const dataLines = (templateRows ?? []).map(r => r.map(c => `"${c}"`).join(','));
    const csv = [headerLine, ...dataLines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KAS-Template-${moduleId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewRows = rawRows.slice(0, 5);

  return (
    <div className="xl-import-wrap">
      {/* Toggle bar */}
      <div className="xl-import-bar" onClick={() => setOpen(o => !o)}>
        <span>📥 {label ?? 'Import from Excel / CSV'}</span>
        <span className="xl-import-chevron">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="xl-import-body">
          {/* Actions row */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <input
              ref={fileRef}
              id={`xl-file-${moduleId}`}
              type="file"
              accept=".xlsx,.xlsm,.csv,.tsv,.txt"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
            >
              {loading ? '⏳ Parsing…' : '⬆ Upload .xlsx or .csv'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={downloadTemplate}>
              ⬇ Download Template
            </button>
          </div>

          {/* Expected columns hint */}
          <div className="xl-columns-hint">
            <span className="xl-hint-label">Expected columns:</span>
            {templateColumns.map(c => <span key={c} className="module-chip">{c}</span>)}
          </div>

          {error && (
            <div className="alert-item alert-danger" style={{ marginBottom: '0.75rem' }}>
              <strong>Parse Error</strong><p>{error}</p>
            </div>
          )}

          {imported && (
            <div className="alert-item alert-success" style={{ marginBottom: '0.75rem' }}>
              <strong>✔ Import successful</strong><p>Data has been loaded into this module.</p>
            </div>
          )}

          {/* Column mapping */}
          {rawRows.length > 0 && (
            <>
              <div className="section-title" style={{ marginBottom: '0.6rem' }}>
                Column Mapping — {rawRows.length} rows detected
              </div>
              <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Target Field</th>
                      <th>Source Column (from your file)</th>
                      <th>Sample Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapping.map((m, i) => (
                      <tr key={m.target}>
                        <td><strong>{m.target}</strong></td>
                        <td>
                          <select
                            className="status-select"
                            value={m.sourceIndex}
                            onChange={e => {
                              const v = parseInt(e.target.value);
                              setMapping(prev => prev.map((mp, j) => j === i ? { ...mp, sourceIndex: v } : mp));
                            }}
                          >
                            <option value={-1}>— skip —</option>
                            {headers.map((h, hi) => (
                              <option key={hi} value={hi}>{h || `Column ${hi + 1}`}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                          {m.sourceIndex >= 0 ? (rawRows[0]?.[m.sourceIndex] ?? '—') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Preview */}
              <div className="section-title" style={{ marginBottom: '0.6rem' }}>
                Preview (first {previewRows.length} rows)
              </div>
              <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {mapping.filter(m => m.sourceIndex >= 0).map(m => (
                        <th key={m.target}>{m.target}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri}>
                        {mapping.filter(m => m.sourceIndex >= 0).map(m => (
                          <td key={m.target} style={{ fontSize: '0.78rem' }}>
                            {row[m.sourceIndex] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-primary" onClick={handleConfirm}>
                  ✔ Confirm Import ({rawRows.length} rows)
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { setRawRows([]); setHeaders([]); setMapping([]); }}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
