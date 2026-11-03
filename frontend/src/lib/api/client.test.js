import { describe, it, expect, vi } from 'vitest';
import { createApiClient, ApiError } from './client';

function jsonResponse(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k) => headers[k] ?? null },
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  };
}

function makeClient(fetchImpl, extra = {}) {
  return createApiClient({ baseUrl: 'https://api.test/api/v1', origin: 'https://api.test', fetchImpl, ...extra });
}

describe('api client', () => {
  it('sends the bearer token and unwraps data', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { data: { id: 'f1' } }));
    const client = makeClient(fetchImpl, { getToken: () => 'tok-123' });
    const data = await client.get('/facilities/f1');
    expect(data).toEqual({ id: 'f1' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.test/api/v1/facilities/f1');
    expect(init.headers.Authorization).toBe('Bearer tok-123');
    expect(init.method).toBe('GET');
  });

  it('returns meta for lists and drops empty query values', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { data: [1, 2], meta: { count: 2 } }));
    const client = makeClient(fetchImpl);
    const res = await client.getList('/inventory', { query: { facility_id: 'x', status: '', blood_group: null } });
    expect(res).toEqual({ data: [1, 2], meta: { count: 2 } });
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.test/api/v1/inventory?facility_id=x');
  });

  it('serialises JSON bodies for POST and PATCH', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { data: {} }));
    const client = makeClient(fetchImpl);
    await client.patch('/facilities/f1', { contact_name: 'A' });
    const init = fetchImpl.mock.calls[0][1];
    expect(init.method).toBe('PATCH');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ contact_name: 'A' });
  });

  it('maps API errors to ApiError with code and details', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(400, { error: { code: 'validation_error', message: 'bad', details: { contact_phone: 'format' } } }),
    );
    const client = makeClient(fetchImpl);
    await expect(client.patch('/facilities/f1', {})).rejects.toMatchObject({
      name: 'ApiError', status: 400, code: 'validation_error', message: 'bad', details: { contact_phone: 'format' },
    });
  });

  it('calls the unauthorized handler on 401', async () => {
    const onUnauthorized = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(401, { error: { code: 'unauthorized', message: 'expired' } }));
    const client = makeClient(fetchImpl, { onUnauthorized });
    await expect(client.get('/me')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not call the unauthorized handler for unauthenticated calls', async () => {
    const onUnauthorized = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(401, {}));
    const client = makeClient(fetchImpl, { onUnauthorized });
    await expect(client.request('POST', '/auth/demo-login', { body: {}, auth: false })).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('reports network failures as network_error', async () => {
    const client = makeClient(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(client.get('/me')).rejects.toMatchObject({ code: 'network_error', status: 0 });
  });

  it('keeps Retry-After on 429', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(429, { error: { code: 'rate_limited' } }, { 'Retry-After': '12' }));
    const client = makeClient(fetchImpl);
    await expect(client.get('/x')).rejects.toMatchObject({ code: 'rate_limited', retryAfter: 12 });
  });

  it('refuses to call anything when no base URL is configured', async () => {
    const fetchImpl = vi.fn();
    const client = createApiClient({ baseUrl: '', origin: '', fetchImpl });
    await expect(client.get('/me')).rejects.toMatchObject({ code: 'not_configured' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reads root /health without a token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { status: 'ok', version: '1.2.0' }));
    const client = makeClient(fetchImpl, { getToken: () => 'tok' });
    expect(await client.rootHealth()).toEqual({ status: 'ok', version: '1.2.0' });
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.test/health');
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
});
