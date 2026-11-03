import { describe, it, expect } from 'vitest';
import { validateNewPassword } from './password';

describe('validateNewPassword', () => {
  it('enforces length and match', () => {
    expect(validateNewPassword('short', 'short')).toMatch(/at least 8/);
    expect(validateNewPassword('longenough', 'different1')).toMatch(/do not match/);
    expect(validateNewPassword('longenough', 'longenough')).toBe('');
  });
});
