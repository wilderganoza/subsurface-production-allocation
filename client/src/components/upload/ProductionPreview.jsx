import { useState } from 'react';
import '../../components/ui/ui.css';

export default function ProductionPreview({ headers, rows, onConfirm }) {
  const [dateCol, setDateCol] = useState(headers[0] || '');
  const [prodCol, setProdCol] = useState(headers[1] || '');

  const handleConfirm = () => {
    if (!dateCol || !prodCol) {
      alert('Please select both Date and Production columns.');
      return;
    }
    onConfirm(dateCol, prodCol);
  };

  return (
    <div className="production-preview">
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Date Column</label>
          <select value={dateCol} onChange={e => setDateCol(e.target.value)}>
            {headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>Total Production Column</label>
          <select value={prodCol} onChange={e => setProdCol(e.target.value)}>
            {headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      </div>

      <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
        <table className="data-table">
          <thead>
            <tr>
              {headers.map(h => <th key={h} style={h === dateCol || h === prodCol ? { color: 'var(--color-primary)' } : {}}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 20).map((row, i) => (
              <tr key={i}>
                {headers.map(h => <td key={h}>{row[h]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 20 && <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 8 }}>Showing 20 of {rows.length} rows</p>}
      </div>

      <button className="btn btn-primary" onClick={handleConfirm}>
        Confirm Columns ({rows.length} rows)
      </button>
    </div>
  );
}
