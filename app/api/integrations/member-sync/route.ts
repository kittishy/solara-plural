import { db } from '@/lib/db';
import { frontEntries, memberExternalLinks, members, systemIntegrations } from '@/lib/db/schema';
import { requireAuth, ok, err, isRecord, parseJsonRecord } from '@/lib/api/helpers';
import { createId } from '@paralleldrive/cuid2';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { parseMemberIds, serializeMemberIds } from '@/lib/front';
import { decryptIntegrationToken, encryptIntegrationToken } from '@/lib/integrations/token-crypto';
import {
  asArray,
  parsePluralKitFronters,
  readRemoteMessage,
  readRetryAfter,
} from '@/lib/integrations/pluralkit-api.js';
import {
  PROVIDERS,
  mapPluralKitMember,
  planMemberSync,
  sanitizeSyncOptions,
} from '@/lib/integrations/member-sync-core.js';

type SyncProvider = 'pluralkit';
type SyncAction = 'create' | 'update' | 'link' | 'skip' | 'unchanged';

type SyncBody = {
  provider?: unknown;
  token?: unknown;
  apply?: unknown;
  options?: unknown;
};

type ExternalMember = {
  provider: SyncProvider;
  externalId: string;
  externalSecondaryId?: string | null;
  name: string;
};

type SyncOperation = {
  action: SyncAction;
  provider: SyncProvider;
  externalId: string;
  externalSecondaryId?: string | null;
  name: string;
  reason: string;
  memberId?: string;
  member?: Record<string, unknown>;
  patch?: Record<string, unknown>;
  link?: {
    provider: SyncProvider;
    externalId: string;
    externalSecondaryId?: string | null;
    externalName?: string | null;
    metadata?: string | null;
  };
  changedFields?: string[];
};

type FetchMembersResult = {
  remoteSystemId: string | null;
  externalMembers: ExternalMember[];
  currentFrontExternalIds: string[];
  currentFrontStartedAt: Date | null;
};

type FrontSyncResult = {
  status: 'started' | 'ended' | 'unchanged' | 'skipped';
  remoteFrontCount: number;
  appliedMemberCount: number;
  reason?: string;
};

type SyncTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const MAX_PREVIEW_OPERATIONS = 60;
const PLURALKIT_BASE_URL = 'https://api.pluralkit.me/v2';
const PLURALKIT_REQUEST_TIMEOUT_MS = 8000;

const SOLARA_USER_AGENT = 'SolaraPlural/0.1 (https://solara-plural.vercel.app; member-sync)';

class RemoteSyncError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsed = await parseJsonRecord(request);
  if (parsed.error) return parsed.error;
  const body = parsed.data as SyncBody;

  const provider = parseProvider(body.provider);
  if (!provider) return err('Choose PluralKit before syncing.');

  try {
    const providedToken = typeof body.token === 'string' ? body.token.trim() : '';
    const persistedToken = providedToken
      ? null
      : await readPersistedToken(auth.systemId, provider);
    const token = providedToken || persistedToken || '';
    if (!token) return err('Integration token is required. Add one in Settings or include it in the sync request.');

    const apply = body.apply === true;
    const options = sanitizeSyncOptions(body.options);

    const [existingMembers, existingLinks, remote] = await Promise.all([
      db.select().from(members).where(eq(members.systemId, auth.systemId)),
      db.select().from(memberExternalLinks).where(eq(memberExternalLinks.systemId, auth.systemId)),
      fetchExternalMembers({
        provider,
        token,
        includeFrontState: apply,
      }),
    ]);

    if (providedToken) {
      await upsertPersistedToken(auth.systemId, provider, providedToken);
    }

    const plan = planMemberSync({
      existingMembers,
      existingLinks,
      externalMembers: remote.externalMembers,
      options,
    });

    let frontSync: FrontSyncResult | null = null;

    if (apply) {
      await db.transaction(async (tx) => {
        await applySyncPlan(tx, auth.systemId, plan.operations as SyncOperation[]);
        frontSync = await syncFrontFromPluralKit(
          tx,
          auth.systemId,
          remote.currentFrontExternalIds,
          remote.currentFrontStartedAt,
        );
      });
      revalidatePath('/');
      revalidatePath('/members');
      revalidatePath('/front');
      revalidatePath('/settings');
    }

    return ok({
      provider,
      applied: apply,
      remoteSystemId: remote.remoteSystemId,
      summary: plan.summary,
      operations: compactOperations(plan.operations as SyncOperation[]),
      operationLimit: MAX_PREVIEW_OPERATIONS,
      frontSync,
    });
  } catch (error) {
    if (error instanceof RemoteSyncError) {
      return err(error.message, error.status);
    }

    if (isMissingIntegrationSchemaError(error)) {
      return err('PluralKit sync is not ready in this environment. Run database migrations before using integrations.', 503);
    }

    return err('Sync failed before anything was changed. Please try again.', 500);
  }
}

function isMissingIntegrationSchemaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('no such table: member_external_links')
    || message.includes('no such table: system_integrations');
}

async function readPersistedToken(systemId: string, provider: SyncProvider): Promise<string | null> {
  const [integration] = await db
    .select({ encryptedToken: systemIntegrations.encryptedToken })
    .from(systemIntegrations)
    .where(and(
      eq(systemIntegrations.systemId, systemId),
      eq(systemIntegrations.provider, provider),
    ))
    .limit(1);

  if (!integration?.encryptedToken) return null;

  try {
    return decryptIntegrationToken(integration.encryptedToken);
  } catch {
    return null;
  }
}

async function upsertPersistedToken(systemId: string, provider: SyncProvider, token: string) {
  const now = new Date();

  await db
    .insert(systemIntegrations)
    .values({
      id: createId(),
      systemId,
      provider,
      encryptedToken: encryptIntegrationToken(token),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [systemIntegrations.systemId, systemIntegrations.provider],
      set: {
        encryptedToken: encryptIntegrationToken(token),
        updatedAt: now,
      },
    });
}

function parseProvider(value: unknown): SyncProvider | null {
  if (value === PROVIDERS.PLURALKIT) return PROVIDERS.PLURALKIT;
  return null;
}

async function fetchExternalMembers(input: {
  provider: SyncProvider;
  token: string;
  includeFrontState: boolean;
}): Promise<FetchMembersResult> {
  return fetchPluralKitMembers(input.token, input.includeFrontState);
}

async function fetchPluralKitMembers(token: string, includeFrontState: boolean): Promise<FetchMembersResult> {
  const headers = {
    Authorization: token,
    'User-Agent': SOLARA_USER_AGENT,
    Accept: 'application/json',
  };

  const [system, rawMembers, rawFront] = await Promise.all([
    remoteJson(`${PLURALKIT_BASE_URL}/systems/@me`, { headers }),
    remoteJson(`${PLURALKIT_BASE_URL}/systems/@me/members`, { headers }),
    includeFrontState
      ? remoteJson(`${PLURALKIT_BASE_URL}/systems/@me/fronters`, { headers })
      : Promise.resolve([]),
  ]);

  const membersList = asArray(rawMembers).map((raw) => mapPluralKitMember(toRecord(raw))).filter(isExternalMember);
  const parsedFront = parsePluralKitFronters(rawFront);
  const remoteSystemId = readId(system, ['uuid', 'id']);

  return {
    remoteSystemId,
    externalMembers: membersList,
    currentFrontExternalIds: parsedFront.externalIds,
    currentFrontStartedAt: parsedFront.startedAt,
  };
}

async function remoteJson(url: string, init: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PLURALKIT_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new RemoteSyncError('PluralKit took too long to respond. Please try again in a moment.', 504);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  const body = parseRemoteBody(text);

  if (!response.ok) {
    if (response.status === 401) {
      throw new RemoteSyncError('The integration token was rejected. Check the token and permissions.', 401);
    }
    if (response.status === 403) {
      throw new RemoteSyncError('This token cannot read those members. Check privacy and token permissions.', 403);
    }
    if (response.status === 429) {
      const retryAfter = readRetryAfter(body);
      throw new RemoteSyncError(
        retryAfter
          ? `The provider rate limited this sync. Try again after ${retryAfter}.`
          : 'The provider rate limited this sync. Please try again in a moment.',
        429,
      );
    }

    throw new RemoteSyncError(readRemoteMessage(body) ?? `Provider request failed with HTTP ${response.status}.`, response.status);
  }

  if (response.status === 204 || text.length === 0) return null;
  return body;
}

function parseRemoteBody(text: string): unknown {
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function isExternalMember(value: unknown): value is ExternalMember {
  return isRecord(value)
    && value.provider === PROVIDERS.PLURALKIT
    && typeof value.externalId === 'string'
    && value.externalId.trim().length > 0
    && typeof value.name === 'string'
    && value.name.trim().length > 0;
}

function readId(value: unknown, keys: string[]): string | null {
  if (!isRecord(value)) return null;
  for (const key of keys) {
    const raw = value[key];
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
  }
  return null;
}

async function applySyncPlan(tx: SyncTransaction, systemId: string, operations: SyncOperation[]) {
  const now = new Date();

  for (const operation of operations) {
    if (operation.action === 'skip') continue;

    if (operation.action === 'create') {
      if (!operation.member || !operation.link) continue;

      const memberId = createId();
      await tx.insert(members).values({
        id: memberId,
        systemId,
        name: String(operation.member.name),
        pronouns: toNullableString(operation.member.pronouns),
        avatarUrl: toNullableString(operation.member.avatarUrl),
        description: toNullableString(operation.member.description),
        color: toNullableString(operation.member.color),
        role: toNullableString(operation.member.role),
        tags: toNullableString(operation.member.tags),
        notes: toNullableString(operation.member.notes),
        isArchived: operation.member.isArchived === 1 ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      });

      await upsertExternalLink(tx, systemId, memberId, operation.link, now);
      continue;
    }

    if (!operation.memberId || !operation.link) continue;

    if (operation.action === 'update' && operation.patch && Object.keys(operation.patch).length > 0) {
      await tx
        .update(members)
        .set({
          ...operation.patch,
          updatedAt: now,
        })
        .where(and(eq(members.id, operation.memberId), eq(members.systemId, systemId)));
    }

    await upsertExternalLink(tx, systemId, operation.memberId, operation.link, now);
  }
}

async function syncFrontFromPluralKit(
  tx: SyncTransaction,
  systemId: string,
  currentFrontExternalIds: string[],
  currentFrontStartedAt: Date | null,
): Promise<FrontSyncResult> {
  const remoteIds = Array.from(new Set(currentFrontExternalIds.map((id) => id.trim()).filter(Boolean)));

  if (remoteIds.length === 0) {
    const ended = await tx
      .update(frontEntries)
      .set({ endedAt: new Date() })
      .where(and(eq(frontEntries.systemId, systemId), isNull(frontEntries.endedAt)))
      .returning({ id: frontEntries.id });

    return {
      status: ended.length > 0 ? 'ended' : 'unchanged',
      remoteFrontCount: 0,
      appliedMemberCount: 0,
      reason: ended.length > 0 ? 'remote_front_empty' : 'already_empty',
    };
  }

  const linkedRows = await tx
    .select({
      memberId: memberExternalLinks.memberId,
      externalId: memberExternalLinks.externalId,
      externalSecondaryId: memberExternalLinks.externalSecondaryId,
    })
    .from(memberExternalLinks)
    .where(and(
      eq(memberExternalLinks.systemId, systemId),
      eq(memberExternalLinks.provider, PROVIDERS.PLURALKIT),
      or(
        inArray(memberExternalLinks.externalId, remoteIds),
        inArray(memberExternalLinks.externalSecondaryId, remoteIds),
      ),
    ));

  const linkByExternalId = new Map<string, string>();
  const linkBySecondaryId = new Map<string, string>();
  for (const row of linkedRows) {
    if (row.externalId) linkByExternalId.set(row.externalId, row.memberId);
    if (row.externalSecondaryId) linkBySecondaryId.set(row.externalSecondaryId, row.memberId);
  }

  const memberIdsInRemoteOrder: string[] = [];
  const seenMemberIds = new Set<string>();
  for (const remoteId of remoteIds) {
    const memberId = linkByExternalId.get(remoteId) ?? linkBySecondaryId.get(remoteId);
    if (!memberId || seenMemberIds.has(memberId)) continue;
    seenMemberIds.add(memberId);
    memberIdsInRemoteOrder.push(memberId);
  }

  if (memberIdsInRemoteOrder.length === 0) {
    return {
      status: 'skipped',
      remoteFrontCount: remoteIds.length,
      appliedMemberCount: 0,
      reason: 'no_linked_members_for_front',
    };
  }

  const localMembers = await tx
    .select({ id: members.id })
    .from(members)
    .where(and(
      eq(members.systemId, systemId),
      eq(members.isArchived, 0),
      inArray(members.id, memberIdsInRemoteOrder),
    ));

  const availableMemberIds = new Set(localMembers.map((member) => member.id));
  const resolvedMemberIds = memberIdsInRemoteOrder.filter((memberId) => availableMemberIds.has(memberId));
  if (resolvedMemberIds.length === 0) {
    return {
      status: 'skipped',
      remoteFrontCount: remoteIds.length,
      appliedMemberCount: 0,
      reason: 'linked_members_not_available',
    };
  }

  const [activeFront] = await tx
    .select()
    .from(frontEntries)
    .where(and(eq(frontEntries.systemId, systemId), isNull(frontEntries.endedAt)))
    .limit(1);

  if (activeFront) {
    try {
      const activeMemberIds = parseMemberIds(activeFront.memberIds);
      if (sameMemberList(activeMemberIds, resolvedMemberIds)) {
        return {
          status: 'unchanged',
          remoteFrontCount: remoteIds.length,
          appliedMemberCount: resolvedMemberIds.length,
          reason: 'already_in_sync',
        };
      }
    } catch {
      // If corrupted local data exists, replace with a clean synced front entry.
    }
  }

  const now = new Date();
  await tx
    .update(frontEntries)
    .set({ endedAt: now })
    .where(and(eq(frontEntries.systemId, systemId), isNull(frontEntries.endedAt)));

  await tx.insert(frontEntries).values({
    id: createId(),
    systemId,
    memberIds: serializeMemberIds(resolvedMemberIds),
    startedAt: currentFrontStartedAt ?? now,
    endedAt: null,
    note: 'Synced from PluralKit',
    createdAt: now,
  });

  return {
    status: 'started',
    remoteFrontCount: remoteIds.length,
    appliedMemberCount: resolvedMemberIds.length,
    reason: 'applied_remote_front',
  };
}

function sameMemberList(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

async function upsertExternalLink(
  tx: SyncTransaction,
  systemId: string,
  memberId: string,
  link: NonNullable<SyncOperation['link']>,
  now: Date,
) {
  const [byExternal] = await tx
    .select()
    .from(memberExternalLinks)
    .where(and(
      eq(memberExternalLinks.systemId, systemId),
      eq(memberExternalLinks.provider, link.provider),
      eq(memberExternalLinks.externalId, link.externalId),
    ))
    .limit(1);

  const [byMemberProvider] = await tx
    .select()
    .from(memberExternalLinks)
    .where(and(
      eq(memberExternalLinks.systemId, systemId),
      eq(memberExternalLinks.provider, link.provider),
      eq(memberExternalLinks.memberId, memberId),
    ))
    .limit(1);

  if (byExternal && byMemberProvider && byExternal.id !== byMemberProvider.id) {
    throw new RemoteSyncError('This sync found conflicting existing integration links. Nothing was changed.', 409);
  }

  const existing = byExternal ?? byMemberProvider;
  const nextValues = {
    memberId,
    externalId: link.externalId,
    externalSecondaryId: link.externalSecondaryId ?? null,
    externalName: link.externalName ?? null,
    metadata: link.metadata ?? null,
    lastSyncedAt: now,
    updatedAt: now,
  };

  if (existing) {
    await tx
      .update(memberExternalLinks)
      .set(nextValues)
      .where(eq(memberExternalLinks.id, existing.id));
    return;
  }

  await tx.insert(memberExternalLinks).values({
    id: createId(),
    systemId,
    provider: link.provider,
    ...nextValues,
    createdAt: now,
  });
}

function compactOperations(operations: SyncOperation[]) {
  return operations.slice(0, MAX_PREVIEW_OPERATIONS).map((operation) => ({
    action: operation.action,
    provider: operation.provider,
    externalId: operation.externalId,
    externalSecondaryId: operation.externalSecondaryId ?? null,
    name: operation.name,
    reason: operation.reason,
    memberId: operation.memberId ?? null,
    changedFields: operation.changedFields ?? [],
  }));
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}
