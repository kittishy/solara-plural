const PLURALKIT_RATE_LIMITS = Object.freeze({
  GENERIC_GET_PER_SECOND: 10,
  GENERIC_UPDATE_PER_SECOND: 3,
});

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value.data)) return value.data;
  if (isRecord(value) && Array.isArray(value.results)) return value.results;
  return [];
}

function readRetryAfter(value) {
  if (!isRecord(value)) return null;
  const retry = value.retry_after;
  if (typeof retry !== 'number' || !Number.isFinite(retry)) return null;
  if (retry >= 1000) return `${Math.ceil(retry / 1000)} seconds`;
  return `${retry} ms`;
}

function readRemoteMessage(value) {
  if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 240);
  if (!isRecord(value)) return null;

  const message = value.message ?? value.error ?? value.msg;
  return typeof message === 'string' && message.trim() ? message.trim().slice(0, 240) : null;
}

function readPluralKitTimestamp(value) {
  if (!isRecord(value)) return null;
  const timestamp = cleanString(value.timestamp);
  if (!timestamp) return null;

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

function readPluralKitMemberExternalId(raw) {
  if (!isRecord(raw)) return null;
  return cleanString(raw.uuid) ?? cleanString(raw.id);
}

function parsePluralKitFronters(rawFront) {
  if (!rawFront) {
    return {
      memberRecords: [],
      externalIds: [],
      startedAt: null,
    };
  }

  const memberRecords = isRecord(rawFront) && Array.isArray(rawFront.members)
    ? rawFront.members
    : asArray(rawFront);
  const seen = new Set();
  const externalIds = [];

  for (const raw of memberRecords) {
    const id = readPluralKitMemberExternalId(raw);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    externalIds.push(id);
  }

  return {
    memberRecords,
    externalIds,
    startedAt: readPluralKitTimestamp(rawFront),
  };
}

module.exports = {
  PLURALKIT_RATE_LIMITS,
  asArray,
  parsePluralKitFronters,
  readRemoteMessage,
  readRetryAfter,
};
