import { describe, it, expect, vi } from 'vitest';
import { api } from './client';
import { updateFacilityContacts, validateContacts, getFacilityAudit } from './facilities';

describe('facilities api', () => {
  it('sends only contact fields and turns blanks into null', async () => {
    const spy = vi.spyOn(api, 'patch').mockResolvedValue({ id: 'f1' });
    await updateFacilityContacts('f1', { contact_name: ' Ann ', contact_phone: '', address: undefined, name: 'x' });
    expect(spy).toHaveBeenCalledWith('/facilities/f1', { contact_name: 'Ann', contact_phone: null, address: null });
  });

  it('validates contact limits', () => {
    expect(validateContacts({ contact_phone: '+254 700 000 102' })).toEqual({});
    expect(validateContacts({ contact_phone: 'call me' })).toHaveProperty('contact_phone');
    expect(validateContacts({ contact_name: 'a'.repeat(121) })).toHaveProperty('contact_name');
    expect(validateContacts({ address: 'a'.repeat(301) })).toHaveProperty('address');
  });

  it('pages facility audit with before_seq', async () => {
    const spy = vi.spyOn(api, 'getList').mockResolvedValue({ data: [], meta: { next_before_seq: null } });
    await getFacilityAudit('f1', { limit: 20, beforeSeq: 40 });
    expect(spy).toHaveBeenCalledWith('/facilities/f1/audit', { query: { limit: 20, before_seq: 40 } });
  });
});
