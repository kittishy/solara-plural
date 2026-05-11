export const customFieldTypes = ['text', 'long_text', 'number', 'date', 'checkbox', 'select'] as const;

export type CustomFieldType = (typeof customFieldTypes)[number];

export type CustomFieldOption = {
  label: string;
  value: string;
};

export function parseCustomFieldType(value: unknown): CustomFieldType | null {
  return typeof value === 'string' && (customFieldTypes as readonly string[]).includes(value)
    ? (value as CustomFieldType)
    : null;
}

export function normalizeCustomFieldName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length > 0 && name.length <= 80 ? name : null;
}

export function normalizeCustomFieldDescription(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const description = value.trim();
  return description.length > 0 ? description.slice(0, 180) : null;
}

export function parseCustomFieldOptions(value: unknown): CustomFieldOption[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split('\n')
      : [];

  const seen = new Set<string>();
  const options: CustomFieldOption[] = [];

  for (const entry of source) {
    const label = typeof entry === 'string'
      ? entry.trim()
      : typeof entry?.label === 'string'
        ? entry.label.trim()
        : '';

    if (!label) continue;

    const valueSlug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || label;
    if (seen.has(valueSlug)) continue;
    seen.add(valueSlug);
    options.push({ label: label.slice(0, 60), value: valueSlug.slice(0, 80) });
    if (options.length >= 20) break;
  }

  return options;
}

export function serializeCustomFieldOptions(options: CustomFieldOption[]): string | null {
  return options.length > 0 ? JSON.stringify(options) : null;
}

export function parseStoredCustomFieldOptions(value: string | null): CustomFieldOption[] {
  if (!value) return [];
  try {
    return parseCustomFieldOptions(JSON.parse(value));
  } catch {
    return [];
  }
}

export function normalizeCustomFieldValue(type: CustomFieldType, value: unknown): string | null {
  if (type === 'checkbox') {
    return value === true || value === 'true' ? 'true' : 'false';
  }

  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (type === 'number') {
    const parsed = Number(trimmed.replace(',', '.'));
    return Number.isFinite(parsed) ? String(parsed) : null;
  }

  if (type === 'date') {
    return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
  }

  return trimmed.slice(0, type === 'long_text' ? 4000 : 500);
}
