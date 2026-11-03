import { describe, it, expect, vi } from 'vitest';
import { api } from './client';
import { transferActions, transferDeadline, listTransfers, assignCourier } from './transfers';
import { getPhotoUrl, getQrStatus } from './custody';

describe('transfers api', () => {
  it('derives admin actions from stage', () => {
    expect(transferActions({ stage: 'packed' })).toEqual({ assignCourier: true, cancel: true });
    expect(transferActions({ stage: 'in_transit' })).toEqual({ assignCourier: false, cancel: true });
    expect(transferActions({ stage: 'delivered' })).toEqual({ assignCourier: false, cancel: false });
  });

  it('finds the running deadline', () => {
    expect(transferDeadline({ stage: 'accepted', pack_deadline: 'T1' })).toEqual({ label: 'Pack by', at: 'T1' });
    expect(transferDeadline({ stage: 'courier_assigned', courier_accept_deadline: 'T2' }).at).toBe('T2');
    expect(transferDeadline({ stage: 'courier_assigned', courier_accept_deadline: 'T2', courier_accepted_at: 'x' })).toBeNull();
  });

  it('calls the transfer endpoints', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({});
    const post = vi.spyOn(api, 'post').mockResolvedValue({});
    await listTransfers({ active: true });
    await assignCourier('t1', 'c1');
    await getQrStatus('t1', { refresh: true });
    await getPhotoUrl('t1', 'e1', 99999);
    expect(get.mock.calls[0]).toEqual(['/transfers', { query: { stage: undefined, active: 'true' } }]);
    expect(post).toHaveBeenCalledWith('/transfers/t1/assign-courier', { courier_id: 'c1' });
    expect(get.mock.calls[1]).toEqual(['/transfers/t1/qr', { query: { refresh: 'true' } }]);
    expect(get.mock.calls[2]).toEqual(['/transfers/t1/custody/e1/photo-url', { query: { expires_in: 3600 } }]);
  });
});
