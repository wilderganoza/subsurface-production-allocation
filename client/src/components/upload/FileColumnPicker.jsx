import { useState, useEffect } from 'react';
import '../../components/ui/ui.css';
import './FileColumnPicker.css';

/**
 * Unified column picker for all file uploads.
 * Props:
 *   headers: string[] - column headers from the file
 *   rows: object[] - parsed rows
 *   columns: [{ key, label, autoDetect }] - columns to select
 *   onConfirm: (selectedCols) => void
 *   onCancel: () => void
 */
export default function FileColumnPicker({ headers, rows, columns, onConfirm, onCancel }) {
  const [selected, setSelected] = useState({});

  const formatHeader = (header) => {
    if (!header) return header;
    return header
      .split(/\s+/)
      .map(word => {
        if (/^\(.*\)$/.test(word)) return word;
        const lower = word.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(' ');
  };

  // Auto-detect columns on mount
  useEffect(() => {
    const auto = {};
    columns.forEach((col, i) => {
      if (col.autoDetect) {
        const found = headers.find(h => col.autoDetect(h.toLowerCase()));
        auto[col.key] = found || headers[i] || '';
      } else {
        auto[col.key] = headers[i] || '';
      }
    });
    setSelected(auto);
  }, [headers]);

  const handleChange = (key, value) => {
    setSelected(prev => ({ ...prev, [key]: value }));
  };

  const allSelected = columns.every(col => selected[col.key]);

  const handleConfirm = () => {
    if (!allSelected) return;
    onConfirm(selected);
  };

  // Determine which headers are selected for highlighting
  const selectedHeaders = new Set(Object.values(selected));

  return (
    <div className="file-column-picker">
      <div className="picker-header">
        <h4>Select Columns</h4>
        <p className="picker-desc">Found {rows.length} rows. Map each column to confirm.</p>
      </div>

      <div className="picker-selectors">
        {columns.map(col => (
          <div className="form-group" key={col.key}>
            <label>{col.label}</label>
            <select value={selected[col.key] || ''} onChange={e => handleChange(col.key, e.target.value)}>
              <option value="">-- Select --</option>
              {headers.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="picker-preview">
        <div className="table-scroll" style={{ maxHeight: 260 }}>
          <table className="data-table picker-table">
            <thead>
              <tr>
                {headers.map(h => (
                  <th key={h} className={selectedHeaders.has(h) ? 'col-highlight' : ''}>{formatHeader(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 15).map((row, i) => (
                <tr key={i}>
                  {headers.map(h => (
                    <td key={h} className={selectedHeaders.has(h) ? 'col-highlight' : ''}>{row[h]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 15 && (
          <p className="picker-more">Showing 15 of {rows.length} rows</p>
        )}
      </div>

      <div className="picker-actions">
        <button className="btn btn-primary" onClick={handleConfirm} disabled={!allSelected}>
          Confirm ({rows.length} rows)
        </button>
        {onCancel && <button className="btn" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}
