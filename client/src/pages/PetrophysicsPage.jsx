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

  const steps = ['Wells', 'Production', 'Petrophysics', 'Events', 'Allocation'];
  const currentStep = 2;

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
      <div className="step-indicator">
        {steps.map((step, idx) => (
          <div
            key={step}
            className={`step ${idx < currentStep ? 'done' : ''} ${idx === currentStep ? 'active' : ''}`}
            aria-label={step}
          />
        ))}
      </div>

      <div className="module-header">
        <div>
          <h2>Sand Properties</h2>
          <p className="module-desc">
            Define the permeability-thickness product (k&middot;h) for each sand/formation.
            You can upload an Excel file or enter values manually.
          </p>
        </div>
        <div className="module-header-actions">
          <span className="module-well-label">
            Active well:&nbsp;<strong>{activeWell.name}</strong>
          </span>
        </div>
      </div>

      {sands.length > 0 && (
        <div className="module-status success" role="status">
          <div className="status-content">
            <strong>{sands.length}</strong> sands defined
          </div>
          <div className="table-actions">
            <button className="btn btn-sm btn-danger" onClick={handleClearSands}>Clear</button>
          </div>
        </div>
      )}

      <div className="module-card">
        <h3>Upload sand properties</h3>
        <FileUploader onFileParsed={handleFileParsed} label="Drag & drop k·h file" />
        <p className="module-desc">Each row must include a sand name and its k·h value (md·ft). The tool will auto-detect the correct columns.</p>
      </div>

      {petroFile && (
        <div className="module-card">
          <FileColumnPicker
            headers={petroFile.headers}
            rows={petroFile.rows}
            columns={PETRO_COLUMNS}
            onConfirm={handleConfirmFile}
            onCancel={() => setPetroFile(null)}
          />
        </div>
      )}

      {/* Show loaded data preview */}
      {sands.length > 0 && !petroFile && (
        <div className="module-card module-preview-table">
          <h3>Loaded sand properties</h3>
          <p className="module-desc">k·h is used to weight allocation during surplus/deficit adjustments. Ensure values reflect current flow capacity.</p>
          <div className="module-table-wrapper">
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
        </div>
      )}

      {/* Manual editor (only when no file is being picked and no data loaded) */}
      {!petroFile && sands.length === 0 && (
        <div className="module-card">
          <h3>Manual entry</h3>
          <p className="module-desc">Add each sand with its k·h. The list updates the allocation engine immediately.</p>
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
