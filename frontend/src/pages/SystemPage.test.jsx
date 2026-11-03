import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { api } from '../lib/api/client';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ me: { email: 'admin@caelum.demo', role: 'admin', user_id: 'u1' } }) }));
const { default: SystemPage } = await import('./SystemPage');

describe('SystemPage', () => {
  it('shows health, version and reference data', async () => {
    vi.spyOn(api, 'rootHealth').mockResolvedValue({ status: 'ok', service: 'caelum-api', version: '1.2.0' });
    vi.spyOn(api, 'request').mockResolvedValue({ status: 'ok', version: '1.2.0', store: 'MemoryStore', time: '2026-11-03T06:00:00Z' });
    vi.spyOn(api, 'get').mockImplementation(async (path) => (path === '/couriers/decline-reasons' ? [{ code: 'too_far', label: 'Too far from pickup' }] : { cooler: {} }));
    render(<SystemPage />);
    expect(await screen.findByText('caelum-api')).toBeInTheDocument();
    expect(await screen.findByText('MemoryStore')).toBeInTheDocument();
    expect(screen.getByText('admin@caelum.demo')).toBeInTheDocument();
    expect(await screen.findByText(/Too far from pickup/)).toBeInTheDocument();
    expect(screen.getByText('http://api.test/api/v1')).toBeInTheDocument();
  });
});
