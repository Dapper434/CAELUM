import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestsPage from './RequestsPage';
import { api } from '../lib/api/client';

const req = { id: 'r1', request_code: 'REQ-1', recipient_facility_id: 'f1', units_requested: 2, blood_group: 'O-', product_type: 'packed_rbc', urgency: 'urgent', status: 'open', source: 'manual' };

describe('RequestsPage', () => {
  it('ranks donors and creates an offer', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path) => {
      if (path === '/facilities') return [{ id: 'f1', name: 'Mama Lucy' }, { id: 'f2', name: 'Hub' }];
      if (path === '/requests') return [req];
      if (path === '/requests/r1') return req;
      if (path === '/offers') return [];
      if (path === '/requests/r1/candidates') return { candidates: [{ rank: 1, donor_facility_id: 'f2', donor_name: 'Hub', elapsed_minutes: 38, eta_source: 'estimate', distance_km: 8.6, post_transfer_cover_days: 4, units: [{ unit_code: 'U1' }] }], rationale: { text: 'Hub can send', source: 'rules' }, policies: [] };
      throw new Error(path);
    });
    const post = vi.spyOn(api, 'post').mockResolvedValue({});
    render(<RequestsPage />);
    await userEvent.click(await screen.findByText('REQ-1'));
    expect(await screen.findByRole('button', { name: /cancel request/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^confirm$/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /find donors/i }));
    expect(await screen.findByText('38 min (estimate)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Offer' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/requests/r1/offers', { donor_facility_id: 'f2' }));
  });

  it('confirms a suggested request', async () => {
    const suggested = { ...req, status: 'suggested', source: 'forecast' };
    vi.spyOn(api, 'get').mockImplementation(async (path) => (path === '/requests' ? [suggested] : path === '/requests/r1' ? suggested : []));
    const post = vi.spyOn(api, 'post').mockResolvedValue({});
    render(<RequestsPage />);
    await userEvent.click(await screen.findByText('REQ-1'));
    await userEvent.click(await screen.findByRole('button', { name: /^confirm$/i }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/requests/r1/confirm', {}));
  });
});
