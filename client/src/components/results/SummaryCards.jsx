import { useMemo } from 'react';

const COLOR_TOKENS = [
  '--color-chart-1',
  '--color-chart-2',
  '--color-chart-3',
  '--color-chart-4',
  '--color-chart-5',
  '--color-chart-6',
  '--color-chart-7',
  '--color-chart-8',
];

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

  const numberFormat = useMemo(
    () =>
      new Intl.NumberFormat('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const percentFormat = useMemo(
    () =>
      new Intl.NumberFormat('es-PE', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    []
  );

  const styles = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 16,
      }}
    >
      {stats.map((s, i) => {
        const token = COLOR_TOKENS[i % COLOR_TOKENS.length];
        const accent = styles?.getPropertyValue(token).trim() || 'var(--color-primary)';
        return (
          <div
            key={s.sand}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 18px',
              boxShadow: 'var(--shadow-xs)',
              borderTop: `3px solid ${accent}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
            role="region"
            aria-labelledby={`summary-${s.sand}`}
          >
            <div id={`summary-${s.sand}`} style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
              {s.sand}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
              <div>
                Acumulado:{' '}
                <strong style={{ color: 'var(--color-text)' }}>{numberFormat.format(s.cumulative)} bbl</strong>
              </div>
              <div>
                Caudal promedio:{' '}
                <strong style={{ color: 'var(--color-text)' }}>{numberFormat.format(s.avgRate)} bbl/d</strong>
              </div>
              <div>
                Máximo registrado:{' '}
                <strong style={{ color: 'var(--color-text)' }}>{numberFormat.format(s.peakRate)} bbl/d</strong>
              </div>
              <div>
                Participación del total:{' '}
                <strong style={{ color: accent }}>{percentFormat.format(s.pct)}%</strong>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
