import { useNavigate } from 'react-router-dom';
import { formatETB, pct } from '../data/projectData';
import type { KPISet } from '../store/projectStore';

type Variant = 'default' | 'danger' | 'warning' | 'success' | 'accent';
type Trend    = 'up' | 'down' | 'flat';

const variantClass: Record<Variant, string> = {
  default: '',
  danger:  'kpi-danger',
  warning: 'kpi-warning',
  success: 'kpi-success',
  accent:  'kpi-accent',
};

const trendIcon: Record<Trend, string> = { up: '↑', down: '↓', flat: '→' };
const trendColor: Record<Trend, string> = {
  up:   'var(--success)',
  down: 'var(--danger)',
  flat: 'var(--muted)',
};

interface KPICardProps {
  label:    string;
  value:    string | number;
  sub?:     string;
  variant?: Variant;
  trend?:   Trend;
  trendText?: string;
  to?:      string;   // drill-down route
}

export default function KPICard({ label, value, sub, variant = 'default', trend, trendText, to }: KPICardProps) {
  const navigate = useNavigate();

  return (
    <div
      className={`card kpi-card ${variantClass[variant]}${to ? ' kpi-clickable' : ''}`}
      onClick={to ? () => navigate(to) : undefined}
      role={to ? 'button' : undefined}
      tabIndex={to ? 0 : undefined}
      onKeyDown={to ? (e) => { if (e.key === 'Enter') navigate(to); } : undefined}
      title={to ? `Go to ${label}` : undefined}
    >
      <div className="card-label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
        <div className="card-value">{value}</div>
        {trend && (
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: trendColor[trend] }}>
            {trendIcon[trend]}
          </span>
        )}
      </div>
      {sub && <div className="card-sub">{sub}</div>}
      {trendText && (
        <div style={{ fontSize: '0.7rem', color: trendColor[trend ?? 'flat'], marginTop: '0.2rem', fontWeight: 600 }}>
          {trendText}
        </div>
      )}
      {to && <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.3rem' }}>Click to view →</div>}
    </div>
  );
}

export function ExecutiveKPIGrid({ kpis }: { kpis: KPISet }) {
  const spiTrend: Trend   = kpis.spi < 0.5 ? 'down' : kpis.spi < 0.9 ? 'flat' : 'up';
  const cpiTrend: Trend   = kpis.cpi < 0.85 ? 'down' : kpis.cpi < 1 ? 'flat' : 'up';
  const varTrend: Trend   = kpis.scheduleVariance < -20 ? 'down' : kpis.scheduleVariance < -5 ? 'flat' : 'up';
  const ncrTrend: Trend   = kpis.openNcrs > 0 ? 'down' : 'up';
  const cashPct = kpis.contractValue > 0 ? ((kpis.totalReceived / kpis.contractValue) * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-4">
      <KPICard label="SPI (Schedule)"      value={kpis.spi.toFixed(2)}         sub="Schedule Performance Index"
        variant="danger"  trend={spiTrend}  trendText={spiTrend === 'down' ? 'Critical — below 0.5' : 'Needs recovery'} to="/s-curve" />
      <KPICard label="CPI (Cost)"          value={kpis.cpi.toFixed(2)}         sub="Cost Performance Index"
        variant="warning" trend={cpiTrend}  trendText={cpiTrend === 'down' ? 'Over budget' : 'Within budget'} to="/financial" />
      <KPICard label="Schedule Variance"   value={pct(kpis.scheduleVariance)}  sub={`Actual ${pct(kpis.actualProgress)} vs Planned ${pct(kpis.plannedProgress)}`}
        variant="danger"  trend={varTrend} to="/s-curve" />
      <KPICard label="EOT Claim"           value={`${kpis.eotClaimedDays} Days`} sub="Pending consultant approval"
        variant="warning" trend="flat" to="/eot" />
      <KPICard label="Days Elapsed"        value={kpis.daysElapsed}            sub={`${kpis.daysRemaining} days remaining`}
        to="/schedule" />
      <KPICard label="Contract Value"      value={formatETB(kpis.contractValue)} sub={`${cashPct}% received to date`}
        variant="accent" trend="flat" to="/financial" />
      <KPICard label="Open NCRs"           value={kpis.openNcrs}               sub="NCR-005 Ø20mm quarantined"
        variant="warning" trend={ncrTrend} trendText={kpis.openNcrs > 0 ? 'Action required' : 'All closed'} to="/quality" />
      <KPICard label="HSE — LTI"           value={kpis.lti}                    sub={`PPE ${kpis.ppeCompliance}% compliance`}
        variant="success" trend={kpis.lti === 0 ? 'up' : 'down'} trendText={kpis.lti === 0 ? 'Zero LTI' : 'LTI recorded'} to="/hse" />
    </div>
  );
}
