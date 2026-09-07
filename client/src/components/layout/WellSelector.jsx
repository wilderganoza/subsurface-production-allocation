import { useApp } from '../../context/AppContext';
import './WellSelector.css';

export default function WellSelector() {
  const { state, dispatch, activeWell } = useApp();

  if (state.wells.length === 0) return null;

  return (
    <div className="well-selector">
      <label className="well-selector-label">Well:</label>
      <select
        className="well-selector-select"
        value={state.activeWellId || ''}
        onChange={e => dispatch({ type: 'SET_ACTIVE_WELL', payload: e.target.value })}
      >
        {state.wells.map(w => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </select>
    </div>
  );
}
