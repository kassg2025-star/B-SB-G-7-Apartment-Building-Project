import { useMemo } from 'react';
import { useProjectStore } from '../store/projectStore';
import { generateDocument } from '../utils/documentTemplates';
import { documentTypes } from '../data/projectData';
import PageHeader from '../components/PageHeader';

export default function AIReportGenerator() {
  const project = useProjectStore((s) => s.project);
  const selected = useProjectStore((s) => s.selectedReportType);
  const setSelected = useProjectStore((s) => s.setSelectedReportType);
  const content = useMemo(() => generateDocument(selected, project), [selected, project]);

  const copyToClipboard = () => navigator.clipboard.writeText(content);

  const download = () => {
    const label = documentTypes.find((d) => d.id === selected)?.label ?? 'report';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KAS-${label.replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="AI Report Generator"
        subtitle="Draft contract-ready reports from consolidated Kassa & Sons site intelligence"
      />

      <div className="doc-layout">
        <div>
          <div className="section-title">Report Type</div>
          {documentTypes.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`doc-type-btn${selected === d.id ? ' active' : ''}`}
              onClick={() => setSelected(d.id)}
            >
              <strong>{d.label}</strong>
              <span>{d.description}</span>
            </button>
          ))}
        </div>
        <div>
          <div className="doc-actions">
            <button type="button" className="btn btn-primary" onClick={copyToClipboard}>
              Copy to Clipboard
            </button>
            <button type="button" className="btn btn-secondary" onClick={download}>
              Download .txt
            </button>
          </div>
          <div className="doc-output">{content}</div>
        </div>
      </div>
    </>
  );
}
