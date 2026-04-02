import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import AllocationTable from '../components/results/AllocationTable';
import ProductionChart from '../components/results/ProductionChart';
import DeclineCurveChart from '../components/results/DeclineCurveChart';
import SummaryCards from '../components/results/SummaryCards';
import CriteriaView from '../components/results/CriteriaView';
import DetailedView from '../components/results/DetailedView';
import { exportAllocationsToExcel } from '../utils/exportExcel';
import '../components/ui/ui.css';
import './ModulePage.css';

export default function AllocationPage() {
  const { state, dispatch, activeWell } = useApp();
  const [tab, setTab] = useState('chart');

  if (!activeWell) {
    return (
      <div className="module-page-empty">
        <div className="empty-icon">&#9881;</div>
        <h2>No Well Selected</h2>
        <p>Go to the <strong>Wells</strong> module and create a well first.</p>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'SET_MODULE', payload: 'wells' })}>
          Go to Wells
        </button>
      </div>
    );
  }

  const canRun = state.productionData.length > 0
    && state.sandProperties.length > 0
    && state.interventionMatrix.interventionDates.length > 0;

  const getMissingItems = () => {
    const missing = [];
    if (state.productionData.length === 0) missing.push('Production Data');
    if (state.sandProperties.length === 0) missing.push('Sand Properties (Petrophysics)');
    if (state.interventionMatrix.interventionDates.length === 0) missing.push('Intervention Events');
    return missing;
  };

  const handleRun = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const body = {
        wellName: activeWell.name,
        productionHistory: state.productionData,
        sandProperties: state.sandProperties,
        interventionMatrix: state.interventionMatrix,
        declineModel: state.declineModel || 'best_fit',
      };
      const results = await api.runAllocation(body);
      console.log('runAllocation results keys:', results ? Object.keys(results) : results);
      console.log('runAllocation decisions length:', results?.decisions?.length);
      const allocationRunDate = new Date().toISOString().split('T')[0];

      // Save results to DB
      await api.saveResults(activeWell.id, results);
      api.getResults(activeWell.id).then(data => {
        console.log('Loaded results from API:', data ? Object.keys(data) : data);
        dispatch({ type: 'SET_RESULTS', payload: data });
      }).catch(console.error);
      dispatch({
        type: 'UPDATE_WELL',
        payload: {
          id: activeWell.id,
          data: {
            has_results: true,
            allocationDate: allocationRunDate,
          },
        },
      });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleDeclineModelChange = async (model) => {
    dispatch({ type: 'SET_DECLINE_MODEL', payload: model });
    try {
      await api.updateWell(activeWell.id, { decline_model: model });
      dispatch({ type: 'UPDATE_WELL', payload: { id: activeWell.id, data: { decline_model: model } } });
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = () => {
    if (state.results) {
      exportAllocationsToExcel(state.results.allocations, activeWell.name);
    }
  };

  const results = state.results;
  const startProductionDate = state.productionData.length > 0
    ? state.productionData[0].date
    : activeWell?.startDate || null;
  const lastProductionDate = state.productionData.length > 0
    ? state.productionData[state.productionData.length - 1].date
    : null;
  const allocationDate = activeWell?.allocationDate || null;

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h2>Allocation</h2>
          <p className="module-desc">
            Configure and run the subsurface production allocation. The engine uses flow capacity (k&middot;h) factors and Arps decline curve analysis to distribute production among sands.
          </p>
        </div>
      </div>

      <div className="allocation-config">
        <h3>Configuration</h3>

        <div className="config-summary">
          <div className="config-item">
            <span className="config-label">Production Records:</span>
            <span className={state.productionData.length > 0 ? '' : 'config-missing'}>
              {state.productionData.length || 'Not loaded'}
            </span>
          </div>
          <div className="config-item">
            <span className="config-label">Sands:</span>
            <span className={state.sandProperties.length > 0 ? '' : 'config-missing'}>
              {state.sandProperties.length > 0
                ? state.sandProperties.map(s => s.sandName).join(', ')
                : 'Not defined'}
            </span>
          </div>
          <div className="config-item">
            <span className="config-label">Interventions:</span>
            <span className={state.interventionMatrix.interventionDates.length > 0 ? '' : 'config-missing'}>
              {state.interventionMatrix.interventionDates.length || 'Not configured'}
            </span>
          </div>
          <div className="config-item">
            <span className="config-label">Start Date:</span>
            <span className={startProductionDate ? '' : 'config-missing'}>
              {startProductionDate || 'Not available'}
            </span>
          </div>
          <div className="config-item">
            <span className="config-label">Last Date:</span>
            <span className={lastProductionDate ? '' : 'config-missing'}>
              {lastProductionDate || 'Not available'}
            </span>
          </div>
          <div className="config-item">
            <span className="config-label">Allocation Date:</span>
            <span className={allocationDate ? '' : 'config-missing'}>
              {allocationDate ? allocationDate.slice(0, 10) : 'Not available'}
            </span>
          </div>
        </div>

        {!canRun && (
          <div className="module-status warning">
            <strong>Missing data:</strong> {getMissingItems().join(', ')}
          </div>
        )}

        <div className="form-group" style={{ maxWidth: 300 }}>
          <label>Decline Curve Model</label>
          <select
            value={state.declineModel}
            onChange={e => handleDeclineModelChange(e.target.value)}
          >
            <option value="best_fit">Best Fit (auto)</option>
            <option value="exponential">Exponential</option>
            <option value="hyperbolic">Hyperbolic</option>
            <option value="harmonic">Harmonic</option>
          </select>
        </div>

        {state.error && (
          <div className="module-status error">{state.error}</div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-primary btn-run" onClick={handleRun} disabled={!canRun || state.isLoading}>
            {state.isLoading ? 'Computing...' : 'Run Allocation'}
          </button>
          {state.isLoading && <div className="spinner" />}
        </div>
      </div>

      {results && (
        <div className="allocation-results">
          <div className="results-header">
            <h3>Results</h3>
            <button className="btn btn-sm btn-primary" onClick={handleExport}>
              Export Excel
            </button>
          </div>

          <div className="results-tab-bar">
            {[
              { key: 'chart', label: 'Production Chart' },
              { key: 'decline', label: 'Decline Curves' },
              { key: 'criteria', label: 'Criteria' },
              { key: 'detailed', label: 'Detailed' },
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
          </div>

          <div className="tab-content">
            {tab === 'chart' && <ProductionChart allocations={results.allocations} interventionDates={state.interventionMatrix.interventionDates} />}
            {tab === 'decline' && (
              <DeclineCurveChart
                allocations={results.allocations}
                declineFits={results.declineFits}
                productionHistory={state.productionData}
                decisions={results.decisions}
                interventionDates={state.interventionMatrix.interventionDates}
              />
            )}
            {tab === 'criteria' && <CriteriaView decisions={results.decisions} />}
            {tab === 'detailed' && <DetailedView allocations={results.allocations} decisions={results.decisions} sandProperties={state.sandProperties} />}
            {tab === 'table' && <AllocationTable allocations={results.allocations} />}
            {tab === 'summary' && <SummaryCards allocations={results.allocations} />}
          </div>
        </div>
      )}
    </div>
  );
}
