import { useMemo, useState } from 'react';

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function generateDateDescription(date, allocsForDate, decisions, sandProperties) {
  const totalProduction = allocsForDate.reduce((sum, a) => sum + toNumber(a.allocatedProduction), 0);
  
  // Find which period this date belongs to
  const period = decisions?.find(d => date >= d.startDate && date <= d.endDate);
  
  // Build kh map
  const khMap = {};
  sandProperties?.forEach(sp => {
    khMap[sp.sandName] = sp.kh;
  });
  
  // Build sand details with percentages
  const sandDetails = allocsForDate.map(a => {
    const production = toNumber(a.allocatedProduction);
    return {
      name: a.sandName,
      production,
      percentage: Math.abs(totalProduction) > 1e-6 ? (production / totalProduction * 100) : 0,
      kh: khMap[a.sandName] || 0,
    };
  });
  
  // Special case: zero (or near-zero) production
  if (Math.abs(totalProduction) < 1e-6) {
    return 'Producción total: 0.00 BOPD. No se distribuye nada entre las arenas.';
  }
  
  // Generate description based on period method
  if (!period) {
    const sandList = sandDetails.map(s => 
      `${s.name} = ${s.production.toFixed(2)} BOPD (${s.percentage.toFixed(2)}%)`
    ).join(', ');
    return `Se distribuyen ${totalProduction.toFixed(2)} BOPD entre las arenas: ${sandList}.`;
  }
  
  const method = period.method;
  
  if (method === 'kh_distribution') {
    const sandListWithKh = sandDetails.map(s => 
      `${s.name} (kh = ${s.kh})`
    ).join(', ');
    const sandListWithValues = sandDetails.map(s => 
      `${s.name} = ${s.production.toFixed(2)} BOPD (${s.percentage.toFixed(2)}%)`
    ).join(', ');
    return `Producción total: ${totalProduction.toFixed(2)} BOPD. Se distribuye entre las arenas ${sandListWithKh}, resultando en ${sandListWithValues}.`;
  }
  
  if (method === 'decline_plus_incremental') {
    const continuingSands = sandDetails.filter(s => period.continuingSands.includes(s.name));
    const newSands = sandDetails.filter(s => period.newSands.includes(s.name));
    
    // Use period's projected values (averages) as reference for decline estimates
    const projectedValues = period.projectedValues || {};
    let projectedTotal = 0;
    continuingSands.forEach(s => {
      if (projectedValues[s.name]) {
        projectedTotal += projectedValues[s.name];
      } else {
        // Fallback: use actual production if no projected value
        projectedValues[s.name] = s.production;
        projectedTotal += s.production;
      }
    });
    
    // Calculate incremental from actual allocations
    const sumNewProduction = newSands.reduce((sum, s) => sum + s.production, 0);
    const incremental = totalProduction - projectedTotal;
    
    const contList = continuingSands.map(s => 
      `${s.name} = ${projectedValues[s.name]?.toFixed(2) || '0.00'} BOPD`
    ).join(', ');
    
    if (incremental > 0) {
      const newListWithKh = newSands.map(s => 
        `${s.name} (kh = ${s.kh})`
      ).join(', ');
      // Calculate percentages based on incremental for new sands
      const newListWithValues = newSands.map(s => {
        const pct = Math.abs(incremental) > 1e-6 ? (s.production / incremental * 100) : 0;
        return `${s.name} = ${s.production.toFixed(2)} BOPD (${pct.toFixed(2)}%)`;
      }).join(', ');
      return `Producción total: ${totalProduction.toFixed(2)} BOPD. Estimado de declinación de las arenas ${contList}. Incremental de ${incremental.toFixed(2)} BOPD, se distribuye entre las arenas ${newListWithKh}, resultando en ${newListWithValues}.`;
    } else {
      const newList = newSands.map(s => s.name).join(', ');
      const contListWithKh = continuingSands.map(s => 
        `${s.name} (kh = ${s.kh}) = ${s.production.toFixed(2)} BOPD (${s.percentage.toFixed(2)}%)`
      ).join(', ');
      return `Producción total: ${totalProduction.toFixed(2)} BOPD. Estimado de declinación de las arenas ${contList}. Incremental negativo (${incremental.toFixed(2)} BOPD), no se atribuye nada a las arenas nuevas ${newList}, se resta el incremental a las arenas declinadas proporcional a su kh: ${contListWithKh}.`;
    }
  }
  
  if (method === 'decline_with_adjustment') {
    const continuingSands = sandDetails.filter(s => period.continuingSands.includes(s.name));
    
    // For decline_with_adjustment, we need to back-calculate the projected values from actual allocations
    // Formula: actual = projected + (diff * kh / totalKh)
    // We need to solve for projected values given actual values
    
    // Get total kh for continuing sands
    const totalKh = continuingSands.reduce((sum, s) => sum + s.kh, 0);
    
    // The backend applies: actual[i] = projected[i] + diff * (kh[i] / totalKh)
    // Sum of actuals = sum of projected + diff * (sum of kh / totalKh) = sum of projected + diff
    // So: diff = sum of actuals - sum of projected
    // And: sum of projected = totalProduction - diff
    
    // We can use period averages as reference for projected values
    const projectedValues = period.projectedValues || {};
    let projectedTotal = 0;
    continuingSands.forEach(s => {
      if (projectedValues[s.name]) {
        projectedTotal += projectedValues[s.name];
      }
    });
    
    // If we don't have projected values, we can't back-calculate accurately
    // In this case, just show the final values without the breakdown
    if (projectedTotal === 0) {
      const finalList = sandDetails.map(s => 
        `${s.name} = ${s.production.toFixed(2)} BOPD (${s.percentage.toFixed(2)}%)`
      ).join(', ');
      return `Producción total: ${totalProduction.toFixed(2)} BOPD. Distribución con ajuste proporcional al kh: ${finalList}.`;
    }
    
    const incremental = totalProduction - projectedTotal;
    
    const projectedList = continuingSands.map(s => 
      `${s.name} = ${projectedValues[s.name]?.toFixed(2) || '0.00'} BOPD`
    ).join(', ');
    
    const finalList = sandDetails.map(s => 
      `${s.name} = ${s.production.toFixed(2)} BOPD (${s.percentage.toFixed(2)}%)`
    ).join(', ');
    
    const incrementalLabel = incremental < 0 ? `negativo de ${incremental.toFixed(2)}` : `de ${incremental.toFixed(2)}`;
    
    return `Producción total: ${totalProduction.toFixed(2)} BOPD. Estimado de declinación de las arenas ${projectedList}. Incremental ${incrementalLabel} BOPD, se ajusta proporcionalmente al kh: ${finalList}.`;
  }
  
  // Default
  const sandList = sandDetails.map(s => 
    `${s.name} = ${s.production.toFixed(2)} BOPD (${s.percentage.toFixed(2)}%)`
  ).join(', ');
  return `Distribución: ${sandList}.`;
}

export default function DetailedView({ allocations, decisions, sandProperties }) {
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  // Build period options from decisions
  const periodOptions = useMemo(() => {
    if (!decisions || decisions.length === 0) return [];
    return decisions.map((d, idx) => ({
      label: `Period ${idx + 1}: ${d.startDate} to ${d.endDate}`,
      startDate: d.startDate,
      endDate: d.endDate,
    }));
  }, [decisions]);

  // Filter allocations
  const filteredAllocations = useMemo(() => {
    let filtered = [...allocations];

    // Filter by period
    if (selectedPeriod !== 'all') {
      const periodIdx = parseInt(selectedPeriod, 10);
      const period = periodOptions[periodIdx];
      if (period) {
        filtered = filtered.filter(a => 
          a.date >= period.startDate && a.date <= period.endDate
        );
      }
    }

    return filtered;
  }, [allocations, selectedPeriod, periodOptions]);

  // Group by date for display
  const groupedByDate = useMemo(() => {
    const grouped = {};
    filteredAllocations.forEach(a => {
      if (!grouped[a.date]) grouped[a.date] = [];
      grouped[a.date].push(a);
    });
    return grouped;
  }, [filteredAllocations]);

  const dates = useMemo(() => {
    return Object.keys(groupedByDate).sort();
  }, [groupedByDate]);

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const totalPages = Math.ceil(dates.length / pageSize);
  const paginatedDates = dates.slice(page * pageSize, (page + 1) * pageSize);

  if (!allocations || allocations.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No detailed allocation data available. Run the allocation first.
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <h3 style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 600 }}>
        Detailed Allocation by Date
      </h3>
      <p style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
        Shows the allocation decision for each sand on each date. Total records: {filteredAllocations.length}
      </p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '200px', maxWidth: '300px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--color-text-muted)' }}>
            Filter by Period
          </label>
          <select
            value={selectedPeriod}
            onChange={e => { setSelectedPeriod(e.target.value); setPage(0); }}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              color: 'var(--color-text)',
              fontSize: '13px',
            }}
          >
            <option value="all">All Periods</option>
            {periodOptions.map((opt, idx) => (
              <option key={idx} value={idx}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)', width: '120px' }}>Date</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-muted)' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDates.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No records match the current filters.
                </td>
              </tr>
            ) : (
              paginatedDates.map((date, idx) => {
                const allocsForDate = groupedByDate[date];
                const description = generateDateDescription(date, allocsForDate, decisions, sandProperties);
                
                return (
                  <tr
                    key={date}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(139, 143, 163, 0.03)',
                    }}
                  >
                    <td style={{ padding: '14px', fontWeight: 600, color: 'var(--color-text)', verticalAlign: 'top' }}>
                      {date}
                    </td>
                    <td style={{ padding: '14px', color: 'var(--color-text)', lineHeight: '1.6' }}>
                      {description}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: '6px 12px',
              background: page === 0 ? 'var(--color-surface)' : 'var(--color-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              color: page === 0 ? 'var(--color-text-muted)' : '#fff',
              fontSize: '12px',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            style={{
              padding: '6px 12px',
              background: page === totalPages - 1 ? 'var(--color-surface)' : 'var(--color-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              color: page === totalPages - 1 ? 'var(--color-text-muted)' : '#fff',
              fontSize: '12px',
              cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
