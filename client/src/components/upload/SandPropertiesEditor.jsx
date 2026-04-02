import { useState, useEffect } from 'react';
import '../../components/ui/ui.css';

export default function SandPropertiesEditor({ sandProperties, onChange }) {
  const [rows, setRows] = useState(sandProperties.length > 0 ? sandProperties : [{ sandName: '', kh: '' }]);

  // Sync when props change (e.g. after file upload or DB load)
  useEffect(() => {
    if (sandProperties.length > 0) {
      setRows(sandProperties);
    } else {
      setRows([{ sandName: '', kh: '' }]);
    }
  }, [sandProperties]);

  const updateRow = (idx, field, value) => {
    const updated = rows.map((r, i) => i === idx ? { ...r, [field]: value } : r);
    setRows(updated);
    emitChange(updated);
  };

  const addRow = () => {
    setRows([...rows, { sandName: '', kh: '' }]);
  };

  const removeRow = (idx) => {
    const updated = rows.filter((_, i) => i !== idx);
    setRows(updated);
    emitChange(updated);
  };

  const emitChange = (data) => {
    const valid = data
      .filter(r => r.sandName && r.kh)
      .map(r => ({ sandName: r.sandName.trim(), kh: parseFloat(r.kh) || 0 }))
      .filter(r => r.kh > 0);
    onChange(valid);
  };

  return (
    <div>
      <table className="data-table sand-editor-table">
        <thead>
          <tr>
            <th>Sand Name</th>
            <th>kh (md-ft)</th>
            <th style={{ width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>
                <input
                  value={row.sandName}
                  onChange={e => updateRow(i, 'sandName', e.target.value)}
                  placeholder="e.g. Sand A"
                />
              </td>
              <td>
                <input
                  type="number"
                  value={row.kh}
                  onChange={e => updateRow(i, 'kh', e.target.value)}
                  placeholder="e.g. 1200"
                  min="0"
                />
              </td>
              <td>
                {rows.length > 1 && (
                  <button className="btn btn-sm btn-danger" onClick={() => removeRow(i)}>x</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn btn-sm" onClick={addRow} style={{ marginTop: 8 }}>+ Add Sand</button>
    </div>
  );
}
