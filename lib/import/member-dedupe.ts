export type DedupeMode = 'strict' | 'smart';

export interface ImportedMemberInput {
  name: string;
  pronouns?: string | null;
  avatarUrl?: string | null;
  description?: string | null;
  color?: string | null;
  role?: string | null;
  tags?: string[] | string | null;
  notes?: string | null;
}

export interface ExistingMemberForDedupe {
  id: string;
  name: string;
  pronouns: string | null;
  role: string | null;
  tags: string | null; // JSON string in DB
}

export interface NormalizedMember {
  name: string;
  pronouns: string | null;
  role: string | null;
  tags: string[];
}

export function normalizeBase(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeName(name: string): string {
  return normalizeBase(name);
}

export function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = normalizeBase(value);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  const unique = new Set<string>();
  for (const tag of input) {
    if (typeof tag !== 'string') continue;
    const normalized = normalizeBase(tag);
    if (normalized) unique.add(normalized);
  }

  return Array.from(unique).sort();
}

export function coerceImportedTags(tags: ImportedMemberInput['tags']): string[] | null | undefined {
  if (tags === undefined) return undefined;
  if (tags === null) return null;

  if (Array.isArray(tags)) {
    const normalizedArray = tags.filter((tag): tag is string => typeof tag === 'string');
    return normalizedArray;
  }

  if (typeof tags === 'string') {
    const trimmed = tags.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((tag): tag is string => typeof tag === 'string');
      }
    } catch {
      return trimmed
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
  }

  return undefined;
}

export function parseStoredTags(tags: string | null | undefined): string[] {
  if (!tags) return [];

  try {
    const parsed: unknown = JSON.parse(tags);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tag): tag is string => typeof tag === 'string');
  } catch {
    return [];
  }
}

export function normalizeImportedMember(member: ImportedMemberInput): NormalizedMember {
  return {
    name: normalizeName(member.name),
    pronouns: normalizeOptionalText(member.pronouns),
    role: normalizeOptionalText(member.role),
    tags: normalizeTags(coerceImportedTags(member.tags) ?? []),
  };
}

export function normalizeExistingMember(member: ExistingMemberForDedupe): NormalizedMember {
  return {
    name: normalizeName(member.name),
    pronouns: normalizeOptionalText(member.pronouns),
    role: normalizeOptionalText(member.role),
    tags: normalizeTags(parseStoredTags(member.tags)),
  };
}

interface SmartScoreResult {
  score: number;
  conflictCount: number;
}

function scoreSmartMatch(imported: NormalizedMember, candidate: NormalizedMember): SmartScoreResult {
  let score = 0;
  let conflictCount = 0;

  const importedPronouns = imported.pronouns;
  const candidatePronouns = candidate.pronouns;
  if (importedPronouns && candidatePronouns) {
    if (importedPronouns === candidatePronouns) score += 2;
    else conflictCount += 1;
  }

  const importedRole = imported.role;
  const candidateRole = candidate.role;
  if (importedRole && candidateRole) {
    if (importedRole === candidateRole) score += 2;
    else conflictCount += 1;
  }

  if (imported.tags.length > 0 && candidate.tags.length > 0) {
    const candidateTagSet = new Set(candidate.tags);
    const overlap = imported.tags.some((tag) => candidateTagSet.has(tag));
    if (overlap) score += 1;
    else conflictCount += 1;
  }

  return { score, conflictCount };
}

export function isStrictMatch(imported: NormalizedMember, candidate: NormalizedMember): boolean {
  return imported.name.length > 0 && imported.name === candidate.name;
}

export function isSmartMatch(imported: NormalizedMember, candidate: NormalizedMember): boolean {
  if (!isStrictMatch(imported, candidate)) return false;

  const hasMetadata =
    imported.pronouns !== null ||
    imported.role !== null ||
    imported.tags.length > 0;

  if (!hasMetadata) return true;

  const { score, conflictCount } = scoreSmartMatch(imported, candidate);

  // Reduce false positives:
  // - if metadata conflicts and there is no positive corroboration, do not match.
  if (conflictCount > 0 && score === 0) return false;

  return true;
}

export function findMatchingExistingMember(
  imported: ImportedMemberInput,
  existingMembers: ExistingMemberForDedupe[],
  dedupeMode: DedupeMode,
): ExistingMemberForDedupe | null {
  const normalizedImported = normalizeImportedMember(imported);
  if (!normalizedImported.name) return null;

  const sameNameCandidates = existingMembers.filter((member) => {
    const normalizedExisting = normalizeExistingMember(member);
    return normalizedExisting.name === normalizedImported.name;
  });

  if (sameNameCandidates.length === 0) return null;

  if (dedupeMode === 'strict') {
    return sameNameCandidates[0] ?? null;
  }

  let best: ExistingMemberForDedupe | null = null;
  let bestScore = -1;
  let hasTie = false;

  for (const candidate of sameNameCandidates) {
    const normalizedCandidate = normalizeExistingMember(candidate);
    if (!isSmartMatch(normalizedImported, normalizedCandidate)) continue;

    const { score } = scoreSmartMatch(normalizedImported, normalizedCandidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
      hasTie = false;
    } else if (score === bestScore) {
      hasTie = true;
    }
  }

  // Ambiguous smart matches are treated as "no confident match"
  // to avoid false-positive merges.
  if (hasTie && bestScore > 0) return null;

  return best;
}

export function findDuplicateInsideImport(
  imported: ImportedMemberInput,
  acceptedInCurrentImport: ImportedMemberInput[],
  dedupeMode: DedupeMode,
): ImportedMemberInput | null {
  const normalizedImported = normalizeImportedMember(imported);
  if (!normalizedImported.name) return null;

  for (const existingImported of acceptedInCurrentImport) {
    const normalizedExistingImported = normalizeImportedMember(existingImported);

    if (dedupeMode === 'strict' && isStrictMatch(normalizedImported, normalizedExistingImported)) {
      return existingImported;
    }

    if (dedupeMode === 'smart' && isSmartMatch(normalizedImported, normalizedExistingImported)) {
      return existingImported;
    }
  }

  return null;
}
