import { and, eq, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { systemPartnerships } from '@/lib/db/schema';

export type PartnershipAccess = {
  partnership: typeof systemPartnerships.$inferSelect;
  partnerSystemId: string;
};

export async function getPartnershipForSystem(
  partnershipId: string,
  systemId: string,
): Promise<PartnershipAccess | null> {
  const partnership = await db.query.systemPartnerships.findFirst({
    where: and(
      eq(systemPartnerships.id, partnershipId),
      or(
        eq(systemPartnerships.systemAId, systemId),
        eq(systemPartnerships.systemBId, systemId),
      ),
    ),
  });
  if (!partnership) return null;
  const partnerSystemId =
    partnership.systemAId === systemId ? partnership.systemBId : partnership.systemAId;
  return { partnership, partnerSystemId };
}

export function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}
