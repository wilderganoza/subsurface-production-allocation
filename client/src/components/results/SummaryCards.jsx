import { useMemo } from 'react';

const COLOR_HEX = ['#4a7cff', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#38bdf8', '#fb923c'];

export default function SummaryCards({ allocations }) {
  const stats = useMemo(() => {
    const sandMap = {};
    let grandTotal = 0;

    for (const a of allocations) {
      if (!sandMap[a.sandName]) sandMap[a.sandName] = { cum: 0, count: 0, max: 0 };
      sandMap[a.sandName].cum += a.allocatedProduction;
      sandMap[a.sandName].count++;
      sandMap[a.sandName].max = Math.max(sandMap[a.sandName].max, a.allocatedProduction);
      grandTotal += a.allocatedProduction;
    }

    return Object.entries(sandMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([sand, data]) => ({
        sand,
        cumulative: data.cum,
        avgRate: data.count > 0 ? data.cum / data.count : 0,
        peakRate: data.max,
        pct: grandTotal > 0 ? (data.cum / grandTotal) * 100 : 0,
      }));
  }, [allocations]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
      {stats.map((s, i) => (
        <div
          key={s.sand}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            padding: 16,
            borderTop: `3px solid ${COLOR_HEX[i % COLOR_HEX.length]}`,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{s.sand}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 2 }}>
            <div>Cumulative: <strong style={{ color: 'var(--color-text)' }}>{s.cumulative.toFixed(1)}</strong></div>
            <div>Avg Rate: <strong style={{ color: 'var(--color-text)' }}>{s.avgRate.toFixed(2)}</strong></div>
            <div>Peak Rate: <strong style={{ color: 'var(--color-text)' }}>{s.peakRate.toFixed(2)}</strong></div>
            <div>% of Total: <strong style={{ color: COLOR_HEX[i % COLOR_HEX.length] }}>{s.pct.toFixed(1)}%</strong></div>
          </div>
        </div>
      ))}
    </div>
  );
}
