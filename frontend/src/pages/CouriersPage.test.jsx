import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '../lib/api/client';

vi.mock('../components/LeafletMap', () => ({ default: () => <div data-testid="map" /> }));
const { default: CouriersPage } = await import('./CouriersPage');

const otieno = { id: 'c1', full_name: 'J. Otieno', vehicle_type: 'boda', status: 'on_job', is_active: true, licence_number: 'DL-1', licence_class: 'A2', licence_expiry: '2020-01-01', training_certified: true };

describe('CouriersPage', () => {
  it('shows licence, positions and job history, and patches only changed fields', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path) => {
      if (path === '/couriers') return [otieno];
      if (path === '/couriers/c1/locations') return [{ id: 'l1', latitude: -1.285, longitude: 36.85, recorded_at: '2026-11-03T06:00:00Z', speed_kmh: 32, late: true }];
      if (path === '/transfers') return [{ id: 't1', transfer_code: 'TRF-9', courier_id: 'c1', stage: 'delivered' }, { id: 't2', transfer_code: 'TRF-X', courier_id: 'c2', stage: 'delivered' }];
      return [];
    });
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({});
    render(<CouriersPage />);
    await userEvent.click(await screen.findByText('J. Otieno'));
    expect(await screen.findByText(/\(expired\)/)).toBeInTheDocument();
    expect(await screen.findByText('TRF-9')).toBeInTheDocument();
    expect(screen.queryByText('TRF-X')).not.toBeInTheDocument();
    expect(await screen.findByText('-1.2850, 36.8500')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    const form = screen.getByRole('form', { name: 'Edit courier' });
    await userEvent.selectOptions(form.querySelectorAll('select')[2], 'B');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/couriers/c1', { licence_class: 'B' }));
  });

  it('creates a courier', async () => {
    vi.spyOn(api, 'get').mockResolvedValue([]);
    const post = vi.spyOn(api, 'post').mockResolvedValue({ id: 'c9' });
    render(<CouriersPage />);
    await userEvent.click(screen.getByRole('button', { name: /new courier/i }));
    const form = screen.getByRole('form', { name: 'New courier' });
    await userEvent.type(form.querySelector('input'), 'A. Kamau');
    await userEvent.click(screen.getByRole('button', { name: 'Create courier' }));
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][0]).toBe('/couriers');
    expect(post.mock.calls[0][1]).toMatchObject({ full_name: 'A. Kamau', vehicle_type: 'boda', is_active: true });
  });
});
