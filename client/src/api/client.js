const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api';

function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

export function getStoredToken() {
  return getToken();
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    setToken(null);
    window.location.reload();
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.errors?.join('; ') || 'Server error');
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  // Auth
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/auth/me'),

  // Wells
  getWells: () => request('/wells'),
  createWell: (name) => request('/wells', { method: 'POST', body: JSON.stringify({ name }) }),
  updateWell: (id, data) => request(`/wells/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWell: (id) => request(`/wells/${id}`, { method: 'DELETE' }),

  // Production
  getProduction: (wellId) => request(`/wells/${wellId}/production`),
  saveProduction: (wellId, data) =>
    request(`/wells/${wellId}/production`, { method: 'POST', body: JSON.stringify({ data }) }),

  // Sand properties
  getSands: (wellId) => request(`/wells/${wellId}/sands`),
  saveSands: (wellId, data) =>
    request(`/wells/${wellId}/sands`, { method: 'POST', body: JSON.stringify({ data }) }),

  // Interventions
  getInterventions: (wellId) => request(`/wells/${wellId}/interventions`),
  saveInterventions: (wellId, payload) =>
    request(`/wells/${wellId}/interventions`, { method: 'POST', body: JSON.stringify(payload) }),

  // Allocation
  runAllocation: (body) =>
    request('/allocate', { method: 'POST', body: JSON.stringify(body) }),

  // Results
  getResults: (wellId) => request(`/wells/${wellId}/results`),
  saveResults: (wellId, results) =>
    request(`/wells/${wellId}/results`, { method: 'POST', body: JSON.stringify({ results }) }),

  // Admin users
  getAdminUsers: () => request('/admin/users'),
  createAdminUser: (data) => request('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateAdminUser: (id, data) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAdminUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
};
