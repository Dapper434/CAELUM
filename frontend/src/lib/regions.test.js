import { describe, it, expect } from 'vitest';
import { REGIONS, regionByCode } from './regions';

describe('regions', () => {
  it('lists all six API region codes', () => {
    expect(REGIONS.map((r) => r.code)).toEqual([
      'nairobi', 'south_rift', 'north_rift', 'coast', 'nyanza', 'western',
    ]);
  });

  it.each([
    ['coast', 'Coast Region'],
    ['nyanza', 'Nyanza Region'],
    ['western', 'Western Region'],
  ])('resolves %s', (code, name) => {
    const region = regionByCode(code);
    expect(region.name).toBe(name);
    expect(region.counties.length).toBeGreaterThan(0);
  });

  it('returns null for unknown codes', () => {
    expect(regionByCode('mars')).toBeNull();
  });
});
