export const MIN_PASSWORD_LENGTH = 8;

/** Returns an error sentence, or '' when the new password is acceptable. */
export function validateNewPassword(password, confirm) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password !== confirm) return 'The passwords do not match.';
  return '';
}
