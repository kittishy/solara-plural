import { getSolaraApiBaseUrl } from '@src/services/config';
import { requestJson } from '@src/services/http';
import type { SolaraFrontEntry, SolaraMember, SolaraNote, SolaraSnapshot, SolaraSystem } from '@src/types/solara';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readDate(value: unknown): string {
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'string') return new Date(value).toISOString();
  return new Date().toISOString();
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeSystem(value: unknown): SolaraSystem {
  const record = isRecord(value) ? value : {};
  const accountType = record.accountType === 'singlet' ? 'singlet' : 'system';

  return {
    id: readString(record.id, 'remote-system'),
    name: readString(record.name, 'Solara Plural'),
    description: readNullableString(record.description),
    accountType,
  };
}

function normalizeMember(value: unknown, index: number): SolaraMember | null {
  if (!isRecord(value)) return null;
  const name = readString(value.name);
  if (!name) return null;

  return {
    id: readString(value.id, `remote-member-${index}`),
    name,
    pronouns: readNullableString(value.pronouns),
    avatarUrl: readNullableString(value.avatarUrl),
    description: readNullableString(value.description),
    color: readNullableString(value.color),
    role: readNullableString(value.role),
    tags: readStringArray(value.tags),
    notes: readNullableString(value.notes),
    isArchived: value.isArchived === 1 || value.isArchived === true,
  };
}

function normalizeFrontEntry(value: unknown, index: number): SolaraFrontEntry | null {
  if (!isRecord(value)) return null;
  const memberIds = readStringArray(value.memberIds);
  if (memberIds.length === 0) return null;

  return {
    id: readString(value.id, `remote-front-${index}`),
    memberIds,
    startedAt: readDate(value.startedAt),
    endedAt: value.endedAt === null || value.endedAt === undefined ? null : readDate(value.endedAt),
    note: readNullableString(value.note),
  };
}

function normalizeNote(value: unknown, index: number): SolaraNote | null {
  if (!isRecord(value)) return null;
  const content = readString(value.content);
  if (!content) return null;

  return {
    id: readString(value.id, `remote-note-${index}`),
    memberId: readNullableString(value.memberId),
    title: readNullableString(value.title),
    content,
    updatedAt: readDate(value.updatedAt ?? value.createdAt),
  };
}

function normalizeExport(payload: unknown): SolaraSnapshot | null {
  if (!isRecord(payload)) return null;

  const members = Array.isArray(payload.members)
    ? payload.members.map(normalizeMember).filter((member): member is SolaraMember => member !== null)
    : [];
  const frontHistory = Array.isArray(payload.frontHistory)
    ? payload.frontHistory.map(normalizeFrontEntry).filter((entry): entry is SolaraFrontEntry => entry !== null)
    : [];
  const notes = Array.isArray(payload.notes)
    ? payload.notes.map(normalizeNote).filter((note): note is SolaraNote => note !== null)
    : [];
  const currentFront = frontHistory.find((entry) => !entry.endedAt) ?? null;

  return {
    system: normalizeSystem(payload.system),
    members,
    currentFront,
    frontHistory,
    notes,
  };
}

export async function fetchRemoteSolaraSnapshot(): Promise<SolaraSnapshot | null> {
  const baseUrl = getSolaraApiBaseUrl();
  if (!baseUrl) return null;

  const payload = await requestJson<unknown>(`${baseUrl}/api/export`);
  return normalizeExport(payload);
}
