export const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || 'http://127.0.0.1:8000';

async function request(path, options) {
  const res = await fetch(`${FASTAPI_URL}${path}`, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export function askQuestion({ question, sessionId, history }) {
  return request('/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      session_id: sessionId,
      history,
      user: localStorage.getItem('adminUsername') || undefined,
    }),
  });
}

export async function checkHealth() {
  try {
    const res = await fetch(`${FASTAPI_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// Chat history is stored in MongoDB by the backend; reading it needs the admin login,
// so it must be the same backend the admin logged in through.
const BACKEND_URL =
  import.meta.env.VITE_HISTORY_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function backendRequest(path, options = {}) {
  const token = localStorage.getItem('adminToken');
  const res = await fetch(`${BACKEND_URL}/api/mcp-history${path}`, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export function fetchHistory(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  return backendRequest(`?${query.toString()}`);
}

export const fetchHistoryEntry = (id) => backendRequest(`/${id}`);
export const fetchHistoryStats = (days = 14) => backendRequest(`/stats?days=${days}`);
export const deleteHistoryEntry = (id) => backendRequest(`/${id}`, { method: 'DELETE' });
export const clearHistory = (before) => backendRequest(before ? `?before=${before}` : '', { method: 'DELETE' });

export const timeNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(ms) {
  if (ms == null) return '-';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}
