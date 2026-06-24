import { useStoreMeta, useProjectStore } from '../store/projectStore';

export default function StoreStatusBar() {
  const meta = useStoreMeta();
  const reset = useProjectStore((s) => s.resetToPreloaded);
  const loaded = new Date(meta.preloadedAt).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="store-bar">
      <div className="store-bar-left">
        <span className="store-pill">
          <span className="store-dot" />
          Zustand Store — Live
        </span>
        <span className="store-divider" />
        <span className="store-meta">Preloaded · {meta.modules.length} modules</span>
        <span className="store-divider" />
        <span className="store-meta">v{meta.version}</span>
      </div>
      <div className="store-bar-right">
        <span className="store-meta">Loaded {loaded}</span>
        <button type="button" className="btn btn-ghost" onClick={reset} title="Reset all state to preloaded Kassa data">
          Reset to Preloaded Data
        </button>
      </div>
    </div>
  );
}
