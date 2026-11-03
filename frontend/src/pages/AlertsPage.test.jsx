import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '../lib/api/client';
import AlertsPage from './AlertsPage';

describe('AlertsPage', () => {
  it('lists alerts and runs the forecast and sweep', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path) => (path === '/alerts'
      ? [{ id: 'a1', facility_id: 'f1', blood_group: 'O-', product_type: 'packed_rbc', units_remaining: 2, days_of_cover: 0.8, urgency: 'critical' }]
      : []));
    const post = vi.spyOn(api, 'post').mockImplementation(async (path) => (path === '/forecast/run'
      ? { alerts: [{}], suggested_requests: [{}, {}] }
      : { offers_expired: 1, transfers_lapsed: 0, courier_assignments_timed_out: 2 }));
    render(<AlertsPage />);
    expect(await screen.findByText('0.8')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /run forecast/i }));
    expect(await screen.findByText(/1 alerts, 2 suggested/)).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/forecast/run', {});
    await userEvent.click(screen.getByRole('button', { name: /timeout sweep/i }));
    expect(await screen.findByText(/2 courier assignments timed out/)).toBeInTheDocument();
  });
});
