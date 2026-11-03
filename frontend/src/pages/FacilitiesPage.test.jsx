import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FacilitiesPage from './FacilitiesPage';
import { api } from '../lib/api/client';

const hub = { id: 'f2', name: 'Nairobi Hospital Hub', county: 'Nairobi', level_label: 'Level 5', mfl_code: '13023', region_code: 'nairobi', keph_level: 5, is_active: true, contact_name: 'Officer', contact_phone: '+254 700 000 102', address: 'Upper Hill' };

describe('FacilitiesPage', () => {
  it('lists facilities and opens details, inventory and audit', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path, opts) => {
      if (path === '/facilities') { expect(opts.query.region_code).toBe('nairobi'); return [hub]; }
      if (path === '/facilities/f2') return hub;
      if (path === '/inventory') return [];
      return [];
    });
    const getList = vi.spyOn(api, 'getList').mockResolvedValueOnce({ data: [{ seq: 5, action: 'facility.contact_updated', actor_role: 'admin', at: '2026-11-03T06:00:00Z' }], meta: { next_before_seq: 5 } })
      .mockResolvedValueOnce({ data: [{ seq: 2, action: 'inventory.added', actor_role: 'facility', at: '2026-11-02T06:00:00Z' }], meta: { next_before_seq: null } });
    render(<FacilitiesPage regionCode="nairobi" />);
    await userEvent.click(await screen.findByText('Nairobi Hospital Hub'));
    expect(await screen.findByText(/MFL 13023/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Upper Hill')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Audit' }));
    expect(await screen.findByText('facility.contact_updated')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /older entries/i }));
    expect(await screen.findByText('inventory.added')).toBeInTheDocument();
    expect(getList.mock.calls[1][1].query.before_seq).toBe(5);
    expect(screen.queryByRole('button', { name: /older entries/i })).not.toBeInTheDocument();
  });
});
