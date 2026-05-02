import { db } from '@/lib/db';
import { memberExternalLinks, members } from '@/lib/db/schema';
import { requireAuth, ok, err } from '@/lib/api/helpers';
import { createId } from '@paralleldrive/cuid2';
import { and, eq, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
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
};

type SyncTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const MAX_PREVIEW_OPERATIONS = 60;
const PLURALKIT_BASE_URL = 'https://api.pluralkit.me/v2';

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

  const body = await request.json().catch(() => null) as SyncBody | null;
  if (!body || typeof body !== 'object') return err('Invalid JSON body.');

  const provider = parseProvider(body.provider);
  if (!provider) return err('Choose PluralKit before syncing.');

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) return err('Integration token is required.');

  const apply = body.apply === true;
  const options = sanitizeSyncOptions(body.options);

  try {
    const [existingMembers, existingLinks, remote] = await Promise.all([
      db.select().from(members).where(eq(members.systemId, auth.systemId)),
      db.select().from(memberExternalLinks).where(eq(memberExternalLinks.systemId, auth.systemId)),
      fetchExternalMembers({
        provider,
        token,
      }),
    ]);

    const plan = planMemberSync({
      existingMembers,
      existingLinks,
      externalMembers: remote.externalMembers,
      options,
    });

    if (apply) {
      await applySyncPlan(auth.systemId, plan.operations as SyncOperation[]);
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
    });
  } catch (error) {
    if (error instanceof RemoteSyncError) {
      return err(error.message, error.status);
    }

    return err('Sync failed before anything was changed. Please try again.', 500);
  }
}

function parseProvider(value: unknown): SyncProvider | null {
  if (value === PROVIDERS.PLURALKIT) return PROVIDERS.PLURALKIT;
  return null;
}

async function fetchExternalMembers(input: {
  provider: SyncProvider;
  token: string;
}): Promise<FetchMembersResult> {
  return fetchPluralKitMembers(input.token);
}

async function fetchPluralKitMembers(token: string): Promise<FetchMembersResult> {
  const headers = {
    Authorization: token,
    'User-Agent': SOLARA_USER_AGENT,
    Accept: 'application/json',
  };

  const [system, rawMembers] = await Promise.all([
    remoteJson(`${PLURALKIT_BASE_URL}/systems/@me`, { headers }),
    remoteJson(`${PLURALKIT_BASE_URL}/systems/@me/members`, { headers }),
  ]);

  const membersList = asArray(rawMembers).map((raw) => mapPluralKitMember(toRecord(raw))).filter(isExternalMember);
  const remoteSystemId = readId(system, ['uuid', 'id']);

  return { remoteSystemId, externalMembers: membersList };
}

async function remoteJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
  });

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

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value.data)) return value.data;
  if (isRecord(value) && Array.isArray(value.results)) return value.results;
  return [];
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

function readRemoteMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 240);
  if (!isRecord(value)) return null;

  const message = value.message ?? value.error ?? value.msg;
  return typeof message === 'string' && message.trim() ? message.trim().slice(0, 240) : null;
}

function readRetryAfter(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const retry = value.retry_after;
  if (typeof retry !== 'number' || !Number.isFinite(retry)) return null;
  if (retry >= 1000) return `${Math.ceil(retry / 1000)} seconds`;
  return `${retry} ms`;
}

async function applySyncPlan(systemId: string, operations: SyncOperation[]) {
  const now = new Date();

  await db.transaction(async (tx) => {
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
  });
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}
