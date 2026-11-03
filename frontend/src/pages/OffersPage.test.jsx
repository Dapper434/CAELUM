import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OffersPage from './OffersPage';
import { api } from '../lib/api/client';

describe('OffersPage', () => {
  it('counts down a pending offer and declines with a reason', async () => {
    const expires = new Date(Date.now() + 4 * 60 * 1000 + 30000).toISOString();
    vi.spyOn(api, 'get').mockImplementation(async (path) => (path === '/offers'
      ? [{ id: 'o1', offer_code: 'OFR-1', donor_facility_id: 'f2', recipient_facility_id: 'f1', units_requested: 1, blood_group: 'O-', eta_minutes: 38, eta_source: 'estimate', status: 'pending', expires_at: expires }]
      : []));
    const post = vi.spyOn(api, 'post').mockResolvedValue({});
    render(<OffersPage />);
    expect(await screen.findByText(/^4m \d\ds$/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hold 30 min' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Decline' }));
    await userEvent.selectOptions(screen.getByLabelText('Decline reason'), 'no_courier');
    await userEvent.click(screen.getByRole('button', { name: 'Send decline' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/offers/o1/decline', { reason_code: 'no_courier' }));
  });

  it('shows invalid_state errors from the API', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path) => (path === '/offers'
      ? [{ id: 'o1', offer_code: 'OFR-1', status: 'held', hold_extensions: 1, expires_at: new Date(Date.now() + 60000).toISOString() }]
      : []));
    vi.spyOn(api, 'post').mockRejectedValue(Object.assign(new Error('Offer already answered'), { code: 'invalid_state' }));
    render(<OffersPage />);
    expect(await screen.findByText('OFR-1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /hold/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(await screen.findByText('Offer already answered')).toBeInTheDocument();
  });
});
