/**
 * Pure, dependency-free admin email allowlist logic. Kept separate from
 * `admin.ts` (which pulls in the database and next-auth) so it can be imported
 * by the auth config without creating an import cycle, and unit-tested in
 * isolation.
 */

/**
 * The single owner account allowed into the admin panel. This is hardcoded on
 * purpose: admin access is locked to this address regardless of environment
 * configuration or any database flag, so it can never be granted to another
 * account by mistake or by editing data.
 */
export const OWNER_EMAIL = 'solara.julia.a@gmail.com';

/**
 * The admin allowlist. Always contains the hardcoded owner. Extra addresses may
 * optionally be added via ADMIN_EMAILS (comma- or whitespace-separated), but
 * with no env set the owner is the only admin. Matching is case-insensitive.
 */
export function getAdminEmailAllowlist(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS ?? '')
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([OWNER_EMAIL.toLowerCase(), ...fromEnv]));
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmailAllowlist().includes(email.trim().toLowerCase());
}
