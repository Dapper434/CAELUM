import { describe, it, expect, vi } from 'vitest';
import { api } from './client';
import { validateLicence, licenceExpired, listCourierLocations } from './couriers';
import { listAudit, verifyAudit } from './admin';

describe('couriers and admin api', () => {
  it('validates licence fields', () => {
    expect(validateLicence({ licence_class: 'A2', licence_expiry: '2027-09-30' })).toEqual({});
    expect(validateLicence({ licence_class: 'Z', licence_expiry: '30/09/2027' })).toEqual({
      licence_class: expect.any(String), licence_expiry: expect.any(String),
    });
  });

  it('flags expired licences', () => {
    const now = new Date('2026-11-03T10:00:00Z');
    expect(licenceExpired('2026-11-02', now)).toBe(true);
    expect(licenceExpired('2026-11-03', now)).toBe(false);
    expect(licenceExpired(null, now)).toBe(false);
  });

  it('calls location, audit and verify endpoints', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue([]);
    const getList = vi.spyOn(api, 'getList').mockResolvedValue({ data: [], meta: {} });
    await listCourierLocations('c1', 5);
    await listAudit({ action: 'transfer.packed' });
    await verifyAudit();
    expect(get.mock.calls[0]).toEqual(['/couriers/c1/locations', { query: { limit: 5 } }]);
    expect(getList.mock.calls[0][1].query).toMatchObject({ action: 'transfer.packed', limit: 50 });
    expect(get.mock.calls[1][0]).toBe('/audit/verify');
  });
});
