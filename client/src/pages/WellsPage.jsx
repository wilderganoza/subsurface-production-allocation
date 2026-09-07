import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import './WellsPage.css';

export default function WellsPage() {
  const { state, dispatch } = useApp();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const well = await api.createWell(name);
      dispatch({
        type: 'ADD_WELL',
        payload: {
          id: well.id,
          name: well.name,
          decline_model: well.decline_model,
          production_count: 0,
          sand_count: 0,
          intervention_count: 0,
          has_results: false,
          startDate: null,
          lastProductionDate: null,
          allocationDate: null,
        },
      });
      setNewName('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  const handleStartEdit = (well) => {
    setEditingId(well.id);
    setEditName(well.name);
  };

  const handleSaveEdit = async (id) => {
    const name = editName.trim();
    if (name) {
      try {
        await api.updateWell(id, { name });
        dispatch({ type: 'UPDATE_WELL', payload: { id, data: { name } } });
      } catch (err) {
        alert(err.message);
      }
    }
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteWell(id);
      dispatch({ type: 'REMOVE_WELL', payload: id });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSelect = (id) => {
    dispatch({ type: 'SET_ACTIVE_WELL', payload: id });
    dispatch({ type: 'SET_MODULE', payload: 'production' });
  };

  const getWellStatus = (well) => {
    if (well.has_results) return { label: 'Allocated', cls: 'allocated' };
    if (well.intervention_count > 0) return { label: 'Events Loaded', cls: 'events' };
    if (well.sand_count > 0) return { label: 'Properties Loaded', cls: 'props' };
    if (well.production_count > 0) return { label: 'Production Loaded', cls: 'prod' };
    return { label: 'New', cls: 'new' };
  };

  return (
    <div className="wells-page">
      <div className="wells-header-section">
        <h2>Well Management</h2>
        <p className="wells-desc">Create and manage wells. Click on a well to select it and navigate to other modules.</p>
      </div>

      <div className="wells-add-section">
        <input
          type="text"
          placeholder="Enter well name..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="wells-input"
        />
        <button className="btn btn-primary" onClick={handleAdd} disabled={!newName.trim()}>
          + Add Well
        </button>
      </div>

      {state.wells.length === 0 ? (
        <div className="wells-empty">
          <div className="wells-empty-icon">&#128373;</div>
          <h3>No Wells Yet</h3>
          <p>Add your first well to get started with the allocation process.</p>
        </div>
      ) : (
        <div className="wells-table-wrapper">
          <table className="wells-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Production Records</th>
                <th>Sands</th>
                <th>Interventions</th>
                <th>Start Date</th>
                <th>Last Date</th>
                <th>Allocation Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.wells.map(well => {
                const status = getWellStatus(well);
                const isActive = well.id === state.activeWellId;
                return (
                  <tr
                    key={well.id}
                    className={isActive ? 'well-row active' : 'well-row'}
                    onClick={() => handleSelect(well.id)}
                  >
                    <td>
                      {editingId === well.id ? (
                        <input
                          className="well-name-input"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEdit(well.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onBlur={() => handleSaveEdit(well.id)}
                          onClick={e => e.stopPropagation()}
                          autoFocus
                        />
                      ) : (
                        <span className="well-name">{well.name}</span>
                      )}
                    </td>
                    <td>
                      <span className={`well-status ${status.cls}`}>{status.label}</span>
                    </td>
                    <td>{well.production_count || '-'}</td>
                    <td>{well.sand_count || '-'}</td>
                    <td>{well.intervention_count || '-'}</td>
                    <td>{well.startDate || '-'}</td>
                    <td>{well.lastProductionDate || '-'}</td>
                    <td>{well.allocationDate ? well.allocationDate.slice(0, 10) : '-'}</td>
                    <td className="well-actions">
                      <button
                        className="btn btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleStartEdit(well); }}
                      >
                        Rename
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={(e) => { e.stopPropagation(); handleDelete(well.id); }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
