/**
 * Thin fetch wrapper for CAELUM_API (/api/v1).
 * - adds the Bearer token (Supabase session or demo token)
 * - unwraps the {"data", "meta"} envelope
 * - turns {"error": {code, message, details}} into an ApiError
 * - calls onUnauthorized() on any 401 so the app can sign out
 */
import { config } from '../config';

export class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message || code || `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildQuery(query) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.append(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function createApiClient({
  baseUrl = config.apiBaseUrl,
  origin = config.apiOrigin,
  getToken = () => null,
  onUnauthorized = () => {},
  fetchImpl,
} = {}) {
  const state = { getToken, onUnauthorized };
  const doFetch = (...args) => (fetchImpl || globalThis.fetch)(...args);

  async function send(url, { method = 'GET', body, auth = true, signal } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
      const token = await state.getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
      response = await doFetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      throw new ApiError(0, 'network_error', 'The CAELUM API did not answer. Check your connection and try again.');
    }

    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const err = payload?.error || {};
      const apiError = new ApiError(
        response.status,
        err.code || (response.status === 401 ? 'unauthorized' : 'http_error'),
        err.message || `Request failed (${response.status})`,
        err.details || null,
      );
      if (response.status === 429) apiError.retryAfter = Number(response.headers?.get?.('Retry-After')) || null;
      if (response.status === 401 && auth) state.onUnauthorized(apiError);
      throw apiError;
    }
    return payload;
  }

  function ensureBase() {
    if (!baseUrl) {
      throw new ApiError(0, 'not_configured', 'VITE_API_BASE_URL is not set for this build.');
    }
  }

  async function requestFull(method, path, { query, body, auth, signal } = {}) {
    ensureBase();
    const payload = await send(`${baseUrl}${path}${buildQuery(query)}`, { method, body, auth, signal });
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return { data: payload.data, meta: payload.meta || {} };
    }
    return { data: payload, meta: {} };
  }

  async function request(method, path, options) {
    return (await requestFull(method, path, options)).data;
  }

  return {
    get baseUrl() { return baseUrl; },
    setTokenProvider(fn) { state.getToken = fn; },
    setUnauthorizedHandler(fn) { state.onUnauthorized = fn; },
    request,
    requestFull,
    get: (path, options) => request('GET', path, options),
    getList: (path, options) => requestFull('GET', path, options),
    post: (path, body, options) => request('POST', path, { ...options, body: body ?? {} }),
    patch: (path, body, options) => request('PATCH', path, { ...options, body }),
    /** Root /health lives outside /api/v1 and needs no token. */
    async rootHealth() {
      ensureBase();
      return send(`${origin}/health`, { auth: false });
    },
  };
}

export const api = createApiClient();
