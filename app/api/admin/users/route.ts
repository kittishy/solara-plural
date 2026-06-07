import { db } from '@/lib/db';
import { systems, members } from '@/lib/db/schema';
import { and, count, desc, eq, ilike, isNotNull, or, sql, type SQL } from 'drizzle-orm';
import { ok } from '@/lib/api/helpers';
import { requireAdminApi } from '@/lib/auth/admin';

// GET /api/admin/users — paginated, searchable account list for the admin panel.
export async function GET(request: Request) {
  const gate = await requireAdminApi();
  if (gate.error) return gate.error;

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const filter = url.searchParams.get('filter'); // suspended | admin | singlet | null
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 1), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10) || 0, 0);

  const conditions: SQL[] = [];
  if (q) {
    const like = `%${q}%`;
    const search = or(ilike(systems.name, like), ilike(systems.email, like));
    if (search) conditions.push(search);
  }
  if (filter === 'suspended') conditions.push(isNotNull(systems.suspendedAt));
  if (filter === 'admin') conditions.push(eq(systems.isAdmin, 1));
  if (filter === 'singlet') conditions.push(eq(systems.accountType, 'singlet'));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: systems.id,
        name: systems.name,
        email: systems.email,
        accountType: systems.accountType,
        isAdmin: systems.isAdmin,
        suspendedAt: systems.suspendedAt,
        deletionScheduledFor: systems.deletionScheduledFor,
        createdAt: systems.createdAt,
        memberCount: sql<number>`(select count(*) from ${members} where ${members.systemId} = ${systems.id})`,
      })
      .from(systems)
      .where(where)
      .orderBy(desc(systems.createdAt))
      .limit(limit)
      .offset(offset),
    where
      ? db.select({ value: count() }).from(systems).where(where)
      : db.select({ value: count() }).from(systems),
  ]);

  return ok({ data: rows, total: totalRow[0]?.value ?? 0, limit, offset });
}
