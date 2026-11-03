import { describe, it, expect } from 'vitest';
import { formatTime, countdown, humanize, formatDate, shortHash, formatTemp } from './format';

describe('format', () => {
  it('renders UTC times in Nairobi time', () => {
    expect(formatTime('2026-11-03T14:30:00Z')).toBe('03 Nov, 17:30 EAT');
    expect(formatTime(null)).toBe('—');
  });

  it('counts down to a deadline', () => {
    const now = Date.parse('2026-11-03T10:00:00Z');
    expect(countdown('2026-11-03T10:04:05Z', now)).toBe('4m 05s');
    expect(countdown('2026-11-03T11:30:00Z', now)).toBe('1h 30m');
    expect(countdown('2026-11-03T09:00:00Z', now)).toBe('expired');
  });

  it('formats small values', () => {
    expect(humanize('courier_assigned')).toBe('courier assigned');
    expect(formatDate('2027-09-30')).toBe('30 Sept 2027'.replace('Sept', new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date('2027-09-15'))));
    expect(shortHash('abcdef0123456789', 6)).toBe('abcdef…');
    expect(formatTemp(4)).toBe('4.0 °C');
  });
});
