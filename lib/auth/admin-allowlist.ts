/**
 * Pure, dependency-free admin email allowlist logic. Kept separate from
 * `admin.ts` (which pulls in the database and next-auth) so it can be imported
 * by the auth config without creating an import cycle, and unit-tested in
 * isolation.
 */

/**
 * Parse the ADMIN_EMAILS allowlist. Comma- or whitespace-separated, matched
 * case-insensitively. This is the bootstrap source of truth: any email listed
 * here is treated as an admin even before the database flag is set, which lets
 * the very first admin reach the panel and grant the flag to themselves.
 */
export function getAdminEmailAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmailAllowlist().includes(email.trim().toLowerCase());
}
