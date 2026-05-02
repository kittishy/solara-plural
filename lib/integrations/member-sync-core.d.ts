export type SyncProvider = 'pluralkit';
export type DedupeMode = 'strict' | 'smart';

export const PROVIDERS: {
  readonly PLURALKIT: 'pluralkit';
};

export type SyncOverrideFields = {
  name: boolean;
  pronouns: boolean;
  description: boolean;
  avatarUrl: boolean;
  color: boolean;
  role: boolean;
  tags: boolean;
  notes: boolean;
};

export type SyncOptions = {
  importNewMembers: boolean;
  updateExistingMembers: boolean;
  dedupeMode: DedupeMode;
  overrideFields: SyncOverrideFields;
};

export type ExternalMember = {
  provider: SyncProvider;
  externalId: string;
  externalSecondaryId?: string | null;
  externalPluralKitId?: string | null;
  name: string;
  pronouns?: string | null;
  avatarUrl?: string | null;
  description?: string | null;
  color?: string | null;
  role?: string | null;
  tags?: string[];
  notes?: string | null;
  isArchived?: boolean;
  metadata?: Record<string, unknown>;
};

export type SyncOperation = {
  action: 'create' | 'update' | 'link' | 'skip' | 'unchanged';
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

export function sanitizeSyncOptions(input: unknown): SyncOptions;
export function planMemberSync(input: {
  existingMembers: Array<Record<string, unknown>>;
  existingLinks: Array<Record<string, unknown>>;
  externalMembers: ExternalMember[];
  options?: unknown;
}): {
  operations: SyncOperation[];
  summary: {
    fetched: number;
    create: number;
    update: number;
    link: number;
    skip: number;
    unchanged: number;
    skippedReasons: Record<string, number>;
  };
};
export function mapPluralKitMember(raw: Record<string, unknown>): ExternalMember;
