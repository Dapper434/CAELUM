import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '../lib/api/client';
import AuditPage from './AuditPage';

const entries = Array.from({ length: 30 }, (_, i) => ({ seq: 30 - i, action: `act.${30 - i}`, actor_role: 'admin', at: '2026-11-03T06:00:00Z' }));

describe('AuditPage', () => {
  it('verifies the chain, filters and pages', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ valid: false, length: 30, head_hash: 'abc', broken_at_seq: 12 });
    const getList = vi.spyOn(api, 'getList').mockResolvedValue({ data: entries, meta: {} });
    render(<AuditPage />);
    expect(await screen.findByText('Chain broken at #12')).toBeInTheDocument();
    expect(await screen.findByText('act.30')).toBeInTheDocument();
    expect(screen.queryByText('act.5')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Older' }));
    expect(screen.getByText('act.5')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Action'), 'offer.accepted');
    await userEvent.click(screen.getByRole('button', { name: 'Filter' }));
    await waitFor(() => expect(getList).toHaveBeenLastCalledWith('/audit', { query: expect.objectContaining({ action: 'offer.accepted', limit: 200 }) }));
  });
});
