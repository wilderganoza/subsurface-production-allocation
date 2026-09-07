import { useState } from 'react';
import { useApp } from '../context/AppContext';
import FileUploader from '../components/upload/FileUploader';
import ProductionPreview from '../components/upload/ProductionPreview';
import SandPropertiesEditor from '../components/upload/SandPropertiesEditor';
import InterventionMatrix from '../components/upload/InterventionMatrix';
import AllocationTable from '../components/results/AllocationTable';
import ProductionChart from '../components/results/ProductionChart';
import DeclineCurveChart from '../components/results/DeclineCurveChart';
import SummaryCards from '../components/results/SummaryCards';
import { runAllocation } from '../api/allocation';
import { extractProductionData, extractInterventionMatrix } from '../utils/fileParser';
import { exportAllocationsToExcel } from '../utils/exportExcel';
import '../components/ui/ui.css';
import './WellPage.css';

export default function WellPage() {
  const { state, dispatch, activeWell } = useApp();
  const step = state.currentStep;

  // Temporary file parse state
  const [prodFile, setProdFile] = useState(null);
  const [interventionFile, setInterventionFile] = useState(null);

  if (!activeWell) {
    return (
      <div className="well-page-empty">
        <h2>No Well Selected</h2>
        <p>Add a well from the sidebar to get started.</p>
      </div>
    );
  }

  const setStep = (s) => dispatch({ type: 'SET_STEP', payload: s });
  const updateWell = (data) => dispatch({ type: 'UPDATE_WELL', payload: { id: activeWell.id, data } });

  // Step 1: Production data upload
  const handleProdFileParsed = (result) => {
    setProdFile(result);
  };

  const handleProdConfirm = (dateCol, prodCol) => {
    const data = extractProductionData(prodFile.rows, dateCol, prodCol);
    updateWell({ productionData: data });
    setProdFile(null);
    setStep(2);
  };

  // Step 2: Sand properties
  const handleSandChange = (sandProperties) => {
    updateWell({ sandProperties });
  };

  // Step 3: Intervention matrix
  const handleInterventionFileParsed = (result) => {
    setInterventionFile(result);
    const im = extractInterventionMatrix(result.headers, result.rows);
    updateWell({ interventionMatrix: im });
  };

  const handleMatrixChange = (im) => {
    updateWell({ interventionMatrix: im });
  };

  // Step 4: Run allocation
  const handleRun = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const results = await runAllocation(activeWell);
      dispatch({ type: 'SET_RESULTS', payload: { id: activeWell.id, results } });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleExport = () => {
    if (activeWell.results) {
      exportAllocationsToExcel(activeWell.results.allocations, activeWell.name);
    }
  };

  const sandNames = activeWell.sandProperties.map(s => s.sandName);

  return (
    <div className="well-page">
      <div className="well-page-header">
        <h2>{activeWell.name}</h2>
        <div className="step-indicator">
          {[1, 2, 3, 4, 5].map(s => (
            <div
              key={s}
              className={`step ${s === step ? 'active' : ''} ${s < step ? 'done' : ''}`}
              onClick={() => s <= step && setStep(s)}
              style={{ cursor: s <= step ? 'pointer' : 'default' }}
            />
          ))}
        </div>
        <div className="step-labels">
          {['Production Data', 'Sand Properties', 'Interventions', 'Configure', 'Results'].map((l, i) => (
            <span key={i} className={`step-label ${i + 1 === step ? 'active' : ''}`}>{l}</span>
          ))}
        </div>
      </div>

      <div className="well-page-content">
        {/* STEP 1: Production Data */}
        {step === 1 && (
          <div className="step-section">
            <h3>Step 1: Upload Production Data</h3>
            <p className="step-desc">Upload an Excel or CSV file with daily production data (Date and Total Production columns).</p>

            {activeWell.productionData.length > 0 && (
              <div className="step-status success">
                {activeWell.productionData.length} records loaded ({activeWell.productionData[0].date} to {activeWell.productionData[activeWell.productionData.length - 1].date})
              </div>
            )}

            <FileUploader onFileParsed={handleProdFileParsed} label="Drop production data file here" />

            {prodFile && (
              <div style={{ marginTop: 16 }}>
                <ProductionPreview
                  headers={prodFile.headers}
                  rows={prodFile.rows}
                  onConfirm={handleProdConfirm}
                />
              </div>
            )}

            {activeWell.productionData.length > 0 && (
              <button className="btn btn-primary" onClick={() => setStep(2)} style={{ marginTop: 16 }}>
                Next: Sand Properties
              </button>
            )}
          </div>
        )}

        {/* STEP 2: Sand Properties */}
        {step === 2 && (
          <div className="step-section">
            <h3>Step 2: Sand Properties (k*h)</h3>
            <p className="step-desc">Enter the permeability-thickness product for each sand/formation.</p>

            <SandPropertiesEditor
              sandProperties={activeWell.sandProperties}
              onChange={handleSandChange}
            />

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setStep(1)}>Back</button>
              <button
                className="btn btn-primary"
                onClick={() => setStep(3)}
                disabled={activeWell.sandProperties.length === 0}
              >
                Next: Intervention Matrix
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Intervention Matrix */}
        {step === 3 && (
          <div className="step-section">
            <h3>Step 3: Intervention Matrix</h3>
            <p className="step-desc">Define which sands were active at each intervention date. Click cells to toggle. You can also upload a matrix file.</p>

            <div style={{ marginBottom: 16 }}>
              <FileUploader
                onFileParsed={handleInterventionFileParsed}
                label="Upload intervention matrix (optional)"
              />
            </div>

            <InterventionMatrix
              sandNames={sandNames}
              interventionMatrix={activeWell.interventionMatrix}
              onChange={handleMatrixChange}
            />

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setStep(2)}>Back</button>
              <button
                className="btn btn-primary"
                onClick={() => setStep(4)}
                disabled={activeWell.interventionMatrix.interventionDates.length === 0}
              >
                Next: Configure & Run
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Configure & Run */}
        {step === 4 && (
          <div className="step-section">
            <h3>Step 4: Configure & Run Allocation</h3>

            <div className="config-summary">
              <div className="config-item">
                <span className="config-label">Production records:</span>
                <span>{activeWell.productionData.length}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Active sands:</span>
                <span>{sandNames.join(', ')}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Interventions:</span>
                <span>{activeWell.interventionMatrix.interventionDates.length}</span>
              </div>
            </div>

            <div className="form-group" style={{ maxWidth: 300 }}>
              <label>Decline Curve Model</label>
              <select
                value={activeWell.declineModel}
                onChange={e => updateWell({ declineModel: e.target.value })}
              >
                <option value="best_fit">Best Fit (auto)</option>
                <option value="exponential">Exponential</option>
                <option value="hyperbolic">Hyperbolic</option>
                <option value="harmonic">Harmonic</option>
              </select>
            </div>

            {state.error && (
              <div className="step-status error">{state.error}</div>
            )}

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => setStep(3)}>Back</button>
              <button className="btn btn-primary" onClick={handleRun} disabled={state.isLoading}>
                {state.isLoading ? 'Computing...' : 'Run Allocation'}
              </button>
              {state.isLoading && <div className="spinner" />}
            </div>
          </div>
        )}

        {/* STEP 5: Results */}
        {step === 5 && activeWell.results && (
          <div className="step-section">
            <h3>Results</h3>

            {activeWell.results.warnings.length > 0 && (
              <div className="step-status warning">
                <strong>Warnings:</strong>
                <ul>
                  {activeWell.results.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            <div className="results-tabs">
              <ResultsContent
                results={activeWell.results}
                productionHistory={activeWell.productionData}
                onExport={handleExport}
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <button className="btn" onClick={() => setStep(4)}>Back to Config</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultsContent({ results, productionHistory, onExport }) {
  const [tab, setTab] = useState('chart');

  return (
    <div>
      <div className="tab-bar">
        {[
          { key: 'chart', label: 'Production Chart' },
          { key: 'decline', label: 'Decline Curves' },
          { key: 'table', label: 'Data Table' },
          { key: 'summary', label: 'Summary' },
        ].map(t => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        <button className="btn btn-sm btn-primary" onClick={onExport} style={{ marginLeft: 'auto' }}>
          Export Excel
        </button>
      </div>

      <div className="tab-content">
        {tab === 'chart' && <ProductionChart allocations={results.allocations} />}
        {tab === 'decline' && (
          <DeclineCurveChart
            allocations={results.allocations}
            declineFits={results.declineFits}
            productionHistory={productionHistory}
          />
        )}
        {tab === 'table' && <AllocationTable allocations={results.allocations} />}
        {tab === 'summary' && <SummaryCards allocations={results.allocations} />}
      </div>
    </div>
  );
}
