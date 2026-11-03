import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustodyPanel from './CustodyPanel';
import { api } from '../../lib/api/client';

describe('CustodyPanel', () => {
  it('shows QR expiry, reissues it, and fetches a signed photo link', async () => {
    const get = vi.spyOn(api, 'get').mockImplementation(async (path, opts) => {
      if (path === '/transfers/t1/custody') return [{ id: 'e1', event_type: 'pack_seal', method: 'seal', ok: true, actor_role: 'facility', seal_number: 'SEAL-1', photo_path: 't1/pack/1.jpg', occurred_at: '2026-11-03T06:00:00Z' }];
      if (path === '/transfers/t1/qr') return opts?.query?.refresh
        ? { expires_at: new Date(Date.now() + 4 * 3600e3).toISOString(), expired: false, reissued: true }
        : { expires_at: '2026-11-03T02:00:00Z', expired: true, reissued: false };
      if (path === '/transfers/t1/custody/e1/photo-url') return { url: 'https://signed.example/photo?token=x', expires_at: '2026-11-03T06:05:00Z' };
      throw new Error(path);
    });
    render(<CustodyPanel transfer={{ id: 't1', stage: 'packed', seal_number: 'SEAL-1' }} />);
    expect(await screen.findByText('Expired')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reissue qr/i }));
    expect(await screen.findByText('Reissued')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/transfers/t1/qr', { query: { refresh: 'true' } });
    await userEvent.click(await screen.findByRole('button', { name: /signed link/i }));
    const link = await screen.findByRole('link', { name: /open photo/i });
    expect(link).toHaveAttribute('href', 'https://signed.example/photo?token=x');
  });

  it('checks a seal on an in-transit transfer and hides the QR', async () => {
    vi.spyOn(api, 'get').mockResolvedValue([]);
    const post = vi.spyOn(api, 'post').mockResolvedValue({ match: false });
    render(<CustodyPanel transfer={{ id: 't1', stage: 'in_transit', seal_number: 'SEAL-1' }} />);
    expect(screen.queryByText('Pickup QR')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Seal number to check'), 'SEAL-9');
    await userEvent.click(screen.getByRole('button', { name: /check seal/i }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/transfers/t1/seal-check', { seal_number: 'SEAL-9' }));
    expect(await screen.findByText('Seal does not match')).toBeInTheDocument();
  });
});
