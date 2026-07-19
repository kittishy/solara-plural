import { db } from '@/lib/db';
import { frontEntries, memberExternalLinks, members, systemIntegrations } from '@/lib/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { requireAuth, ok, err, parseJsonRecord } from '@/lib/api/helpers';
import { CACHE_FRESH_SHORT } from '@/lib/api/cache-headers';
import { createId } from '@paralleldrive/cuid2';
import { parseMemberIds, safeParseMemberTiers, serializeMemberIds, serializeMemberTiers, isFrontTier, FRONT_TIERS } from '@/lib/front';
import { CAPS } from '@/lib/api/validate';
import type { FrontTier } from '@/lib/front';
import { revalidatePath } from 'next/cache';
import { decryptIntegrationToken } from '@/lib/integrations/token-crypto';
import { createPluralKitFrontSync } from '@/lib/integrations/pluralkit-front-sync.js';
import { notifyFriendsAboutFrontChange } from '@/lib/notifications/front-change';
import { waitUntil } from '@vercel/functions';

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
  status: 'synced' | 'skipped' | 'failed' | 'deferred';
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

function sameMemberList(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function sameTierMap(a: Record<string, FrontTier>, b: Record<string, FrontTier>) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

function deferPluralKitFrontSync(systemId: string, memberIds: string[], requestId: string, reasonCode: string): PluralKitSyncMeta {
  void syncFrontToPluralKit(systemId, memberIds, { requestId })
    .then((providerSync) => {
      const result = toPluralKitSyncMeta(providerSync, requestId);
      if (result.status === 'failed') {
        console.error('[front-sync] deferred pluralKit sync failed', {
          event: 'pluralkit_front_sync_deferred_failed',
          requestId,
          systemId,
          reasonCode: result.reasonCode,
          httpStatus: result.httpStatus,
        });
        return;
      }

      console.info('[front-sync] deferred pluralKit sync completed', {
        event: 'pluralkit_front_sync_deferred_completed',
        requestId,
        systemId,
        status: result.status,
        reasonCode: result.reasonCode,
      });
    })
    .catch((error) => {
      console.error('[front-sync] deferred pluralKit sync crashed unexpectedly', {
        event: 'pluralkit_front_sync_deferred_unexpected_error',
        requestId,
        systemId,
        error: error instanceof Error ? error.message : 'unknown_error',
      });
    });

  return {
    requestId,
    status: 'deferred',
    providerStatus: 'unknown',
    reasonCode,
    httpStatus: null,
    mappedCount: 0,
    unmappedIds: [],
    details: {
      queuedAt: new Date().toISOString(),
    },
  };
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

  if (!current) return ok(null, 200, { headers: { ...CACHE_FRESH_SHORT } });
  return ok(
    {
      ...current,
      memberIds: parseMemberIds(current.memberIds),
      memberTiers: safeParseMemberTiers(current.memberTiers),
    },
    200,
    { headers: { ...CACHE_FRESH_SHORT } }
  );
}

// POST /api/front — start a new front entry (ends any current one first)
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const requestId = getRequestId(request);
  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;

  const body = parsed.data;
  if (typeof body.note === 'string' && body.note.trim().length > CAPS.frontNote) {
    return err(`Note is too long (max ${CAPS.frontNote} characters)`);
  }
  const memberIds = body.memberIds;
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return err('memberIds must be a non-empty array');
  }

  if (!memberIds.every((memberId) => typeof memberId === 'string' && memberId.trim())) {
    return err('memberIds must only include member IDs');
  }

  const uniqueMemberIds = Array.from(new Set(memberIds.map((memberId) => memberId.trim())));

  // Validate optional memberTiers. Roles are optional per-member — an absent
  // entry means the member is fronting without a specific role.
  let memberTiers: Record<string, FrontTier> | null = null;
  if (body.memberTiers !== undefined && body.memberTiers !== null) {
    if (typeof body.memberTiers !== 'object' || Array.isArray(body.memberTiers)) {
      return err('memberTiers must be an object mapping member IDs to tier values');
    }
    const tiers = body.memberTiers as Record<string, string>;
    for (const [memberId, tier] of Object.entries(tiers)) {
      if (!uniqueMemberIds.includes(memberId)) {
        return err(`memberTiers references member "${memberId}" not in memberIds`);
      }
      if (!isFrontTier(tier)) {
        return err(`Invalid tier "${tier}" for member "${memberId}". Must be one of: ${FRONT_TIERS.join(', ')}`);
      }
    }
    memberTiers = tiers as Record<string, FrontTier>;
  }
  const availableMembers = await db.query.members.findMany({
    columns: {
      id: true,
    },
    where: and(eq(members.systemId, auth.systemId), inArray(members.id, uniqueMemberIds)),
  });

  if (availableMembers.length !== uniqueMemberIds.length) {
    return err('One or more memberIds are invalid');
  }

  const now = new Date();
  const activeFront = await db.query.frontEntries.findFirst({
    where: and(
      eq(frontEntries.systemId, auth.systemId),
      isNull(frontEntries.endedAt)
    ),
  });

  if (activeFront) {
    try {
      const activeMemberIds = parseMemberIds(activeFront.memberIds);
      if (sameMemberList(activeMemberIds, uniqueMemberIds)) {
        const activeTiers = safeParseMemberTiers(activeFront.memberTiers);

        // Same members but the caller wants different roles: update the roles
        // in place so we keep the current session (startedAt) intact. The
        // front membership is unchanged, so there's no need to re-sync.
        if (memberTiers !== null && !sameTierMap(activeTiers, memberTiers)) {
          const [updated] = await db.update(frontEntries)
            .set({ memberTiers: serializeMemberTiers(memberTiers) })
            .where(eq(frontEntries.id, activeFront.id))
            .returning();

          revalidatePath('/');
          revalidatePath('/front');
          revalidatePath('/members');
          revalidatePath('/front/history');

          return ok({
            ...updated,
            memberIds: activeMemberIds,
            memberTiers,
            pluralKitSync: {
              requestId,
              status: 'skipped',
              providerStatus: 'skipped',
              reasonCode: 'roles_updated',
              httpStatus: null,
              mappedCount: 0,
              unmappedIds: [],
              details: null,
            },
          });
        }

        return ok({
          ...activeFront,
          memberIds: activeMemberIds,
          memberTiers: activeTiers,
          pluralKitSync: {
            requestId,
            status: 'skipped',
            providerStatus: 'skipped',
            reasonCode: 'already_in_sync',
            httpStatus: null,
            mappedCount: 0,
            unmappedIds: [],
            details: null,
          },
        });
      }
    } catch {
      // Continue with replacement when existing front data is malformed.
    }
  }

  // End any currently active front entry
  await db.update(frontEntries)
    .set({ endedAt: now })
    .where(and(
      eq(frontEntries.systemId, auth.systemId),
      isNull(frontEntries.endedAt)
    ));

  // Resolve tiers. If the caller specified roles, honour them exactly.
  // Otherwise carry over the roles of members who were already fronting (so a
  // client that only sends memberIds — e.g. adding someone from the Members
  // list — never silently wipes everyone's roles). New members stay role-less.
  let resolvedTiers: Record<string, FrontTier>;
  if (memberTiers !== null) {
    resolvedTiers = memberTiers;
  } else if (activeFront) {
    const previousTiers = safeParseMemberTiers(activeFront.memberTiers);
    resolvedTiers = {};
    for (const id of uniqueMemberIds) {
      if (previousTiers[id]) resolvedTiers[id] = previousTiers[id];
    }
  } else {
    resolvedTiers = {};
  }

  // Create new front entry
  const newEntry = await db.insert(frontEntries).values({
    id:          createId(),
    systemId:    auth.systemId,
    memberIds:   serializeMemberIds(uniqueMemberIds),
    memberTiers: serializeMemberTiers(resolvedTiers),
    startedAt:   now,
    endedAt:     null,
    note:        typeof body.note === 'string' ? body.note : null,
    createdAt:   now,
  }).returning();

  revalidatePath('/');
  revalidatePath('/front');
  revalidatePath('/members');
  revalidatePath('/front/history');

  const pluralKitSync = deferPluralKitFrontSync(
    auth.systemId,
    uniqueMemberIds,
    requestId,
    'scheduled_after_local_front_update',
  );

  waitUntil(notifyFriendsAboutFrontChange({
    systemId: auth.systemId,
    memberIds: uniqueMemberIds,
    event: 'started',
  }).catch((error) => {
    console.error('[notifications] front change notification failed', {
      event: 'friend_front_notification_failed',
      requestId,
      systemId: auth.systemId,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
  }));

  return ok({ ...newEntry[0], memberIds: uniqueMemberIds, memberTiers: resolvedTiers, pluralKitSync }, 201);
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

  const pluralKitSync = deferPluralKitFrontSync(
    auth.systemId,
    [],
    requestId,
    'scheduled_after_local_front_end',
  );

  waitUntil(notifyFriendsAboutFrontChange({
    systemId: auth.systemId,
    memberIds: [],
    event: 'ended',
  }).catch((error) => {
    console.error('[notifications] front end notification failed', {
      event: 'friend_front_notification_failed',
      requestId,
      systemId: auth.systemId,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
  }));

  return ok({ ended: true, entry: updated[0], pluralKitSync });
}
