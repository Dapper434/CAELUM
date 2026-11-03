import { describe, it, expect, vi } from 'vitest';
import { api } from './client';
import { requestActions, confirmRequest } from './requests';
import { offerActions, declineOffer } from './offers';
import { getForecastHistory, runForecast } from './forecast';

describe('request and offer state machines', () => {
  it('allows request actions by status', () => {
    expect(requestActions('suggested')).toEqual({ confirm: true, dismiss: true, cancel: true, offer: false });
    expect(requestActions('open')).toMatchObject({ offer: true, cancel: true, confirm: false });
    expect(requestActions('matched')).toEqual({ confirm: false, dismiss: false, cancel: false, offer: false });
  });

  it('allows one hold extension', () => {
    expect(offerActions({ status: 'pending' }).hold).toBe(true);
    expect(offerActions({ status: 'held', hold_extensions: 0 }).hold).toBe(true);
    expect(offerActions({ status: 'held', hold_extensions: 1 }).hold).toBe(false);
    expect(offerActions({ status: 'expired' })).toEqual({ hold: false, accept: false, decline: false });
  });

  it('posts the right bodies', async () => {
    const spy = vi.spyOn(api, 'post').mockResolvedValue({});
    await confirmRequest('r1', { units_requested: 3 });
    await declineOffer('o1', 'other', 'no cooler');
    await runForecast();
    expect(spy.mock.calls).toEqual([
      ['/requests/r1/confirm', { units_requested: 3 }],
      ['/offers/o1/decline', { reason_code: 'other', note: 'no cooler' }],
      ['/forecast/run', {}],
    ]);
  });

  it('asks for forecast history', async () => {
    const spy = vi.spyOn(api, 'get').mockResolvedValue({});
    await getForecastHistory({ facilityId: 'f1', days: 14 });
    expect(spy).toHaveBeenCalledWith('/forecast/history', {
      query: { facility_id: 'f1', blood_group: 'O-', product_type: undefined, days: 14 },
    });
  });
});
