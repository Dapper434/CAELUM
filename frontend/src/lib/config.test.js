import { describe, it, expect } from 'vitest';
import { readConfig, resolveApiOrigin } from './config';

describe('config', () => {
  it('uses VITE_API_BASE_URL and strips a trailing /api/v1', () => {
    expect(resolveApiOrigin({ VITE_API_BASE_URL: 'https://api.example.org/api/v1/' })).toBe('https://api.example.org');
    expect(resolveApiOrigin({ VITE_API_BASE_URL: 'https://api.example.org/api' })).toBe('https://api.example.org');
    expect(readConfig({ VITE_API_BASE_URL: 'https://api.example.org' }).apiBaseUrl).toBe('https://api.example.org/api/v1');
  });

  it('falls back to the local API only in dev', () => {
    expect(resolveApiOrigin({ DEV: true })).toBe('http://localhost:5000');
    expect(resolveApiOrigin({ DEV: false, PROD: true })).toBe('');
    expect(readConfig({ PROD: true }).apiBaseUrl).toBe('');
  });

  it('enables demo mode only for the string true', () => {
    expect(readConfig({ VITE_DEMO_MODE: 'true' }).demoMode).toBe(true);
    expect(readConfig({ VITE_DEMO_MODE: 'TRUE' }).demoMode).toBe(true);
    expect(readConfig({ VITE_DEMO_MODE: '1' }).demoMode).toBe(false);
    expect(readConfig({}).demoMode).toBe(false);
  });

  it('gives the same base URL for the Render origin with or without /api/v1', () => {
    for (const v of ['https://caelum-api.onrender.com', 'https://caelum-api.onrender.com/', 'https://caelum-api.onrender.com/api/v1', 'https://caelum-api.onrender.com/api/v1/']) {
      expect(readConfig({ VITE_API_BASE_URL: v }).apiBaseUrl).toBe('https://caelum-api.onrender.com/api/v1');
    }
  });
});
