import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { api, setToken, getStoredToken } from '../api/client';

const AppContext = createContext();

export const MODULES = ['wells', 'production', 'petrophysics', 'events', 'allocation', 'users'];

const initialState = {
  // Auth
  user: null,
  authChecked: false,

  // Data
  wells: [],
  activeWellId: null,
  currentModule: 'wells',
  isLoading: false,
  error: null,

  // Active well data (loaded on demand)
  productionData: [],
  sandProperties: [],
  interventionMatrix: { sandNames: [], interventionDates: [], matrix: [] },
  results: null,
  declineModel: 'best_fit',
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_AUTH':
      return { ...state, user: action.payload, authChecked: true };
    case 'LOGOUT':
      return { ...initialState, authChecked: true };
    case 'SET_WELLS':
      return { ...state, wells: action.payload };
    case 'ADD_WELL': {
      return { ...state, wells: [...state.wells, action.payload], activeWellId: action.payload.id, currentModule: 'production' };
    }
    case 'REMOVE_WELL': {
      const wells = state.wells.filter(w => w.id !== action.payload);
      const activeWellId = state.activeWellId === action.payload
        ? (wells.length > 0 ? wells[0].id : null)
        : state.activeWellId;
      return {
        ...state, wells, activeWellId,
        currentModule: wells.length > 0 ? state.currentModule : 'wells',
        productionData: [], sandProperties: [],
        interventionMatrix: { sandNames: [], interventionDates: [], matrix: [] },
        results: null,
      };
    }
    case 'SET_ACTIVE_WELL':
      return {
        ...state, activeWellId: action.payload,
        productionData: [], sandProperties: [],
        interventionMatrix: { sandNames: [], interventionDates: [], matrix: [] },
        results: null,
      };
    case 'SET_MODULE': {
      const nextModule = action.payload;
      if (nextModule === 'users' && !state.user?.is_admin) {
        return state;
      }
      return { ...state, currentModule: nextModule, error: null };
    }
    case 'UPDATE_WELL': {
      const wells = state.wells.map(w =>
        w.id === action.payload.id ? { ...w, ...action.payload.data } : w
      );
      return { ...state, wells };
    }
    case 'SET_PRODUCTION':
      return { ...state, productionData: action.payload };
    case 'SET_SANDS':
      return { ...state, sandProperties: action.payload };
    case 'SET_INTERVENTIONS':
      return { ...state, interventionMatrix: action.payload };
    case 'SET_RESULTS':
      return { ...state, results: action.payload };
    case 'SET_DECLINE_MODEL':
      return { ...state, declineModel: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const activeWell = state.wells.find(w => w.id === state.activeWellId) || null;

  // Check auth on mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      dispatch({ type: 'SET_AUTH', payload: null });
      return;
    }
    api.me()
      .then(data => dispatch({ type: 'SET_AUTH', payload: data.user }))
      .catch(() => {
        setToken(null);
        dispatch({ type: 'SET_AUTH', payload: null });
      });
  }, []);

  // Load wells when authenticated
  useEffect(() => {
    if (!state.user) return;
    api.getWells().then(wells => {
      const mapped = wells.map(w => ({
        id: w.id,
        name: w.name,
        decline_model: w.decline_model,
        production_count: parseInt(w.production_count),
        sand_count: parseInt(w.sand_count),
        intervention_count: parseInt(w.intervention_count),
        has_results: parseInt(w.has_results) > 0,
        startDate: w.first_production_date || null,
        lastProductionDate: w.last_production_date || null,
        allocationDate: w.allocation_date || null,
      }));
      dispatch({ type: 'SET_WELLS', payload: mapped });
    }).catch(console.error);
  }, [state.user]);

  // Load well data when activeWellId changes
  useEffect(() => {
    if (!state.activeWellId || !state.user) return;
    const id = state.activeWellId;

    api.getProduction(id).then(data => dispatch({ type: 'SET_PRODUCTION', payload: data })).catch(console.error);
    api.getSands(id).then(data => dispatch({ type: 'SET_SANDS', payload: data })).catch(console.error);
    api.getInterventions(id).then(data => dispatch({ type: 'SET_INTERVENTIONS', payload: data })).catch(console.error);
    api.getResults(id).then(data => dispatch({ type: 'SET_RESULTS', payload: data })).catch(console.error);

    // Load decline model from well
    const well = state.wells.find(w => w.id === id);
    if (well) dispatch({ type: 'SET_DECLINE_MODEL', payload: well.decline_model || 'best_fit' });
  }, [state.activeWellId, state.user]);

  const login = useCallback(async (username, password) => {
    const data = await api.login(username, password);
    setToken(data.token);
    dispatch({ type: 'SET_AUTH', payload: data.user });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    dispatch({ type: 'LOGOUT' });
  }, []);

  const value = { state, dispatch, activeWell, login, logout };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
