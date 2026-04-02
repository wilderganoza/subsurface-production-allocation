import { useMemo } from 'react';
import { AreaChart, Area, Line, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts';

const COLOR_HEX = ['#4a7cff', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#38bdf8', '#fb923c'];

/**
 * Builds period-based sand ordering.
 * Each period maintains the order of existing sands and adds new sands on top.
 * Returns an array of periods with their sand order.
 */
function buildPeriodSandOrders(allocations, interventionDates) {
  if (interventionDates.length === 0) {
    // No interventions, single period with all sands
    const sandSet = new Set(allocations.map(a => a.sandName));
    return [{
      startDate: null,
      endDate: null,
      sands: [...sandSet].sort()
    }];
  }

  // Sort intervention dates chronologically
  const sortedInterventions = [...interventionDates].sort((a, b) => a.localeCompare(b));
  
  // Build periods between interventions
  const periods = [];
  let previousSandOrder = [];

  for (let i = 0; i < sortedInterventions.length; i++) {
    const startDate = sortedInterventions[i];
    const endDate = i < sortedInterventions.length - 1 
      ? sortedInterventions[i + 1] 
      : '9999-12-31';

    // Find sands active in this period (with production > 0)
    const activeSands = new Set();
    for (const a of allocations) {
      if (a.date >= startDate && a.date < endDate && a.allocatedProduction > 0) {
        activeSands.add(a.sandName);
      }
    }

    // Separate into existing (from previous period) and new sands
    const existingSands = previousSandOrder.filter(s => activeSands.has(s));
    const newSands = [...activeSands].filter(s => !previousSandOrder.includes(s)).sort();

    // Order for this period: existing sands maintain position, new sands go on top
    const periodSandOrder = [...existingSands, ...newSands];

    periods.push({
      startDate,
      endDate,
      sands: periodSandOrder
    });

    // Update for next iteration
    previousSandOrder = periodSandOrder;
  }

  return periods;
}

/**
 * Assigns consistent colors to sands across all periods.
 */
function assignSandColors(allocations) {
  const allSands = [...new Set(allocations.map(a => a.sandName))].sort();
  const colorMap = {};
  allSands.forEach((sand, i) => {
    colorMap[sand] = COLOR_HEX[i % COLOR_HEX.length];
  });
  return colorMap;
}

function CustomLegend({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <ul className="recharts-default-legend" style={{ margin: 0, padding: 0, display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        {items.map(entry => (
          <li
            key={entry.value}
            className="recharts-legend-item"
            style={{ display: 'inline-flex', alignItems: 'center', marginRight: 12, gap: 4 }}
          >
            <span
              className="recharts-legend-icon"
              style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: entry.color, borderRadius: 2 }}
            />
            <span className="recharts-legend-item-text" style={{ color: 'var(--color-text)' }}>{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ProductionChart({ allocations, interventionDates = [] }) {
  const { chartData, periodSandOrders, colorMap } = useMemo(() => {
    const dateMap = {};

    // Build date map with all sand data
    for (const a of allocations) {
      if (!dateMap[a.date]) dateMap[a.date] = { date: a.date };
      dateMap[a.date][a.sandName] = Math.round(a.allocatedProduction * 100) / 100;
    }

    // Ensure intervention dates exist in dateMap so ReferenceLine works
    for (const d of interventionDates) {
      if (!dateMap[d]) dateMap[d] = { date: d };
    }

    const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate total production for each date
    const allSands = [...new Set(allocations.map(a => a.sandName))];
    chartData.forEach(point => {
      let total = 0;
      allSands.forEach(sand => {
        total += point[sand] || 0;
      });
      point._total = Math.round(total * 100) / 100;
    });

    // Build period-based sand orders
    const periodSandOrders = buildPeriodSandOrders(allocations, interventionDates);
    
    // Assign consistent colors to all sands
    const colorMap = assignSandColors(allocations);

    return { chartData, periodSandOrders, colorMap };
  }, [allocations, interventionDates]);

  // Downsample for performance but always keep intervention dates
  const displayData = useMemo(() => {
    if (chartData.length <= 500) return chartData;

    const intSet = new Set(interventionDates);
    const step = Math.ceil(chartData.length / 500);
    return chartData.filter((d, i) => i % step === 0 || intSet.has(d.date));
  }, [chartData, interventionDates]);

  // Collect all unique sands for legend
  const allSands = useMemo(() => {
    return [...new Set(allocations.map(a => a.sandName))].sort();
  }, [allocations]);

  const legendItems = useMemo(() => {
    const items = allSands.map(sand => ({
      value: sand,
      type: 'square',
      id: sand,
      color: colorMap[sand],
    }));
    // Add total production to legend
    items.push({
      value: 'Total Production',
      type: 'line',
      id: '_total',
      color: '#ffffff',
    });
    return items;
  }, [allSands, colorMap]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#8b8fa3' }}
          tickFormatter={v => v.slice(5)}
        />
        <YAxis tick={{ fontSize: 11, fill: '#8b8fa3' }} />
        <Tooltip
          contentStyle={{ background: '#1a1d27', border: '1px solid #2a2e3a', borderRadius: 8, fontSize: 13 }}
          labelStyle={{ color: '#e4e6ed' }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          content={() => <CustomLegend items={legendItems} />}
        />
        {interventionDates.map((date) => (
          <ReferenceLine
            key={`int-${date}`}
            x={date}
            stroke="#ffffff"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
        ))}
        {/* Render areas by period with different stackIds */}
        {periodSandOrders.map((period, periodIdx) => {
          const stackId = `period-${periodIdx}`;
          
          return period.sands.map((sand) => {
            // Create a custom dataKey function that only shows data for this period
            const dataKey = (dataPoint) => {
              const date = dataPoint.date;
              const isInPeriod = period.startDate === null || 
                (date >= period.startDate && date < period.endDate);
              return isInPeriod ? (dataPoint[sand] || 0) : null;
            };

            return (
              <Area
                key={`${stackId}-${sand}`}
                type="monotone"
                dataKey={dataKey}
                stackId={stackId}
                stroke={colorMap[sand]}
                fill={colorMap[sand]}
                fillOpacity={0.6}
                name={sand}
                connectNulls={false}
              />
            );
          });
        })}
        {/* Total production line (dashed) */}
        <Line
          type="monotone"
          dataKey="_total"
          stroke="#ffffff"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          dot={false}
          name="Total Production"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
