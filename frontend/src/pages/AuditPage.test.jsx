import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as admin from '../lib/api/admin';
import * as facilities from '../lib/api/facilities';
import AuditPage from './AuditPage';

const entries = Array.from({ length: 3 }, (_, i) => ({
  seq: 30 - i,
  id: `e${30 - i}`,
  action: i === 0 ? 'temperature.excursion' : 'request.created',
  actor_role: 'admin',
  entity_type: 'transfer',
  entity_id: 'abc',
  at: '2026-11-03T06:00:00Z',
  payload: {},
  prev_hash: '0'.repeat(64),
  hash: 'a'.repeat(64),
}));

describe('AuditPage', () => {
  beforeEach(() => {
    vi.spyOn(admin, 'verifyAudit').mockResolvedValue({ valid: true, length: 30, head_hash: 'abc', broken_at_seq: null });
    vi.spyOn(admin, 'getAuditSummary').mockResolvedValue({
      window: '7d', total: 30, important: 1, by_category: { forecast: 20, temperature: 1 }, top_actions: [{ action: 'request.created', count: 20 }],
    });
    vi.spyOn(admin, 'listAudit').mockResolvedValue({ data: entries, meta: { next_before_seq: 27, important: true, limit: 50, count: 3 } });
    vi.spyOn(facilities, 'listFacilities').mockResolvedValue([]);
  });

  it('shows summary, important default and friendly labels', async () => {
    render(<AuditPage />);
    expect(await screen.findByText(/Hash chain intact/)).toBeInTheDocument();
    expect(await screen.findByText(/Cold-chain excursion/)).toBeInTheDocument();
    expect(screen.getByText(/Last 7d: 30 events/)).toBeInTheDocument();
    expect(screen.getByLabelText('Important only')).toBeChecked();
    await waitFor(() => expect(admin.listAudit).toHaveBeenCalledWith(expect.objectContaining({ important: true, limit: 50 })));
  });

  it('loads older pages with before_seq', async () => {
    render(<AuditPage />);
    await screen.findByText(/Cold-chain excursion/);
    await userEvent.click(screen.getByRole('button', { name: 'Load older' }));
    await waitFor(() => expect(admin.listAudit).toHaveBeenLastCalledWith(expect.objectContaining({ beforeSeq: 27 })));
  });

  it('can show all events', async () => {
    render(<AuditPage />);
    await screen.findByText(/Cold-chain excursion/);
    await userEvent.click(screen.getByLabelText('Important only'));
    await waitFor(() => expect(admin.listAudit).toHaveBeenLastCalledWith(expect.objectContaining({ important: false })));
  });
});
