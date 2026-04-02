import { useState, useMemo } from 'react';
import '../../components/ui/ui.css';

export default function AllocationTable({ allocations }) {
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Pivot: group by date, each sand is a column
  const { pivotRows, sands } = useMemo(() => {
    const sandSet = new Set();
    const dateMap = {};

    for (const a of allocations) {
      sandSet.add(a.sandName);
      if (!dateMap[a.date]) dateMap[a.date] = { date: a.date };
      dateMap[a.date][a.sandName] = Math.round(a.allocatedProduction * 100) / 100;
    }

    const sands = [...sandSet].sort();
    const pivotRows = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

    // Add total column
    for (const row of pivotRows) {
      row._total = sands.reduce((s, sand) => s + (row[sand] || 0), 0);
      row._total = Math.round(row._total * 100) / 100;
    }

    return { pivotRows, sands };
  }, [allocations]);

  const totalPages = Math.ceil(pivotRows.length / pageSize);
  const pageRows = pivotRows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div>
      <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
        <table className="data-table allocation-data-table">
          <thead>
            <tr>
              <th>Date</th>
              {sands.map(s => <th key={s}>{s}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(row => (
              <tr key={row.date}>
                <td>{row.date}</td>
                {sands.map(s => <td key={s}>{(row[s] || 0).toFixed(2)}</td>)}
                <td style={{ fontWeight: 600 }}>{row._total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', justifyContent: 'center' }}>
          <button className="btn btn-sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Prev</button>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button className="btn btn-sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</button>
        </div>
      )}
    </div>
  );
}
