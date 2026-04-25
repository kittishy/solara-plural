import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';
import { requireAuth, ok, err } from '@/lib/api/helpers';
import {
  coerceImportedTags,
  findDuplicateInsideImport,
  findMatchingExistingMember,
  type DedupeMode,
  type ImportedMemberInput,
  type ExistingMemberForDedupe,
} from '@/lib/import/member-dedupe';
import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';

// Shape of each member object we accept from an import file.
// All fields except `name` are optional — we map whatever is present.
interface ImportedMember extends ImportedMemberInput {}

interface ImportOverrideFields {
  name?: boolean;
  pronouns?: boolean;
  description?: boolean;
  avatarUrl?: boolean;
  color?: boolean;
  role?: boolean;
  tags?: boolean;
  notes?: boolean;
}

interface ParsedImportOptions {
  importNewMembers: boolean;
  updateExistingMembers: boolean;
  dedupeMode: DedupeMode;
  overrideFields: Required<ImportOverrideFields>;
}

interface ImportBodyObject {
  members?: unknown;
  importNewMembers?: unknown;
  updateExistingMembers?: unknown;
  dedupeMode?: unknown;
  smartDuplicateDetection?: unknown;
  overrideFields?: unknown;
  overrides?: unknown;
  importOptions?: unknown;
}

const DEFAULT_OVERRIDE_FIELDS: Required<ImportOverrideFields> = {
  name: true,
  pronouns: true,
  description: true,
  avatarUrl: true,
  color: true,
  role: true,
  tags: true,
  notes: true,
};

const SHORT_LIST_LIMIT = 20;

function isImportedMember(v: unknown): v is ImportedMember {
  return typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>).name === 'string';
}

function parseBooleanWithDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDedupeMode(value: unknown, smartDuplicateDetection: unknown): DedupeMode {
  if (value === 'strict' || value === 'smart') return value;
  if (typeof smartDuplicateDetection === 'boolean') {
    return smartDuplicateDetection ? 'smart' : 'strict';
  }
  return 'smart';
}

function parseOverrideFields(value: unknown): Required<ImportOverrideFields> {
  if (!isRecord(value)) {
    return { ...DEFAULT_OVERRIDE_FIELDS };
  }

  const raw = value as Record<string, unknown>;
  const avatarValue = typeof raw.avatarUrl === 'boolean' ? raw.avatarUrl : raw.avatar;

  return {
    name: parseBooleanWithDefault(raw.name, DEFAULT_OVERRIDE_FIELDS.name),
    pronouns: parseBooleanWithDefault(raw.pronouns, DEFAULT_OVERRIDE_FIELDS.pronouns),
    description: parseBooleanWithDefault(raw.description, DEFAULT_OVERRIDE_FIELDS.description),
    avatarUrl: parseBooleanWithDefault(avatarValue, DEFAULT_OVERRIDE_FIELDS.avatarUrl),
    color: parseBooleanWithDefault(raw.color, DEFAULT_OVERRIDE_FIELDS.color),
    role: parseBooleanWithDefault(raw.role, DEFAULT_OVERRIDE_FIELDS.role),
    tags: parseBooleanWithDefault(raw.tags, DEFAULT_OVERRIDE_FIELDS.tags),
    notes: parseBooleanWithDefault(raw.notes, DEFAULT_OVERRIDE_FIELDS.notes),
  };
}

function parseImportOptions(body: unknown): ParsedImportOptions {
  if (!isRecord(body)) {
    return {
      importNewMembers: true,
      updateExistingMembers: true,
      dedupeMode: 'smart',
      overrideFields: { ...DEFAULT_OVERRIDE_FIELDS },
    };
  }

  const obj = body as ImportBodyObject;
  const source = isRecord(obj.importOptions) ? (obj.importOptions as ImportBodyObject) : obj;

  return {
    importNewMembers: parseBooleanWithDefault(source.importNewMembers, true),
    updateExistingMembers: parseBooleanWithDefault(source.updateExistingMembers, true),
    dedupeMode: parseDedupeMode(source.dedupeMode, source.smartDuplicateDetection),
    overrideFields: parseOverrideFields(source.overrideFields ?? source.overrides),
  };
}

function pickUpdatedValue(
  existingValue: string | null,
  importedValue: string | null | undefined,
  allowOverride: boolean,
): string | null {
  if (importedValue === undefined) return existingValue;
  if (allowOverride) return importedValue;
  return existingValue ? existingValue : importedValue;
}

function pickUpdatedTags(
  existingJsonTags: string | null,
  importedTagsRaw: ImportedMember['tags'],
  allowOverride: boolean,
): string | null {
  if (importedTagsRaw === undefined) return existingJsonTags;

  const importedTags = coerceImportedTags(importedTagsRaw);
  const nextValue = importedTags ? JSON.stringify(importedTags) : null;
  if (allowOverride) return nextValue;

  return existingJsonTags ? existingJsonTags : nextValue;
}

function shortList(names: string[]): string[] {
  return names.slice(0, SHORT_LIST_LIMIT);
}

function uniqueNames(names: string[]): string[] {
  return Array.from(new Set(names));
}

// POST /api/import — import members from JSON
//
// Accepted formats:
//   1. Simple:       { members: [...] }
//   2. Full export:  { version, exportedAt, system, members: [...], frontHistory: [...], notes: [...] }
//   3. Bare array:   [...]  (non-Solara exports)
//
// Any other shape returns a 400 with a clear message.
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('Invalid JSON file. Choose a Solara export or a member array.');
  }

  const options = parseImportOptions(body);

  // Resolve members array from any supported shape
  let rawMembers: unknown[];
  if (Array.isArray(body)) {
    // Bare array — e.g. [{ name: "..." }, ...]
    rawMembers = body;
  } else if (
    body !== null
    && typeof body === 'object'
    && Array.isArray((body as { members?: unknown }).members)
  ) {
    // Simple format OR full Solara export — both have a top-level `members` array
    rawMembers = (body as { members: unknown[] }).members;
  } else {
    return err(
      'Invalid file format. Expected a Solara export ({ members: [...] }) or a bare member array ([...]).',
    );
  }

  // Filter to only objects that have a non-empty `name` string; silently skip malformed entries
  const importedMembers: ImportedMember[] = rawMembers.filter(isImportedMember);

  if (importedMembers.length === 0) {
    return ok({
      imported: 0,
      updated: 0,
      skipped: 0,
      duplicatesDetected: 0,
      names: [],
      importedNames: [],
      updatedNames: [],
      skippedNames: [],
      duplicateNames: [],
    });
  }

  // Fetch existing members for this system for robust dedupe and optional updates.
  const existing = await db
    .select({
      id: members.id,
      name: members.name,
      pronouns: members.pronouns,
      role: members.role,
      tags: members.tags,
      description: members.description,
      avatarUrl: members.avatarUrl,
      color: members.color,
      notes: members.notes,
    })
    .from(members)
    .where(eq(members.systemId, auth.systemId));

  const existingForDedupe: ExistingMemberForDedupe[] = existing.map((m) => ({
    id: m.id,
    name: m.name,
    pronouns: m.pronouns,
    role: m.role,
    tags: m.tags,
  }));

  const existingById = new Map(existing.map((m) => [m.id, m]));

  const now = new Date();
  const importedNames: string[] = [];
  const updatedNames: string[] = [];
  const skippedNames: string[] = [];
  const duplicateNames: string[] = [];
  const acceptedInCurrentImport: ImportedMember[] = [];

  for (const m of importedMembers) {
    if (!m.name.trim()) {
      skippedNames.push(m.name);
      continue;
    }

    const duplicateInFile = findDuplicateInsideImport(m, acceptedInCurrentImport, options.dedupeMode);
    if (duplicateInFile) {
      duplicateNames.push(m.name);
      skippedNames.push(m.name);
      continue;
    }

    acceptedInCurrentImport.push(m);

    const matchedExisting = findMatchingExistingMember(m, existingForDedupe, options.dedupeMode);
    if (matchedExisting) {
      duplicateNames.push(m.name);

      if (!options.updateExistingMembers) {
        skippedNames.push(m.name);
        continue;
      }

      const existingFull = existingById.get(matchedExisting.id);
      if (!existingFull) {
        skippedNames.push(m.name);
        continue;
      }

      const updatedName = pickUpdatedValue(existingFull.name, m.name, options.overrideFields.name) ?? existingFull.name;
      const updatedPronouns = pickUpdatedValue(existingFull.pronouns, m.pronouns, options.overrideFields.pronouns);
      const updatedAvatarUrl = pickUpdatedValue(existingFull.avatarUrl, m.avatarUrl, options.overrideFields.avatarUrl);
      const updatedDescription = pickUpdatedValue(existingFull.description, m.description, options.overrideFields.description);
      const updatedColor = pickUpdatedValue(existingFull.color, m.color, options.overrideFields.color);
      const updatedRole = pickUpdatedValue(existingFull.role, m.role, options.overrideFields.role);
      const updatedTags = pickUpdatedTags(existingFull.tags, m.tags, options.overrideFields.tags);
      const updatedNotes = pickUpdatedValue(existingFull.notes, m.notes, options.overrideFields.notes);

      await db
        .update(members)
        .set({
          name: updatedName,
          pronouns: updatedPronouns,
          avatarUrl: updatedAvatarUrl,
          description: updatedDescription,
          color: updatedColor,
          role: updatedRole,
          tags: updatedTags,
          notes: updatedNotes,
          updatedAt: now,
        })
        .where(eq(members.id, matchedExisting.id));

      updatedNames.push(m.name);
      existingById.set(matchedExisting.id, {
        ...existingFull,
        name: updatedName,
        pronouns: updatedPronouns,
        avatarUrl: updatedAvatarUrl,
        description: updatedDescription,
        color: updatedColor,
        role: updatedRole,
        tags: updatedTags,
        notes: updatedNotes,
      });

      const dedupeIndex = existingForDedupe.findIndex((item) => item.id === matchedExisting.id);
      if (dedupeIndex >= 0) {
        existingForDedupe[dedupeIndex] = {
          id: matchedExisting.id,
          name: updatedName,
          pronouns: updatedPronouns,
          role: updatedRole,
          tags: updatedTags,
        };
      }

      continue;
    }

    if (!options.importNewMembers) {
      skippedNames.push(m.name);
      continue;
    }

    const coercedInsertTags = coerceImportedTags(m.tags);

    await db.insert(members).values({
      id:          createId(),
      systemId:    auth.systemId,
      name:        m.name,
      pronouns:    m.pronouns ?? null,
      avatarUrl:   m.avatarUrl ?? null,
      description: m.description ?? null,
      color:       m.color ?? null,
      role:        m.role ?? null,
      tags:        coercedInsertTags ? JSON.stringify(coercedInsertTags) : null,
      notes:       m.notes ?? null,
      isArchived:  0,
      createdAt:   now,
      updatedAt:   now,
    });

    importedNames.push(m.name);

    const insertedDedupeProjection: ExistingMemberForDedupe = {
      id: 'new:' + createId(),
      name: m.name,
      pronouns: m.pronouns ?? null,
      role: m.role ?? null,
      tags: coercedInsertTags ? JSON.stringify(coercedInsertTags) : null,
    };
    existingForDedupe.push(insertedDedupeProjection);
  }

  return ok({
    imported: importedNames.length,
    updated: updatedNames.length,
    skipped: skippedNames.length,
    duplicatesDetected: duplicateNames.length,

    // Backward-compatible alias for old clients that only consumed inserted names.
    names: shortList(importedNames),

    // New compact diagnostics arrays.
    importedNames: shortList(uniqueNames(importedNames)),
    updatedNames: shortList(uniqueNames(updatedNames)),
    skippedNames: shortList(uniqueNames(skippedNames)),
    duplicateNames: shortList(uniqueNames(duplicateNames)),
  });
}
