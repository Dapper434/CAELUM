import { describe, it, expect, vi } from 'vitest';
import { api } from './client';
import { correctInventoryUnit, listInventory, listInventoryCorrections } from './inventory';

describe('inventory api', () => {
  it('maps filters to query params', async () => {
    const spy = vi.spyOn(api, 'get').mockResolvedValue([]);
    await listInventory({ facilityId: 'f1', bloodGroup: 'O-' });
    expect(spy).toHaveBeenCalledWith('/inventory', {
      query: { facility_id: 'f1', blood_group: 'O-', product_type: undefined, status: undefined },
    });
  });

  it('requires a reason for corrections', () => {
    expect(() => correctInventoryUnit('u1', { lot_number: 'L2' }, '')).toThrow(/reason/);
  });

  it('sends corrections with the reason', async () => {
    const spy = vi.spyOn(api, 'patch').mockResolvedValue({});
    await correctInventoryUnit('u1', { storage_temp_c: 4 }, ' sensor recalibrated ');
    expect(spy).toHaveBeenCalledWith('/inventory/u1', { storage_temp_c: 4, reason: 'sensor recalibrated' });
  });

  it('allows status changes without a reason', async () => {
    const spy = vi.spyOn(api, 'patch').mockResolvedValue({});
    await correctInventoryUnit('u1', { status: 'discarded' });
    expect(spy).toHaveBeenCalledWith('/inventory/u1', { status: 'discarded' });
  });

  it('reads corrections from the audit log', async () => {
    const spy = vi.spyOn(api, 'get').mockResolvedValue([]);
    await listInventoryCorrections();
    expect(spy.mock.calls[0][0]).toBe('/audit');
    expect(spy.mock.calls[0][1].query.action).toBe('inventory.corrected');
  });
});
