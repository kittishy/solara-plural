export type AccountType = 'system' | 'singlet';
export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'canceled';
export const friendMemberVisibilityValues = ['hidden', 'profile', 'full'] as const;
export type FriendMemberVisibility = (typeof friendMemberVisibilityValues)[number];
export const friendShareFieldKeys = [
  'pronouns',
  'description',
  'avatarUrl',
  'color',
  'role',
  'tags',
  'notes',
] as const;
export type FriendShareFieldKey = (typeof friendShareFieldKeys)[number];
export type FriendMemberFieldVisibility = Record<FriendShareFieldKey, boolean>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function canonicalFriendPair(firstId: string, secondId: string): {
  systemAId: string;
  systemBId: string;
} {
  return firstId < secondId
    ? { systemAId: firstId, systemBId: secondId }
    : { systemAId: secondId, systemBId: firstId };
}

export function parseFriendMemberVisibility(value: unknown): FriendMemberVisibility | null {
  if (typeof value !== 'string') return null;
  return (friendMemberVisibilityValues as readonly string[]).includes(value)
    ? (value as FriendMemberVisibility)
    : null;
}

export function defaultFieldVisibilityForLevel(
  visibility: FriendMemberVisibility,
): FriendMemberFieldVisibility {
  if (visibility === 'full') {
    return {
      pronouns: true,
      description: true,
      avatarUrl: true,
      color: true,
      role: true,
      tags: true,
      notes: true,
    };
  }

  if (visibility === 'hidden') {
    return {
      pronouns: false,
      description: false,
      avatarUrl: false,
      color: false,
      role: false,
      tags: false,
      notes: false,
    };
  }

  return {
    pronouns: true,
    description: true,
    avatarUrl: true,
    color: true,
    role: true,
    tags: true,
    notes: false,
  };
}

export function parseFriendMemberFieldVisibility(value: unknown): FriendMemberFieldVisibility | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const parsed: Partial<FriendMemberFieldVisibility> = {};

  for (const key of friendShareFieldKeys) {
    if (typeof record[key] === 'boolean') {
      parsed[key] = record[key] as boolean;
    }
  }

  if (Object.keys(parsed).length === 0) {
    return null;
  }

  const baseline = defaultFieldVisibilityForLevel('profile');
  return { ...baseline, ...parsed };
}

export function parseStoredFieldVisibilityJson(
  value: string | null,
  visibility: FriendMemberVisibility,
): FriendMemberFieldVisibility {
  if (!value) return defaultFieldVisibilityForLevel(visibility);

  try {
    const parsed = JSON.parse(value);
    return parseFriendMemberFieldVisibility(parsed) ?? defaultFieldVisibilityForLevel(visibility);
  } catch {
    return defaultFieldVisibilityForLevel(visibility);
  }
}
