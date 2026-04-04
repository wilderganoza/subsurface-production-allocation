import { useState, useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const COLORS = [
  '#4a7cff', '#34d399', '#fbbf24', '#f87171', '#a78bfa',
  '#f472b6', '#38bdf8', '#fb923c', '#4ade80', '#c084fc',
  '#e879f9', '#22d3ee',
];

function formatModelName(model) {
  if (!model) return '';
  return model
    .split(/[_\s-]+/)
    .map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : part)
    .join(' ');
}

function compareDateStr(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

function maxDateStr(a, b) {
  return compareDateStr(a, b) >= 0 ? a : b;
}

function evaluateDeclineLocal(fit, tDays) {
  const { qi, di, b, model } = fit;
  if (model === 'exponential') return qi * Math.exp(-di * tDays);
  if (model === 'hyperbolic') return qi / Math.pow(1 + b * di * tDays, 1 / b);
  return qi / (1 + di * tDays);
}

function evaluateDeclineFromAnchor(fit, anchorValue, tDays) {
  const { di, b, model } = fit;
  if (model === 'exponential') return anchorValue * Math.exp(-di * tDays);
  if (model === 'hyperbolic') return anchorValue / Math.pow(1 + b * di * tDays, 1 / b);
  return anchorValue / (1 + di * tDays);
}

function extractPeriodStart(periodLabel) {
  if (!periodLabel || typeof periodLabel !== 'string') return null;
  const match = periodLabel.match(/Before\s+(\d{4}-\d{2}-\d{2})/i);
  if (match) return match[1];
  const isoMatch = periodLabel.match(/(\d{4}-\d{2}-\d{2})/);
  return isoMatch ? isoMatch[1] : null;
}

export default function DeclineCurveChart({ allocations, declineFits, productionHistory, decisions = [], interventionDates = [] }) {
  const { theme } = useTheme();
  
  const chartLineColor = getComputedStyle(document.documentElement).getPropertyValue('--color-chart-line').trim();
  const chartAxisColor = getComputedStyle(document.documentElement).getPropertyValue('--color-chart-axis').trim();
  const tooltipBg = getComputedStyle(document.documentElement).getPropertyValue('--color-tooltip-bg').trim();
  const tooltipBorder = getComputedStyle(document.documentElement).getPropertyValue('--color-tooltip-border').trim();
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim();

  if (!allocations || allocations.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No allocation data available.</p>;
  }

  // Get unique sand names from allocations (always reliable)
  const allSandNames = useMemo(() => {
    const names = new Set();
    for (const a of allocations) {
      if (a.sandName && a.sandName !== '_UNALLOCATED_') names.add(a.sandName);
    }
    return [...names];
  }, [allocations]);

  const [selectedSand, setSelectedSand] = useState(allSandNames[0] || '');

  const sandColorMap = useMemo(() => {
    const map = {};
    allSandNames.forEach((s, i) => { map[s] = COLORS[i % COLORS.length]; });
    return map;
  }, [allSandNames]);

  // Per-sand daily allocated production
  const dateAllocMap = useMemo(() => {
    const map = {};
    for (const a of allocations) {
      if (a.sandName === '_UNALLOCATED_') continue;
      if (!map[a.date]) map[a.date] = {};
      map[a.date][a.sandName] = (map[a.date][a.sandName] || 0) + a.allocatedProduction;
    }
    return map;
  }, [allocations]);

  const visibleSands = [selectedSand];

  const visibleFits = useMemo(() => {
    if (!declineFits || declineFits.length === 0) return [];
    return declineFits.filter(f => f.sand === selectedSand);
  }, [declineFits, selectedSand]);

  const declinePeriodBounds = useMemo(() => {
    const map = {};
    decisions?.forEach(decision => {
      if (!decision?.startDate || !decision?.endDate) return;
      const method = decision.method;
      if (method !== 'decline_with_adjustment' && method !== 'decline_plus_incremental') return;
      const sands = decision.continuingSands || [];
      sands.forEach(sand => {
        map[`${decision.startDate}:${sand}`] = {
          start: decision.startDate,
          end: decision.endDate,
        };
      });
    });
    return map;
  }, [decisions]);

  const lastProductionDate = productionHistory.length > 0
    ? productionHistory[productionHistory.length - 1].date
    : null;

  // Build chart data
  const chartData = useMemo(() => {
    const data = productionHistory.map(r => {
      const point = { date: r.date };
      for (const sand of visibleSands) {
        const val = dateAllocMap[r.date]?.[sand] || 0;
        point[sand] = Math.round(val * 100) / 100;
      }
      return point;
    });

    // Add decline curves: project from the END of the fit period's actual data
    for (let fi = 0; fi < visibleFits.length; fi++) {
      const fit = visibleFits[fi];
      const endDate = fit.endDate;  // projection starts at end of fit period
      const label = fit.sand || `Fit${fi + 1}`;
      const key = `dcl_${label}_${fi}`;
      const periodStartLabel = extractPeriodStart(fit.period);
      const boundsKey = periodStartLabel ? `${periodStartLabel}:${fit.sand}` : null;
      const bounds = boundsKey ? declinePeriodBounds[boundsKey] : null;
      const rawStart = bounds?.start || periodStartLabel || endDate;
      const rawEnd = bounds?.end || lastProductionDate;
      const projectionStart = maxDateStr(endDate, rawStart);
      const projectionEnd = rawEnd;

      if (!projectionEnd || compareDateStr(projectionEnd, projectionStart) < 0) {
        continue;
      }

      // Find the actual allocated value at the end of the fit period to anchor the projection
      const endPoint = data.find(p => p.date === endDate);
      const anchorValue = endPoint ? endPoint[fit.sand] : null;

      if (anchorValue != null && anchorValue > 0) {
        for (const point of data) {
          if (compareDateStr(point.date, projectionStart) >= 0 && compareDateStr(point.date, projectionEnd) <= 0) {
            const tDays = daysBetween(endDate, point.date);
            // Use anchor value as qi so the dashed line continues from the solid line
            point[key] = Math.round(evaluateDeclineFromAnchor(fit, anchorValue, tDays) * 100) / 100;
          }
        }
      } else {
        // Fallback: use the model's qi from the fit start
        for (const point of data) {
          if (compareDateStr(point.date, projectionStart) >= 0 && compareDateStr(point.date, projectionEnd) <= 0) {
            const tDays = daysBetween(endDate, point.date);
            point[key] = Math.round(evaluateDeclineLocal(fit, tDays) * 100) / 100;
          }
        }
      }
    }

    return data;
  }, [productionHistory, visibleSands, visibleFits, dateAllocMap, declinePeriodBounds, lastProductionDate]);

  return (
    <div>
      {/* Sand selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {allSandNames.map(sand => (
          <button
            key={sand}
            className={`btn btn-sm ${selectedSand === sand ? 'btn-primary' : ''}`}
            onClick={() => setSelectedSand(sand)}
            style={selectedSand !== sand ? { borderColor: sandColorMap[sand], color: sandColorMap[sand] } : {}}
          >
            {sand}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={450}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: chartAxisColor }} tickFormatter={v => v.slice(5)} />
          <YAxis tick={{ fontSize: 11, fill: chartAxisColor }} />
          <Tooltip
            contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: textColor }}
            formatter={(value, name) => [typeof value === 'number' ? value.toFixed(1) : value, name]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />

          {/* Sand allocated production line */}
          {visibleSands.map(sand => (
            <Line
              key={`line_${sand}`}
              type="monotone"
              dataKey={sand}
              stroke={sandColorMap[sand]}
              strokeWidth={2}
              dot={false}
              name={`${sand} (allocated)`}
            />
          ))}

          {/* Decline projection lines (dashed, on top) */}
          {visibleFits.map((fit, fi) => {
            const label = fit.sand || `Fit${fi + 1}`;
            const key = `dcl_${label}_${fi}`;
            const color = fit.sand ? sandColorMap[fit.sand] : COLORS[fi % COLORS.length];
            const legendName = `${label} decline ${fi + 1} (${formatModelName(fit.model)})`;
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={2.5}
                strokeDasharray="8 4"
                dot={false}
                name={legendName}
              />
            );
          })}

          {/* Vertical reference lines at intervention dates */}
          {interventionDates.map((date, idx) => {
            return (
              <ReferenceLine
                key={`int_${idx}`}
                x={date}
                stroke={chartLineColor}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                strokeOpacity={0.5}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Fit details table */}
      {visibleFits.length > 0 && (
        <div style={{ marginTop: 16, overflowX: 'auto' }}>
          <table className="data-table decline-table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>Sand</th>
                <th>Model</th>
                <th>Qi (BOPD)</th>
                <th>Di (1/day)</th>
                <th>b</th>
                <th>R²</th>
                <th>Fit Period</th>
              </tr>
            </thead>
            <tbody>
              {visibleFits.map((fit, fi) => {
                const label = fit.sand || `Fit ${fi + 1}`;
                const color = fit.sand ? sandColorMap[fit.sand] : COLORS[fi % COLORS.length];
                return (
                  <tr key={fi}>
                    <td style={{ color, fontWeight: 600 }}>{label}</td>
                    <td>{formatModelName(fit.model)}</td>
                    <td>{fit.qi?.toFixed(2)}</td>
                    <td>{fit.di?.toFixed(6)}</td>
                    <td>{fit.b > 0 && fit.b !== 1 ? fit.b.toFixed(3) : '-'}</td>
                    <td>{fit.r2 >= 0 ? fit.r2.toFixed(4) : 'N/A'}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{fit.startDate} → {fit.endDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
