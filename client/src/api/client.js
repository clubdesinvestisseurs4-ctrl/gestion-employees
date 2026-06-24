import { getToken, forceLogout } from '../utils/session';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const LOGIN_PATHS = ['/api/auth/login', '/api/auth/login-employe'];

function handleUnauthorized(path, status) {
  if (status === 401 && !LOGIN_PATHS.includes(path)) {
    forceLogout();
    return true;
  }
  return false;
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (handleUnauthorized(path, res.status)) {
    throw new Error('Session expirée, veuillez vous reconnecter.');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error((data && data.error) || `Erreur ${res.status}`);
  }
  return data;
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body || {}) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body || {}) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body || {}) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
