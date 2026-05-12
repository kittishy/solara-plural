export function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function readTags(value: unknown): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;

  const tags: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') return null;
    const tag = item.trim();
    if (tag) tags.push(tag);
  }
  return tags;
}

export function parseStoredTags(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}
