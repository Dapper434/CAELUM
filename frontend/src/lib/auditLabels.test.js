import { describe, expect, it } from 'vitest';
import { actionLabel, groupConsecutive, isImportantAction } from './auditLabels';

describe('auditLabels', () => {
  it('maps known actions and humanizes unknown ones', () => {
    expect(actionLabel('offer.accepted')).toBe('Offer accepted');
    expect(actionLabel('custom.thing')).toMatch(/Custom/);
  });

  it('flags important actions', () => {
    expect(isImportantAction('temperature.excursion')).toBe(true);
    expect(isImportantAction('request.created')).toBe(false);
  });

  it('groups 3+ consecutive same actions', () => {
    const rows = [
      { seq: 5, action: 'request.created' },
      { seq: 4, action: 'request.created' },
      { seq: 3, action: 'request.created' },
      { seq: 2, action: 'offer.accepted' },
    ];
    const grouped = groupConsecutive(rows);
    expect(grouped[0].kind).toBe('group');
    expect(grouped[0].count).toBe(3);
    expect(grouped[1].kind).toBe('single');
  });
});
