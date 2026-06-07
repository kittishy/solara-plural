import { cache } from 'react';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { systems } from '@/lib/db/schema';
import { auth } from './config';
import { err } from '@/lib/api/helpers';
import { isAdminEmail } from './admin-allowlist';

export { getAdminEmailAllowlist, isAdminEmail } from './admin-allowlist';

/**
 * Resolve admin status from the JWT-backed session. The session carries
 * `isAdmin`, computed at sign-in solely from the hardcoded owner email.
 */
export const getIsAdmin = cache(async (): Promise<boolean> => {
  const session = await auth();
  return session?.user?.isAdmin === true;
});

/**
 * Authoritative server-side admin check that re-reads the database rather than
 * trusting the (possibly stale) JWT. Also self-heals the `is_admin` flag for
 * allowlisted emails so the bootstrap admin is persisted on first verified use.
 * Returns the admin's identity for audit logging, or null if not an admin.
 */
export const resolveAdmin = cache(async (): Promise<
  { systemId: string; email: string | null } | null
> => {
  const session = await auth();
  const systemId = session?.user?.id;
  if (!systemId) return null;

  const account = await db.query.systems.findFirst({
    where: eq(systems.id, systemId),
    columns: { id: true, email: true, isAdmin: true, suspendedAt: true },
  });
  if (!account || account.suspendedAt) return null;

  // The owner email is the ONLY thing that grants admin access. The database
  // flag never grants access on its own, so admin can't be handed to another
  // account by editing data — it only mirrors the email check for display.
  if (!isAdminEmail(account.email)) return null;

  if (account.isAdmin !== 1) {
    await db.update(systems).set({ isAdmin: 1 }).where(eq(systems.id, systemId));
  }

  return { systemId: account.id, email: account.email };
});

/** For server components / layouts: redirect non-admins away from /admin. */
export const requireAdmin = cache(async () => {
  const admin = await resolveAdmin();
  if (!admin) redirect('/');
  return admin;
});

/** For API route handlers: return a JSON error for non-admins. */
export async function requireAdminApi(): Promise<
  { admin: { systemId: string; email: string | null }; error?: never }
  | { admin?: never; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) return { error: err('Unauthorized', 401) };
  const admin = await resolveAdmin();
  if (!admin) return { error: err('Forbidden', 403) };
  return { admin };
}
