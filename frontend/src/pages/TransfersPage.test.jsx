import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '../lib/api/client';

vi.mock('../components/LeafletMap', () => ({ default: () => <div data-testid="map" /> }));
const { default: TransfersPage } = await import('./TransfersPage');

const transfer = {
  id: 't1', transfer_code: 'TRF-1', manifest_code: 'MAN-1', donor_facility_id: 'f2', recipient_facility_id: 'f1',
  quantity: 2, blood_group: 'O-', product_type: 'packed_rbc', stage: 'packed', distance_km: 8.6, transit_minutes: 38,
  eta_source: 'estimate', stage_history: [{ stage: 'accepted', at: '2026-11-03T05:00:00Z', role: 'facility' }, { stage: 'packed', at: '2026-11-03T05:20:00Z', role: 'facility' }],
  seal_number: 'SEAL-1', units: [{ id: 'u1', unit_code: 'NHH-ONEG-001', expiry_date: '2026-11-05T09:00:00Z', status: 'reserved' }],
};

describe('TransfersPage', () => {
  it('opens a transfer, assigns a courier and shows the audit tab', async () => {
    const get = vi.spyOn(api, 'get').mockImplementation(async (path, opts) => {
      if (path === '/transfers') { expect(opts.query.active).toBe('true'); return [transfer]; }
      if (path === '/transfers/t1') return transfer;
      if (path === '/couriers') return [{ id: 'c2', full_name: 'M. Wanjiku', vehicle_type: 'boda', cold_box_id: 'CB-2' }];
      if (path === '/transfers/t1/qr') return { expires_at: new Date(Date.now() + 3600e3).toISOString(), expired: false };
      if (path === '/transfers/t1/audit') return [{ seq: 3, action: 'transfer.packed', actor_role: 'facility', at: '2026-11-03T05:20:00Z' }];
      return [];
    });
    const post = vi.spyOn(api, 'post').mockResolvedValue({});
    render(<TransfersPage />);
    await userEvent.click(await screen.findByText('TRF-1'));
    expect(await screen.findByLabelText('Stage history')).toBeInTheDocument();
    expect(screen.getByText(/NHH-ONEG-001/)).toBeInTheDocument();
    expect(await screen.findByText('Valid')).toBeInTheDocument();
    await userEvent.selectOptions(await screen.findByLabelText('Courier to assign'), 'c2');
    await userEvent.click(screen.getByRole('button', { name: 'Assign courier' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/transfers/t1/assign-courier', { courier_id: 'c2' }));
    await userEvent.click(screen.getByRole('tab', { name: 'audit' }));
    expect(await screen.findByText('transfer.packed')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/couriers', { query: { status: 'available' } });
  });

  it('cancels a transfer with a reason', async () => {
    const t = { ...transfer, stage: 'in_transit' };
    vi.spyOn(api, 'get').mockImplementation(async (path) => (path === '/transfers' ? [t] : path === '/transfers/t1' ? t : []));
    const post = vi.spyOn(api, 'post').mockResolvedValue({});
    render(<TransfersPage />);
    await userEvent.click(await screen.findByText('TRF-1'));
    expect(screen.queryByLabelText('Courier to assign')).not.toBeInTheDocument();
    await userEvent.type(await screen.findByLabelText('Cancel reason'), 'road closed');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel transfer' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/transfers/t1/cancel', { reason: 'road closed' }));
  });
});
