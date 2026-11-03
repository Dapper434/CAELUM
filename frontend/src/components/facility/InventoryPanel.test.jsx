import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InventoryPanel from './InventoryPanel';
import { api } from '../../lib/api/client';

const units = [
  { id: 'u1', unit_code: 'NHH-ONEG-001', lot_number: 'LOT-1', blood_group: 'O-', product_type: 'packed_rbc', expiry_date: '2026-11-05T09:00:00Z', storage_temp_c: 4, status: 'available' },
  { id: 'u2', unit_code: 'NHH-ONEG-002', lot_number: 'LOT-1', blood_group: 'O-', product_type: 'packed_rbc', expiry_date: '2026-11-05T09:00:00Z', storage_temp_c: 4, status: 'reserved' },
];

describe('InventoryPanel', () => {
  it('lists units and their logged corrections', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path) => (path === '/inventory'
      ? units
      : [{ seq: 9, at: '2026-11-03T06:00:00Z', entity_id: 'u1', payload: { reason: 'typo', before: { lot_number: 'LOT-0' }, after: { lot_number: 'LOT-1' } } }]));
    render(<InventoryPanel facilityId="f1" />);
    expect((await screen.findAllByText('NHH-ONEG-001')).length).toBeGreaterThan(0);
    expect(await screen.findByText('“typo”')).toBeInTheDocument();
    expect(screen.getByText('locked')).toBeInTheDocument();
  });

  it('sends a correction with a reason', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path) => (path === '/inventory' ? units : []));
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({});
    render(<InventoryPanel facilityId="f1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Correct' }));
    const form = screen.getByRole('form', { name: /Correct NHH-ONEG-001/ });
    const lot = form.querySelector('input');
    await userEvent.clear(lot);
    await userEvent.type(lot, 'LOT-2');
    await userEvent.type(screen.getByPlaceholderText(/Required/), 'label misprint');
    await userEvent.click(screen.getByRole('button', { name: /save correction/i }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/inventory/u1', { lot_number: 'LOT-2', reason: 'label misprint' }));
  });

  it('refuses a lot correction without a reason', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path) => (path === '/inventory' ? units : []));
    const patch = vi.spyOn(api, 'patch');
    render(<InventoryPanel facilityId="f1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Correct' }));
    const lot = screen.getByRole('form', { name: /Correct/ }).querySelector('input');
    await userEvent.type(lot, 'X');
    await userEvent.click(screen.getByRole('button', { name: /save correction/i }));
    expect(await screen.findByText(/reason is required/)).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();
  });
});
