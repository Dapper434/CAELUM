import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Newer Node versions ship their own (disabled) localStorage global that can
// shadow jsdom's. Give every test a simple in-memory Storage instead.
function memoryStorage() {
  let items = new Map();
  return {
    get length() { return items.size; },
    key: (i) => Array.from(items.keys())[i] ?? null,
    getItem: (k) => (items.has(String(k)) ? items.get(String(k)) : null),
    setItem: (k, v) => { items.set(String(k), String(v)); },
    removeItem: (k) => { items.delete(String(k)); },
    clear: () => { items = new Map(); },
  };
}

for (const name of ['localStorage', 'sessionStorage']) {
  Object.defineProperty(globalThis, name, { value: memoryStorage(), configurable: true, writable: true });
  if (typeof window !== 'undefined' && window !== globalThis) {
    Object.defineProperty(window, name, { value: globalThis[name], configurable: true, writable: true });
  }
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
  sessionStorage.clear();
});
