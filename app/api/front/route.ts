import { db } from '@/lib/db';
import { frontEntries, memberExternalLinks, members, systemIntegrations } from '@/lib/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { requireAuth, ok, err } from '@/lib/api/helpers';
import { createId } from '@paralleldrive/cuid2';
import { parseMemberIds, serializeMemberIds } from '@/lib/front';
import { revalidatePath } from 'next/cache';
import { decryptIntegrationToken } from '@/lib/integrations/token-crypto';
import { createPluralKitFrontSync } from '@/lib/integrations/pluralkit-front-sync.js';

async function readPersistedPluralKitToken(systemId: string): Promise<string | null> {
  const [integration] = await db
    .select({ encryptedToken: systemIntegrations.encryptedToken })
    .from(systemIntegrations)
    .where(and(
      eq(systemIntegrations.systemId, systemId),
      eq(systemIntegrations.provider, 'pluralkit'),
    ))
    .limit(1);

  if (!integration?.encryptedToken) return null;

  try {
    return decryptIntegrationToken(integration.encryptedToken);
  } catch {
    return null;
  }
}

async function resolvePluralKitExternalIds(systemId: string, localMemberIds: string[]) {
  if (localMemberIds.length === 0) {
    return {
      externalMemberIds: [],
      resolvedLocalMemberIds: [],
      unresolvedLocalMemberIds: [],
    };
  }

  const links = await db
    .select({ memberId: memberExternalLinks.memberId, externalId: memberExternalLinks.externalId })
    .from(memberExternalLinks)
    .where(and(
      eq(memberExternalLinks.systemId, systemId),
      eq(memberExternalLinks.provider, 'pluralkit'),
      inArray(memberExternalLinks.memberId, localMemberIds),
    ));

  const byMemberId = new Map<string, string>();
  for (const link of links) {
    if (!link.memberId || !link.externalId) continue;
    byMemberId.set(link.memberId, link.externalId);
  }

  const externalMemberIds: string[] = [];
  const resolvedLocalMemberIds: string[] = [];
  const unresolvedLocalMemberIds: string[] = [];
  for (const memberId of localMemberIds) {
    const externalId = byMemberId.get(memberId);
    if (!externalId) {
      unresolvedLocalMemberIds.push(memberId);
      continue;
    }
    externalMemberIds.push(externalId);
    resolvedLocalMemberIds.push(memberId);
  }

  return {
    externalMemberIds,
    resolvedLocalMemberIds,
    unresolvedLocalMemberIds,
  };
}

const syncFrontToPluralKit = createPluralKitFrontSync({
  readPersistedToken: readPersistedPluralKitToken,
  resolveExternalIds: resolvePluralKitExternalIds,
});

type PluralKitSyncMeta = {
  requestId: string;
  status: 'synced' | 'skipped' | 'failed';
  providerStatus: 'ok' | 'error' | 'skipped' | 'unknown';
  reasonCode: string;
  httpStatus: number | null;
  mappedCount: number;
  unmappedIds: string[];
  details: Record<string, unknown> | null;
};

function toPluralKitSyncMeta(value: unknown, requestId: string): PluralKitSyncMeta {
  const source = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  const status = source.status;
  const safeStatus: PluralKitSyncMeta['status'] =
    status === 'synced' || status === 'skipped' || status === 'failed'
      ? status
      : 'failed';

  return {
    requestId,
    status: safeStatus,
    providerStatus:
      source.providerStatus === 'ok' || source.providerStatus === 'error' || source.providerStatus === 'skipped'
        ? source.providerStatus
        : 'unknown',
    reasonCode: typeof source.reasonCode === 'string' && source.reasonCode.trim() ? source.reasonCode : 'unknown',
    httpStatus: typeof source.httpStatus === 'number' && Number.isFinite(source.httpStatus)
      ? source.httpStatus
      : null,
    mappedCount: typeof source.mappedCount === 'number' && Number.isFinite(source.mappedCount)
      ? source.mappedCount
      : 0,
    unmappedIds: Array.isArray(source.unmappedIds)
      ? source.unmappedIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : [],
    details: typeof source.details === 'object' && source.details !== null
      ? source.details as Record<string, unknown>
      : null,
  };
}

function getRequestId(request: Request): string {
  const incoming = request.headers.get('x-request-id') || request.headers.get('x-correlation-id');
  if (incoming && incoming.trim()) return incoming.trim().slice(0, 120);
  return `front_${createId()}`;
}

// GET /api/front — get current active front entry
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const current = await db.query.frontEntries.findFirst({
    where: and(
      eq(frontEntries.systemId, auth.systemId),
      isNull(frontEntries.endedAt)
    ),
  });

  if (!current) return ok(null);
  return ok(
    { ...current, memberIds: parseMemberIds(current.memberIds) },
    200,
    {
      headers: {
        'Cache-Control': 'private, max-age=0, s-maxage=15, stale-while-revalidate=30',
      },
    }
  );
}

// POST /api/front — start a new front entry (ends any current one first)
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const requestId = getRequestId(request);
  const body = await request.json();
  const { memberIds, note } = body;

  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return err('memberIds must be a non-empty array');
  }

  if (!memberIds.every((memberId) => typeof memberId === 'string' && memberId.trim())) {
    return err('memberIds must only include member IDs');
  }

  const uniqueMemberIds = Array.from(new Set(memberIds.map((memberId) => memberId.trim())));
  const availableMembers = await db.query.members.findMany({
    where: and(eq(members.systemId, auth.systemId), inArray(members.id, uniqueMemberIds)),
  });

  if (availableMembers.length !== uniqueMemberIds.length) {
    return err('One or more memberIds are invalid');
  }

  const now = new Date();

  // End any currently active front entry
  await db.update(frontEntries)
    .set({ endedAt: now })
    .where(and(
      eq(frontEntries.systemId, auth.systemId),
      isNull(frontEntries.endedAt)
    ));

  // Create new front entry
  const newEntry = await db.insert(frontEntries).values({
    id:        createId(),
    systemId:  auth.systemId,
    memberIds: serializeMemberIds(uniqueMemberIds),
    startedAt: now,
    endedAt:   null,
    note:      note ?? null,
    createdAt: now,
  }).returning();

  revalidatePath('/');
  revalidatePath('/front');
  revalidatePath('/members');
  revalidatePath('/front/history');

  let pluralKitSync: PluralKitSyncMeta | null = null;

  try {
    const providerSync = await syncFrontToPluralKit(auth.systemId, uniqueMemberIds, { requestId });
    pluralKitSync = toPluralKitSyncMeta(providerSync, requestId);
  } catch (error) {
    console.error('[front-sync] pluralKit sync crashed unexpectedly', {
      event: 'pluralkit_front_sync_unexpected_error',
      requestId,
      systemId: auth.systemId,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    pluralKitSync = {
      requestId,
      status: 'failed',
      providerStatus: 'error',
      reasonCode: 'unexpected_error',
      httpStatus: null,
      mappedCount: 0,
      unmappedIds: [],
      details: null,
    };
  }

  return ok({ ...newEntry[0], memberIds: uniqueMemberIds, pluralKitSync }, 201);
}

// DELETE /api/front — end the current front entry
export async function DELETE() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const requestId = `front_${createId()}`;

  const updated = await db.update(frontEntries)
    .set({ endedAt: new Date() })
    .where(and(
      eq(frontEntries.systemId, auth.systemId),
      isNull(frontEntries.endedAt)
    ))
    .returning();

  if (!updated.length) return err('No active front entry', 404);
  revalidatePath('/');
  revalidatePath('/front');
  revalidatePath('/members');
  revalidatePath('/front/history');

  let pluralKitSync: PluralKitSyncMeta | null = null;

  try {
    const providerSync = await syncFrontToPluralKit(auth.systemId, [], { requestId });
    pluralKitSync = toPluralKitSyncMeta(providerSync, requestId);
  } catch (error) {
    console.error('[front-sync] pluralKit switch-out crashed unexpectedly', {
      event: 'pluralkit_front_sync_unexpected_error',
      requestId,
      systemId: auth.systemId,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    pluralKitSync = {
      requestId,
      status: 'failed',
      providerStatus: 'error',
      reasonCode: 'unexpected_error',
      httpStatus: null,
      mappedCount: 0,
      unmappedIds: [],
      details: null,
    };
  }

  return ok({ ended: true, entry: updated[0], pluralKitSync });
}
