import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import FileUploader from '../components/upload/FileUploader';
import FileColumnPicker from '../components/upload/FileColumnPicker';
import SandPropertiesEditor from '../components/upload/SandPropertiesEditor';
import { extractSandProperties } from '../utils/fileParser';
import '../components/ui/ui.css';
import './ModulePage.css';

const PETRO_COLUMNS = [
  {
    key: 'name',
    label: 'Sand Name Column',
    autoDetect: h => h.includes('sand') || h.includes('arena') || h.includes('name') || h.includes('zone') || h.includes('formation'),
  },
  {
    key: 'kh',
    label: 'k\u00B7h Column',
    autoDetect: h => h.includes('kh') || h.includes('k*h') || h.includes('k·h') || h.includes('flow capacity'),
  },
];

export default function PetrophysicsPage() {
  const { state, dispatch, activeWell } = useApp();
  const [petroFile, setPetroFile] = useState(null);

  if (!activeWell) {
    return (
      <div className="module-page-empty">
        <div className="empty-icon">&#129514;</div>
        <h2>No Well Selected</h2>
        <p>Go to the <strong>Wells</strong> module and create a well first.</p>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'SET_MODULE', payload: 'wells' })}>
          Go to Wells
        </button>
      </div>
    );
  }

  const saveSands = async (props) => {
    try {
      await api.saveSands(activeWell.id, props);
      dispatch({ type: 'SET_SANDS', payload: props });
      dispatch({ type: 'SET_RESULTS', payload: null });
      dispatch({ type: 'UPDATE_WELL', payload: { id: activeWell.id, data: { sand_count: props.length, has_results: false } } });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFileParsed = (result) => {
    setPetroFile(result);
  };

  const handleConfirmFile = (cols) => {
    const props = extractSandProperties(petroFile.rows, cols.name, cols.kh);
    if (props.length > 0) {
      saveSands(props);
      setPetroFile(null);
    }
  };

  const handleSandChange = (sandProperties) => {
    saveSands(sandProperties);
  };

  const handleClearSands = () => {
    saveSands([]);
  };

  const sands = state.sandProperties;

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h2>Sand Properties</h2>
          <p className="module-desc">
            Define the permeability-thickness product (k&middot;h) for each sand/formation.
            You can upload an Excel file or enter values manually.
          </p>
        </div>
      </div>

      {sands.length > 0 && (
        <div className="module-status success">
          <div className="status-content">
            <strong>{sands.length}</strong> sands defined
          </div>
          <button className="btn btn-sm btn-danger" onClick={handleClearSands}>Clear</button>
        </div>
      )}

      <FileUploader onFileParsed={handleFileParsed} label="Drop petrophysics file here" />

      {petroFile && (
        <FileColumnPicker
          headers={petroFile.headers}
          rows={petroFile.rows}
          columns={PETRO_COLUMNS}
          onConfirm={handleConfirmFile}
          onCancel={() => setPetroFile(null)}
        />
      )}

      {/* Show loaded data preview */}
      {sands.length > 0 && !petroFile && (
        <div className="module-preview-table">
          <h4>Loaded Sand Properties</h4>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sand Name</th>
                  <th>k&middot;h (md&middot;ft)</th>
                  <th>Factor (%)</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const totalKh = sands.reduce((s, p) => s + p.kh, 0);
                  return sands.map((s, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{s.sandName}</td>
                      <td>{s.kh.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td>{totalKh > 0 ? ((s.kh / totalKh) * 100).toFixed(2) : '0.00'}%</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual editor (only when no file is being picked and no data loaded) */}
      {!petroFile && sands.length === 0 && (
        <div style={{ marginTop: 20 }}>
          <SandPropertiesEditor
            sandProperties={sands}
            onChange={handleSandChange}
          />
        </div>
      )}

      <div className="module-nav-buttons">
        <button className="btn" onClick={() => dispatch({ type: 'SET_MODULE', payload: 'production' })}>
          &larr; Production
        </button>
        <button
          className="btn btn-primary"
          onClick={() => dispatch({ type: 'SET_MODULE', payload: 'events' })}
          disabled={sands.length === 0}
        >
          Next: Events &rarr;
        </button>
      </div>
    </div>
  );
}
