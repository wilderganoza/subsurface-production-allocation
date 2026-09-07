import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import FileUploader from '../components/upload/FileUploader';
import FileColumnPicker from '../components/upload/FileColumnPicker';
import { extractProductionData } from '../utils/fileParser';
import '../components/ui/ui.css';
import './ModulePage.css';

const PROD_COLUMNS = [
  {
    key: 'date',
    label: 'Date Column',
    autoDetect: h => h.includes('date') || h.includes('fecha'),
  },
  {
    key: 'production',
    label: 'Total Production Column',
    autoDetect: h => h.includes('prod') || h.includes('rate') || h.includes('oil') || h.includes('bopd'),
  },
];

export default function ProductionPage() {
  const { state, dispatch, activeWell } = useApp();
  const [prodFile, setProdFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const steps = ['Wells', 'Production', 'Petrophysics', 'Events', 'Allocation'];
  const currentStep = 1;

  if (!activeWell) {
    return (
      <div className="module-page-empty">
        <div className="empty-icon">&#128202;</div>
        <h2>No Well Selected</h2>
        <p>Go to the <strong>Wells</strong> module and create a well first.</p>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'SET_MODULE', payload: 'wells' })}>
          Go to Wells
        </button>
      </div>
    );
  }

  const handleProdFileParsed = (result) => {
    setProdFile(result);
  };

  const handleConfirm = async (cols) => {
    const data = extractProductionData(prodFile.rows, cols.date, cols.production);
    setSaving(true);
    try {
      await api.saveProduction(activeWell.id, data);
      dispatch({ type: 'SET_PRODUCTION', payload: data });
      dispatch({ type: 'SET_RESULTS', payload: null });
      const startDate = data.length > 0
        ? data.reduce((min, record) => (record.date < min ? record.date : min), data[0].date)
        : null;
      const lastDate = data.length > 0
        ? data.reduce((max, record) => (record.date > max ? record.date : max), data[0].date)
        : null;
      dispatch({
        type: 'UPDATE_WELL',
        payload: {
          id: activeWell.id,
          data: {
            production_count: data.length,
            has_results: false,
            startDate,
            lastProductionDate: lastDate,
            allocationDate: null,
          },
        },
      });
      setProdFile(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = async () => {
    try {
      await api.saveProduction(activeWell.id, []);
      dispatch({ type: 'SET_PRODUCTION', payload: [] });
      dispatch({ type: 'SET_RESULTS', payload: null });
      dispatch({
        type: 'UPDATE_WELL',
        payload: {
          id: activeWell.id,
          data: {
            production_count: 0,
            has_results: false,
            startDate: null,
            lastProductionDate: null,
            allocationDate: null,
          },
        },
      });
    } catch (err) {
      alert(err.message);
    }
  };

  const prod = state.productionData;

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
          <h2>Production Data</h2>
          <p className="module-desc">
            Upload an Excel or CSV file with daily production history. The file must contain a Date column and a Total Production column.
          </p>
        </div>
        <div className="module-header-actions">
          <span className="module-well-label">
            Active well:&nbsp;<strong>{activeWell.name}</strong>
          </span>
        </div>
      </div>

      {prod.length > 0 && (
        <div className="module-status success" role="status">
          <div className="status-content">
            <strong>{prod.length.toLocaleString()}</strong> records loaded &mdash; From <strong>{prod[0].date}</strong> to <strong>{prod[prod.length - 1].date}</strong>
          </div>
          <div className="table-actions">
            <button className="btn btn-sm btn-danger" onClick={handleClearData}>Clear Data</button>
          </div>
        </div>
      )}

      {saving && (
        <div className="module-status info" role="status">
          <div className="status-content">Saving production data to the database...</div>
          <div className="spinner" aria-hidden="true" />
        </div>
      )}

      <div className="module-card">
        <h3>Upload production file</h3>
        <FileUploader onFileParsed={handleProdFileParsed} label="Drag & drop your production data" />
        <p className="module-desc">You can upload Excel (.xlsx, .xls) or CSV files. Use the template exported from your historian to speed up mapping.</p>
      </div>

      {prodFile && (
        <div className="module-card">
          <FileColumnPicker
            headers={prodFile.headers}
            rows={prodFile.rows}
            columns={PROD_COLUMNS}
            onConfirm={handleConfirm}
            onCancel={() => setProdFile(null)}
          />
        </div>
      )}

      {prod.length > 0 && !prodFile && (
        <div className="module-card module-preview-table">
          <h3>Loaded data preview</h3>
          <p className="module-desc">Showing the first 20 records. Make sure the time series is complete and increasing by date.</p>
          <div className="module-table-wrapper">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Total Production (bbl/d)</th>
                  </tr>
                </thead>
                <tbody>
                  {prod.slice(0, 20).map((r, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{r.date}</td>
                      <td>{r.totalProduction.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {prod.length > 20 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        … and {prod.length - 20} more records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {prod.length > 0 && (
        <div className="module-nav-buttons">
          <button
            className="btn btn-primary"
            onClick={() => dispatch({ type: 'SET_MODULE', payload: 'petrophysics' })}
          >
            Next: Petrophysics &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
