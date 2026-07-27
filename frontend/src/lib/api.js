// ============================================================================
// Original author: Munawwar (base Fitness Tracker UI) — extracted from main.jsx
// by Abdullah so feature modules can share the same fetch layer. Abdullah later
// added silent access-token refresh (POST /auth/refresh) so an expired token no
// longer forces a full re-login — see the auth-state bridge below.
// ============================================================================

export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
export const AUTH_KEY = 'fitness-tracker.auth';

export function loadJson(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Silent access-token refresh --------------------------------------------
//
// The backend issues a short-lived access token plus a long-lived, rotating
// refresh token (see server/services/refreshTokenService.js) but nothing used
// to call POST /auth/refresh — an expired access token just forced a full
// re-login. `request`/`downloadReport` now retry once through here instead.
//
// `authState` mirrors the App component's `auth` state so this module can act
// on the current refresh token without every call site having to pass it
// through. The App keeps it in sync via `setAuthState`, and is notified back
// via `onAuthRefresh` so a silent rotation is reflected in React state too.
let authState = null;
let authListener = null;
let refreshPromise = null;

// Auth endpoints must never trigger a refresh-and-retry themselves — a failed
// login attempt, for instance, is not an expired session.
const NO_REFRESH_RETRY = new Set([
  '/auth/login', '/auth/register', '/auth/refresh', '/auth/logout',
  '/auth/verify-email', '/auth/forgot-password', '/auth/reset-password',
]);

export function setAuthState(auth) {
  authState = auth;
}

export function onAuthRefresh(callback) {
  authListener = callback;
}

// De-duplicated so a burst of parallel requests (e.g. the dashboard's initial
// load) shares one rotation instead of racing each other — refresh tokens are
// single-use, so a second concurrent attempt would just fail as "reused".
async function silentRefresh() {
  if (!authState?.refreshToken) return null;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: authState.refreshToken }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const next = { ...authState, token: data.token, refreshToken: data.refreshToken };
        authState = next;
        saveJson(AUTH_KEY, next);
        authListener?.(next);
        return next;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  const config = { method, headers };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    if (body instanceof FormData) {
      config.body = body;
    } else {
      headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(body);
    }
  }

  let response = await fetch(`${API_BASE}${path}`, config);

  if (response.status === 401 && !NO_REFRESH_RETRY.has(path.split('?')[0])) {
    const refreshed = await silentRefresh();
    if (refreshed) {
      headers.Authorization = `Bearer ${refreshed.token}`;
      response = await fetch(`${API_BASE}${path}`, config);
    }
  }

  // 204 has no body — the active-workout endpoint uses it to mean "none".
  if (response.status === 204) return null;

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const error = new Error(data?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function downloadReport(path, filename, token) {
  let response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    const refreshed = await silentRefresh();
    if (refreshed) {
      response = await fetch(`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${refreshed.token}` },
      });
    }
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || 'Report download failed');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function assetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  if (API_BASE.startsWith('http')) return `${new URL(API_BASE).origin}${path}`;
  return path;
}
