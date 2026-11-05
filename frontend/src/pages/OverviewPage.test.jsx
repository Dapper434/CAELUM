import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OverviewPage from './OverviewPage';
import * as admin from '../lib/api/admin';

const overview = {
  generated_at: '2026-11-03T06:00:00Z', requests: { open: 3 }, offers: { pending: 1 }, transfers: { in_transit: 2 },
  active_transfers: 3, delivered_24h: 4, open_alerts: 2, couriers: { available: 3, on_job: 2, offline: 1 },
  temperature_excursions_24h: 0, inventory_available: 412, audit: { valid: true, length: 380, head_hash: 'a'.repeat(64), broken_at_seq: null },
};

describe('OverviewPage', () => {
  it('shows overview counts, audit status and the feed', async () => {
    vi.spyOn(admin, 'getOverview').mockResolvedValue(overview);
    vi.spyOn(admin, 'getFeed').mockResolvedValue([{ id: 'a', seq: 7, action: 'transfer.packed', actor_role: 'facility', at: '2026-11-03T06:00:00Z' }]);
    render(<OverviewPage />);
    expect(await screen.findByText('412')).toBeInTheDocument();
    expect(screen.getByText('Intact')).toBeInTheDocument();
    expect(await screen.findByText('Transfer packed')).toBeInTheDocument();
  });

  it('runs the timeout sweep', async () => {
    vi.spyOn(admin, 'getOverview').mockResolvedValue(overview);
    vi.spyOn(admin, 'getFeed').mockResolvedValue([]);
    const sweep = vi.spyOn(admin, 'runSweep').mockResolvedValue({ offers_expired: 1, transfers_lapsed: 0, courier_assignments_timed_out: 2 });
    render(<OverviewPage />);
    await userEvent.click(screen.getByRole('button', { name: /timeout sweep/i }));
    await waitFor(() => expect(sweep).toHaveBeenCalled());
    expect(await screen.findByText(/1 offers expired/)).toBeInTheDocument();
  });

  it('shows API errors', async () => {
    vi.spyOn(admin, 'getOverview').mockRejectedValue(Object.assign(new Error('nope'), { code: 'forbidden' }));
    vi.spyOn(admin, 'getFeed').mockResolvedValue([]);
    render(<OverviewPage />);
    expect(await screen.findByText('nope')).toBeInTheDocument();
  });
});
