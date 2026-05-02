const PROVIDERS = Object.freeze({
  PLURALKIT: 'pluralkit',
});

const DEFAULT_SYNC_OVERRIDE_FIELDS = Object.freeze({
  name: false,
  pronouns: false,
  description: false,
  avatarUrl: false,
  color: false,
  role: false,
  tags: false,
  notes: false,
});

const DEFAULT_SYNC_OPTIONS = Object.freeze({
  importNewMembers: true,
  updateExistingMembers: true,
  dedupeMode: 'smart',
  overrideFields: DEFAULT_SYNC_OVERRIDE_FIELDS,
});

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeBase(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeOptionalText(value) {
  if (value == null) return null;
  const normalized = normalizeBase(value);
  return normalized.length > 0 ? normalized : null;
}

function cleanString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseStoredTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter((tag) => typeof tag === 'string');

  try {
    const parsed = JSON.parse(tags);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tag) => typeof tag === 'string');
  } catch {
    return [];
  }
}

function coerceTags(tags) {
  if (tags == null) return [];
  if (Array.isArray(tags)) return tags.filter((tag) => typeof tag === 'string' && tag.trim());
  if (typeof tags !== 'string') return [];

  const trimmed = tags.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.filter((tag) => typeof tag === 'string' && tag.trim());
  } catch {
    return trimmed.split(',').map((tag) => tag.trim()).filter(Boolean);
  }

  return [];
}

function normalizeTags(tags) {
  return Array.from(new Set(coerceTags(tags).map(normalizeBase).filter(Boolean))).sort();
}

function normalizeColor(color) {
  const value = cleanString(color);
  if (!value) return null;

  const withoutHash = value.startsWith('#') ? value.slice(1) : value;
  if (!/^[0-9a-fA-F]{6}$/.test(withoutHash)) return null;
  return `#${withoutHash.toLowerCase()}`;
}

function normalizeUrl(value) {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(cleaned)) return cleaned;

  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return cleaned;
  } catch {
    return null;
  }

  return null;
}

function sanitizeSyncOptions(input) {
  const source = isRecord(input) ? input : {};
  const overrides = isRecord(source.overrideFields) ? source.overrideFields : {};

  return {
    importNewMembers: typeof source.importNewMembers === 'boolean'
      ? source.importNewMembers
      : DEFAULT_SYNC_OPTIONS.importNewMembers,
    updateExistingMembers: typeof source.updateExistingMembers === 'boolean'
      ? source.updateExistingMembers
      : DEFAULT_SYNC_OPTIONS.updateExistingMembers,
    dedupeMode: source.dedupeMode === 'strict' ? 'strict' : 'smart',
    overrideFields: {
      name: typeof overrides.name === 'boolean' ? overrides.name : DEFAULT_SYNC_OVERRIDE_FIELDS.name,
      pronouns: typeof overrides.pronouns === 'boolean' ? overrides.pronouns : DEFAULT_SYNC_OVERRIDE_FIELDS.pronouns,
      description: typeof overrides.description === 'boolean' ? overrides.description : DEFAULT_SYNC_OVERRIDE_FIELDS.description,
      avatarUrl: typeof overrides.avatarUrl === 'boolean'
        ? overrides.avatarUrl
        : typeof overrides.avatar === 'boolean'
          ? overrides.avatar
          : DEFAULT_SYNC_OVERRIDE_FIELDS.avatarUrl,
      color: typeof overrides.color === 'boolean' ? overrides.color : DEFAULT_SYNC_OVERRIDE_FIELDS.color,
      role: typeof overrides.role === 'boolean' ? overrides.role : DEFAULT_SYNC_OVERRIDE_FIELDS.role,
      tags: typeof overrides.tags === 'boolean' ? overrides.tags : DEFAULT_SYNC_OVERRIDE_FIELDS.tags,
      notes: typeof overrides.notes === 'boolean' ? overrides.notes : DEFAULT_SYNC_OVERRIDE_FIELDS.notes,
    },
  };
}

function normalizeExistingMember(member) {
  return {
    id: member.id,
    name: normalizeBase(member.name),
    pronouns: normalizeOptionalText(member.pronouns),
    role: normalizeOptionalText(member.role),
    tags: normalizeTags(parseStoredTags(member.tags)),
  };
}

function normalizeExternalForMatch(member) {
  return {
    name: normalizeBase(member.name),
    pronouns: normalizeOptionalText(member.pronouns),
    role: normalizeOptionalText(member.role),
    tags: normalizeTags(member.tags),
  };
}

function scoreSmartMatch(imported, candidate) {
  let score = 0;
  let conflictCount = 0;

  if (imported.pronouns && candidate.pronouns) {
    if (imported.pronouns === candidate.pronouns) score += 2;
    else conflictCount += 1;
  }

  if (imported.role && candidate.role) {
    if (imported.role === candidate.role) score += 2;
    else conflictCount += 1;
  }

  if (imported.tags.length > 0 && candidate.tags.length > 0) {
    const candidateTags = new Set(candidate.tags);
    if (imported.tags.some((tag) => candidateTags.has(tag))) score += 1;
    else conflictCount += 1;
  }

  return { score, conflictCount };
}

function isSmartMatch(imported, candidate) {
  if (!imported.name || imported.name !== candidate.name) return false;

  const hasMetadata = imported.pronouns !== null || imported.role !== null || imported.tags.length > 0;
  if (!hasMetadata) return true;

  const { score, conflictCount } = scoreSmartMatch(imported, candidate);
  return !(conflictCount > 0 && score === 0);
}

function findExistingMemberMatch(external, existingMembers, options) {
  const normalizedExternal = normalizeExternalForMatch(external);
  if (!normalizedExternal.name) return { member: null, ambiguous: false };

  const candidates = existingMembers.filter((member) => normalizeExistingMember(member).name === normalizedExternal.name);
  if (candidates.length === 0) return { member: null, ambiguous: false };

  if (options.dedupeMode === 'strict') {
    return candidates.length === 1
      ? { member: candidates[0], ambiguous: false }
      : { member: null, ambiguous: true };
  }

  if (candidates.length === 1) {
    return { member: candidates[0], ambiguous: false };
  }

  let best = null;
  let bestScore = -1;
  let tie = false;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeExistingMember(candidate);
    if (!isSmartMatch(normalizedExternal, normalizedCandidate)) continue;

    const { score } = scoreSmartMatch(normalizedExternal, normalizedCandidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
      tie = false;
    } else if (score === bestScore) {
      tie = true;
    }
  }

  if (!best) return { member: null, ambiguous: false };
  if (tie || candidates.length > 1 && bestScore <= 0) return { member: null, ambiguous: true };
  return { member: best, ambiguous: false };
}

function linkKey(provider, externalId) {
  return `${provider}:${normalizeBase(externalId)}`;
}

function buildLinkIndexes(existingLinks) {
  const byProviderExternal = new Map();
  const pluralKitByAnyId = new Map();

  for (const link of existingLinks) {
    if (!link.provider || !link.externalId || !link.memberId) continue;

    byProviderExternal.set(linkKey(link.provider, link.externalId), link);
    if (link.externalSecondaryId) byProviderExternal.set(linkKey(link.provider, link.externalSecondaryId), link);

    if (link.provider === PROVIDERS.PLURALKIT) {
      pluralKitByAnyId.set(normalizeBase(link.externalId), link);
      if (link.externalSecondaryId) pluralKitByAnyId.set(normalizeBase(link.externalSecondaryId), link);
    }

  }

  return { byProviderExternal, pluralKitByAnyId };
}

function findLinkedMember(external, indexes, existingById) {
  const direct = indexes.byProviderExternal.get(linkKey(external.provider, external.externalId))
    ?? (external.externalSecondaryId
      ? indexes.byProviderExternal.get(linkKey(external.provider, external.externalSecondaryId))
      : null);

  if (direct && existingById.has(direct.memberId)) {
    return { member: existingById.get(direct.memberId), link: direct, matchedBy: 'external-link' };
  }

  const externalPkIds = [external.externalPluralKitId, external.provider === PROVIDERS.PLURALKIT ? external.externalId : null, external.externalSecondaryId]
    .map(normalizeOptionalText)
    .filter(Boolean);

  for (const pkId of externalPkIds) {
    const cross = indexes.pluralKitByAnyId.get(pkId);
    if (cross && existingById.has(cross.memberId)) {
      return { member: existingById.get(cross.memberId), link: cross, matchedBy: 'cross-provider-link' };
    }
  }

  return { member: null, link: null, matchedBy: null };
}

function readExternalId(raw, keys) {
  for (const key of keys) {
    const value = cleanString(raw[key]);
    if (value) return value;
  }
  return null;
}

function normalizeExternalMember(raw) {
  const provider = raw.provider;
  const externalId = cleanString(raw.externalId);
  const name = cleanString(raw.name);
  const color = normalizeColor(raw.color);
  const tags = coerceTags(raw.tags);

  return {
    provider,
    externalId,
    externalSecondaryId: cleanString(raw.externalSecondaryId),
    externalPluralKitId: cleanString(raw.externalPluralKitId),
    name,
    pronouns: cleanString(raw.pronouns),
    avatarUrl: normalizeUrl(raw.avatarUrl),
    description: cleanString(raw.description),
    color,
    role: cleanString(raw.role),
    tags,
    notes: cleanString(raw.notes),
    isArchived: Boolean(raw.isArchived),
    metadata: isRecord(raw.metadata) ? raw.metadata : {},
  };
}

function pickField(existingValue, incomingValue, allowOverride) {
  if (incomingValue == null || incomingValue === '') return existingValue ?? null;
  if (allowOverride) return incomingValue;
  return existingValue == null || existingValue === '' ? incomingValue : existingValue;
}

function pickTags(existingTags, incomingTags, allowOverride) {
  const incoming = coerceTags(incomingTags);
  if (incoming.length === 0) return existingTags ?? null;
  if (allowOverride) return JSON.stringify(incoming);

  const existing = parseStoredTags(existingTags);
  return existing.length === 0 ? JSON.stringify(incoming) : existingTags ?? null;
}

function computeMemberPatch(existing, external, overrideFields) {
  const patch = {};
  const changedFields = [];

  const candidates = {
    name: pickField(existing.name, external.name, overrideFields.name),
    pronouns: pickField(existing.pronouns, external.pronouns, overrideFields.pronouns),
    avatarUrl: pickField(existing.avatarUrl, external.avatarUrl, overrideFields.avatarUrl),
    description: pickField(existing.description, external.description, overrideFields.description),
    color: pickField(existing.color, external.color, overrideFields.color),
    role: pickField(existing.role, external.role, overrideFields.role),
    tags: pickTags(existing.tags, external.tags, overrideFields.tags),
    notes: pickField(existing.notes, external.notes, overrideFields.notes),
  };

  for (const [field, value] of Object.entries(candidates)) {
    const current = existing[field] ?? null;
    const next = value ?? null;
    if (current !== next) {
      patch[field] = next;
      changedFields.push(field);
    }
  }

  return { patch, changedFields };
}

function buildLinkPayload(external) {
  return {
    provider: external.provider,
    externalId: external.externalId,
    externalSecondaryId: external.externalSecondaryId ?? external.externalPluralKitId ?? null,
    externalName: external.name,
    metadata: JSON.stringify({
      ...external.metadata,
      externalPluralKitId: external.externalPluralKitId ?? undefined,
    }),
  };
}

function memberCreatePayload(external) {
  return {
    name: external.name,
    pronouns: external.pronouns,
    avatarUrl: external.avatarUrl,
    description: external.description,
    color: external.color,
    role: external.role,
    tags: external.tags.length > 0 ? JSON.stringify(external.tags) : null,
    notes: external.notes,
    isArchived: external.isArchived ? 1 : 0,
  };
}

function makeSummary(operations) {
  const summary = {
    fetched: operations.length,
    create: 0,
    update: 0,
    link: 0,
    skip: 0,
    unchanged: 0,
    skippedReasons: {},
  };

  for (const operation of operations) {
    summary[operation.action] = (summary[operation.action] ?? 0) + 1;
    if (operation.action === 'skip') {
      summary.skippedReasons[operation.reason] = (summary.skippedReasons[operation.reason] ?? 0) + 1;
    }
  }

  return summary;
}

function planMemberSync(input) {
  const options = sanitizeSyncOptions(input.options);
  const existingMembers = Array.isArray(input.existingMembers) ? input.existingMembers : [];
  const existingLinks = Array.isArray(input.existingLinks) ? input.existingLinks : [];
  const externalMembers = Array.isArray(input.externalMembers) ? input.externalMembers : [];
  const indexes = buildLinkIndexes(existingLinks);
  const existingById = new Map(existingMembers.map((member) => [member.id, member]));
  const operations = [];
  const seenExternalIds = new Set();

  const sourceNameCounts = new Map();
  for (const raw of externalMembers) {
    const external = normalizeExternalMember(raw);
    if (!external.name) continue;
    const normalizedName = normalizeBase(external.name);
    sourceNameCounts.set(normalizedName, (sourceNameCounts.get(normalizedName) ?? 0) + 1);
  }

  for (const raw of externalMembers) {
    const external = normalizeExternalMember(raw);
    const baseOperation = {
      provider: external.provider,
      externalId: external.externalId,
      externalSecondaryId: external.externalSecondaryId,
      name: external.name,
    };

    if (!external.provider || !external.externalId || !external.name) {
      operations.push({ ...baseOperation, action: 'skip', reason: 'invalid_external_member' });
      continue;
    }

    const externalKey = linkKey(external.provider, external.externalId);
    if (seenExternalIds.has(externalKey)) {
      operations.push({ ...baseOperation, action: 'skip', reason: 'duplicate_external_id' });
      continue;
    }
    seenExternalIds.add(externalKey);

    const linked = findLinkedMember(external, indexes, existingById);
    let matchedMember = linked.member;
    let matchedBy = linked.matchedBy;

    if (!matchedMember) {
      const normalizedName = normalizeBase(external.name);
      if ((sourceNameCounts.get(normalizedName) ?? 0) > 1) {
        operations.push({ ...baseOperation, action: 'skip', reason: 'ambiguous_source_name' });
        continue;
      }

      const match = findExistingMemberMatch(external, existingMembers, options);
      if (match.ambiguous) {
        operations.push({ ...baseOperation, action: 'skip', reason: 'ambiguous_existing_match' });
        continue;
      }
      matchedMember = match.member;
      matchedBy = matchedMember ? 'dedupe' : null;
    }

    if (matchedMember) {
      const linkPayload = buildLinkPayload(external);
      const { patch, changedFields } = computeMemberPatch(matchedMember, external, options.overrideFields);

      if (!options.updateExistingMembers) {
        operations.push({
          ...baseOperation,
          action: 'link',
          reason: matchedBy ?? 'matched',
          memberId: matchedMember.id,
          link: linkPayload,
          changedFields: [],
        });
        continue;
      }

      operations.push({
        ...baseOperation,
        action: changedFields.length > 0 ? 'update' : 'unchanged',
        reason: matchedBy ?? 'matched',
        memberId: matchedMember.id,
        patch,
        link: linkPayload,
        changedFields,
      });
      continue;
    }

    if (!options.importNewMembers) {
      operations.push({ ...baseOperation, action: 'skip', reason: 'new_members_disabled' });
      continue;
    }

    operations.push({
      ...baseOperation,
      action: 'create',
      reason: 'new_external_member',
      member: memberCreatePayload(external),
      link: buildLinkPayload(external),
      changedFields: ['name', 'pronouns', 'avatarUrl', 'description', 'color', 'role', 'tags', 'notes']
        .filter((field) => {
          if (field === 'tags') return external.tags.length > 0;
          return external[field] != null;
        }),
    });
  }

  return {
    operations,
    summary: makeSummary(operations),
  };
}

function mapPluralKitMember(raw) {
  const id = readExternalId(raw, ['uuid', 'id']);
  const shortId = cleanString(raw.id);
  const displayName = cleanString(raw.display_name);
  const name = displayName ?? cleanString(raw.name);

  return normalizeExternalMember({
    provider: PROVIDERS.PLURALKIT,
    externalId: id,
    externalSecondaryId: shortId && shortId !== id ? shortId : null,
    name,
    pronouns: raw.pronouns,
    avatarUrl: raw.avatar_url ?? raw.webhook_avatar_url,
    description: raw.description,
    color: raw.color,
    tags: [],
    metadata: {
      shortId,
      uuid: cleanString(raw.uuid),
      displayName,
      birthday: cleanString(raw.birthday),
    },
  });
}

module.exports = {
  PROVIDERS,
  DEFAULT_SYNC_OPTIONS,
  DEFAULT_SYNC_OVERRIDE_FIELDS,
  buildLinkIndexes,
  coerceTags,
  computeMemberPatch,
  mapPluralKitMember,
  normalizeBase,
  normalizeColor,
  normalizeExternalMember,
  normalizeOptionalText,
  parseStoredTags,
  planMemberSync,
  sanitizeSyncOptions,
};
