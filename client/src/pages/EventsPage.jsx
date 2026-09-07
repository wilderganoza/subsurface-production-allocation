import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import FileUploader from '../components/upload/FileUploader';
import InterventionMatrix from '../components/upload/InterventionMatrix';
import { extractInterventionMatrix } from '../utils/fileParser';
import WellSelector from '../components/layout/WellSelector';
import '../components/ui/ui.css';
import './ModulePage.css';

export default function EventsPage() {
  const { state, dispatch, activeWell } = useApp();
  const [previewData, setPreviewData] = useState(null);
  const steps = ['Wells', 'Production', 'Petrophysics', 'Events', 'Allocation'];
  const currentStep = 3;

  if (!activeWell) {
    return (
      <div className="module-page-empty">
        <div className="empty-icon">&#128197;</div>
        <h2>No Well Selected</h2>
        <p>Go to the <strong>Wells</strong> module and create a well first.</p>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'SET_MODULE', payload: 'wells' })}>
          Go to Wells
        </button>
      </div>
    );
  }

  const sandNames = state.sandProperties.map(s => s.sandName);

  const saveInterventions = async (im) => {
    try {
      await api.saveInterventions(activeWell.id, im);
      dispatch({ type: 'SET_INTERVENTIONS', payload: im });
      dispatch({ type: 'SET_RESULTS', payload: null });
      dispatch({ type: 'UPDATE_WELL', payload: { id: activeWell.id, data: { intervention_count: im.interventionDates.length, has_results: false } } });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFileParsed = (result) => {
    const im = extractInterventionMatrix(result.headers, result.rows);
    setPreviewData(im);
  };

  const handleConfirmFile = async () => {
    if (previewData) {
      await saveInterventions(previewData);
      setPreviewData(null);
    }
  };

  const handleMatrixChange = (im) => {
    saveInterventions(im);
  };

  const im = state.interventionMatrix;

  if (state.sandProperties.length === 0) {
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
          <div><h2>Intervention History</h2></div>
          <WellSelector />
        </div>
        <div className="module-page-empty" style={{ flex: 'unset', padding: '40px 0' }}>
          <div className="empty-icon">&#128197;</div>
          <h2>Sands Not Defined</h2>
          <p>You need to define sand properties in the <strong>Petrophysics</strong> module before configuring events.</p>
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'SET_MODULE', payload: 'petrophysics' })}>
            Go to Petrophysics
          </button>
        </div>
      </div>
    );
  }

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
          <h2>Intervention History</h2>
          <p className="module-desc">
            Define which sands were active (open) at each intervention date. You can upload an Excel matrix or manually toggle each cell.
            Mark with <strong>X</strong> the sands that were open at each date.
          </p>
        </div>
        <div className="module-header-actions">
          <span className="module-well-label">
            Active well:&nbsp;<strong>{activeWell.name}</strong>
          </span>
        </div>
      </div>

      {im.interventionDates.length > 0 && !previewData && (
        <div className="module-status success" role="status">
          <div className="status-content">
            <strong>{im.interventionDates.length}</strong> intervention dates configured &mdash; <strong>{im.sandNames.length}</strong> sands in matrix
          </div>
        </div>
      )}

      <div className="module-card">
        <h3>Upload intervention matrix</h3>
        <FileUploader
          onFileParsed={handleFileParsed}
          label="Drag & drop intervention matrix"
        />
        <p className="module-desc">
          The file should contain a header row with intervention dates (YYYY-MM-DD) and rows for each sand. Cells with <strong>X</strong> indicate the sand was open.
        </p>
      </div>

      {/* File preview before confirming */}
      {previewData && (
        <div className="module-card">
          <h3>Preview intervention matrix</h3>
          <p className="module-desc">
            {previewData.sandNames.length} sands &middot; {previewData.interventionDates.length} intervention dates detected. Review before importing.
          </p>
          <div className="module-table-wrapper">
            <div className="table-scroll" style={{ maxHeight: 350 }}>
              <table className="data-table intervention-preview-table">
                <thead>
                  <tr>
                    <th>Sand</th>
                    {previewData.interventionDates.map(d => (
                      <th key={d} style={{ textAlign: 'center' }}>{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.sandNames.map((sand, si) => (
                    <tr key={sand}>
                      <td style={{ fontWeight: 500 }}>{sand}</td>
                      {previewData.interventionDates.map((_, di) => (
                        <td
                          key={`${sand}-${di}`}
                          style={{
                            textAlign: 'center',
                            fontWeight: 600,
                            color: previewData.matrix[si]?.[di] ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            background: previewData.matrix[si]?.[di] ? 'rgba(74,124,255,0.12)' : 'transparent',
                          }}
                        >
                          {previewData.matrix[si]?.[di] ? 'X' : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="module-nav-buttons" style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => setPreviewData(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleConfirmFile}>
              Confirm import
            </button>
          </div>
        </div>
      )}

      {/* Editable matrix (only when data is loaded and no file preview) */}
      {!previewData && (
        <div className="module-card">
          <h3>Manual intervention editor</h3>
          <p className="module-desc">Toggle the sands that were open at each intervention date. Use the Add Date button to capture workovers or completions.</p>
          <InterventionMatrix
            sandNames={sandNames}
            interventionMatrix={im}
            onChange={handleMatrixChange}
          />
        </div>
      )}

      <div className="module-nav-buttons">
        <button className="btn" onClick={() => dispatch({ type: 'SET_MODULE', payload: 'petrophysics' })}>
          &larr; Petrophysics
        </button>
        <button
          className="btn btn-primary"
          onClick={() => dispatch({ type: 'SET_MODULE', payload: 'allocation' })}
          disabled={im.interventionDates.length === 0}
        >
          Next: Allocation &rarr;
        </button>
      </div>
    </div>
  );
}
