// Admin Email Allowlist - Privileged User Bypass
// These users get free synthesis without credit deduction

const ADMIN_EMAILS = new Set([
  'tobiasramzy@gmail.com',
]);

export function isAdminUser(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.toLowerCase());
}
