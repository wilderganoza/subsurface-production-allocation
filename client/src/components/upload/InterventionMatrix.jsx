import { useState, useEffect } from 'react';
import '../../components/ui/ui.css';

export default function InterventionMatrix({ sandNames, interventionMatrix, onChange }) {
  const [dates, setDates] = useState(interventionMatrix.interventionDates || []);
  const [matrix, setMatrix] = useState(interventionMatrix.matrix || []);
  const [newDate, setNewDate] = useState('');

  // Sync from parent when interventionMatrix changes (e.g. file upload)
  useEffect(() => {
    setDates(interventionMatrix.interventionDates || []);
    setMatrix(interventionMatrix.matrix || []);
  }, [interventionMatrix]);

  // Sync matrix rows when sandNames change (manual edits in petrophysics)
  useEffect(() => {
    if (sandNames.length === 0 || dates.length === 0) return;
    setMatrix(prev => {
      if (prev.length === sandNames.length) return prev;
      return sandNames.map((_, si) => {
        if (prev[si]) return prev[si];
        return dates.map(() => false);
      });
    });
  }, [sandNames.length]);

  const addDate = () => {
    if (!newDate) return;
    if (dates.includes(newDate)) {
      alert('This date already exists.');
      return;
    }
    const updatedDates = [...dates, newDate].sort();
    const insertIdx = updatedDates.indexOf(newDate);

    let updatedMatrix = matrix.map(row => {
      const newRow = [...row];
      newRow.splice(insertIdx, 0, false);
      return newRow;
    });

    if (updatedMatrix.length === 0) {
      for (let i = 0; i < sandNames.length; i++) {
        updatedMatrix.push(updatedDates.map(() => false));
      }
    }

    setDates(updatedDates);
    setMatrix(updatedMatrix);
    setNewDate('');
    emitChange(updatedDates, updatedMatrix);
  };

  const removeDate = (idx) => {
    const updatedDates = dates.filter((_, i) => i !== idx);
    const updatedMatrix = matrix.map(row => row.filter((_, i) => i !== idx));
    setDates(updatedDates);
    setMatrix(updatedMatrix);
    emitChange(updatedDates, updatedMatrix);
  };

  const toggleCell = (sandIdx, dateIdx) => {
    const updatedMatrix = matrix.map((row, si) =>
      si === sandIdx ? row.map((v, di) => di === dateIdx ? !v : v) : row
    );
    setMatrix(updatedMatrix);
    emitChange(dates, updatedMatrix);
  };

  const emitChange = (d, m) => {
    onChange({
      sandNames: [...sandNames],
      interventionDates: d,
      matrix: m,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addDate();
  };

  return (
    <div className="intervention-matrix-editor">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'end' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label>Add Intervention Date</label>
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button className="btn btn-sm btn-primary" onClick={addDate}>Add Date</button>
      </div>

      {dates.length > 0 && sandNames.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Sand</th>
                {dates.map((d, i) => (
                  <th key={d} className="im-date-header" style={{ textAlign: 'center', position: 'relative' }}>
                    <span>{d}</span>
                    <button
                      className="im-remove-date"
                      onClick={() => removeDate(i)}
                      title="Remove date"
                    >
                      &#x2715;
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sandNames.map((sand, si) => (
                <tr key={sand}>
                  <td style={{ fontWeight: 500 }}>{sand}</td>
                  {dates.map((_, di) => (
                    <td
                      key={di}
                      onClick={() => toggleCell(si, di)}
                      style={{
                        cursor: 'pointer',
                        textAlign: 'center',
                        background: matrix[si]?.[di] ? 'rgba(74,124,255,0.15)' : 'transparent',
                        fontWeight: 600,
                        color: matrix[si]?.[di] ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      }}
                    >
                      {matrix[si]?.[di] ? 'X' : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
          {sandNames.length === 0 ? 'Define sand properties first.' : 'Add at least one intervention date.'}
        </p>
      )}
    </div>
  );
}
