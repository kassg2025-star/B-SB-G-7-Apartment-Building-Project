import { useState } from 'react';
import { pct } from '../data/projectData';
import type { MonthlyProgress } from '../data/projectData';

interface SCurveChartProps {
  data: MonthlyProgress[];
  height?: number;
  showForecast?: boolean;
}

export default function SCurveChart({ data, height = 220, showForecast = true }: SCurveChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  if (data.length === 0) return <div style={{ color: 'var(--muted)', padding: '2rem', textAlign: 'center' }}>No data</div>;

  // Dynamic max — round up to nearest 10
  const rawMax = Math.max(...data.map((m) => Math.max(m.planned, m.actual)), 1);
  const max = Math.ceil(rawMax / 10) * 10 || 10;

  // Y-axis tick labels (5 ticks from max down to 0)
  const yTicks = [max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0];

  const xStep = data.length > 1 ? 500 / (data.length - 1) : 250;
  const SVG_H = 200;

  const toY = (val: number) => SVG_H - (val / max) * (SVG_H - 10) - 5;
  const toX = (i: number) => i * xStep;

  const linePoints = (key: 'planned' | 'actual') =>
    data.map((m, i) => `${toX(i)},${toY(m[key])}`).join(' ');

  // Forecast: simple linear extrapolation from last 2 actual points
  let forecastPoints = '';
  if (showForecast && data.length >= 2) {
    const last = data[data.length - 1];
    const prev = data[data.length - 2];
    const slope = last.actual - prev.actual;
    const steps = Math.min(3, data.length);
    const pts = data.map((_, i) => `${toX(i)},${toY(data[i].actual)}`);
    for (let s = 1; s <= steps; s++) {
      const projected = Math.min(100, last.actual + slope * s);
      pts.push(`${toX(data.length - 1 + s)},${toY(projected)}`);
    }
    forecastPoints = pts.slice(data.length - 1).join(' ');
  }

  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * 500;
    const idx = Math.round(svgX / xStep);
    const m = data[Math.max(0, Math.min(data.length - 1, idx))];
    if (m) {
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 10,
        text: `${m.month}: Planned ${pct(m.planned)} | Actual ${pct(m.actual)} | Var ${pct(m.variance)}`,
      });
    }
  };

  return (
    <div className="scurve-wrap">
      <div className="scurve-chart" style={{ height }}>
        {/* Dynamic Y-axis */}
        <div className="scurve-y-axis">
          {yTicks.map((t) => (
            <span key={t}>{t}%</span>
          ))}
        </div>

        <div className="scurve-plot" style={{ position: 'relative' }}>
          <svg
            className="scurve-lines"
            viewBox={`0 0 ${500 + xStep * 3} ${SVG_H}`}
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltip(null)}
            style={{ cursor: 'crosshair' }}
          >
            {/* Grid lines */}
            {yTicks.map((t) => (
              <line
                key={t}
                x1="0" y1={toY(t)}
                x2={500 + xStep * 3} y2={toY(t)}
                stroke="rgba(47,66,96,0.35)" strokeWidth="1" strokeDasharray="4,3"
              />
            ))}

            {/* Forecast line */}
            {showForecast && forecastPoints && (
              <polyline
                points={forecastPoints}
                fill="none"
                stroke="rgba(212,160,23,0.4)"
                strokeWidth="1.5"
                strokeDasharray="5,4"
              />
            )}

            {/* Planned line */}
            <polyline className="line-planned" points={linePoints('planned')} />
            {/* Actual line */}
            <polyline className="line-actual" points={linePoints('actual')} />

            {/* Data point dots */}
            {data.map((m, i) => (
              <g key={m.month}>
                <circle cx={toX(i)} cy={toY(m.planned)} r="3" fill="rgba(143,163,188,0.7)" />
                <circle cx={toX(i)} cy={toY(m.actual)}  r="3.5" fill="var(--accent)" />
              </g>
            ))}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div style={{
              position: 'absolute', left: tooltip.x + 10, top: tooltip.y,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '0.4rem 0.65rem',
              fontSize: '0.72rem', color: 'var(--text)', whiteSpace: 'nowrap',
              pointerEvents: 'none', zIndex: 10, boxShadow: 'var(--shadow)',
            }}>
              {tooltip.text}
            </div>
          )}

          {/* Bar overlay */}
          <div className="chart-bars scurve-bars">
            {data.map((m) => (
              <div className="chart-col" key={m.month}>
                <div className="chart-bar-group">
                  <div className="chart-bar planned"
                    style={{ height: `${(m.planned / max) * 100}%` }}
                    title={`Planned: ${pct(m.planned)}`} />
                  <div className="chart-bar actual"
                    style={{ height: `${(m.actual / max) * 100}%` }}
                    title={`Actual: ${pct(m.actual)}`} />
                </div>
                <div className="chart-label">{m.month.replace(/ 20\d\d/, '')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="scurve-legend">
        <span className="legend-planned">— Planned</span>
        <span className="legend-actual">— Actual</span>
        {showForecast && <span style={{ color: 'rgba(212,160,23,0.6)' }}>- - Forecast</span>}
        <span>■ Planned Bar</span>
        <span className="legend-bar-actual">■ Actual Bar</span>
      </div>
    </div>
  );
}
