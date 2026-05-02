const DEFAULT_BASE_URL = 'https://api.pluralkit.me/v2';
const DEFAULT_USER_AGENT = 'SolaraPlural/0.1 (https://solara-plural.vercel.app; front-sync)';

function parseRemoteBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRemoteMessage(value) {
  if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 240);
  if (!isRecord(value)) return null;
  const message = value.message ?? value.error ?? value.msg;
  return typeof message === 'string' && message.trim() ? message.trim().slice(0, 240) : null;
}

function normalizeMemberIds(memberIds) {
  if (!Array.isArray(memberIds)) return [];
  return Array.from(new Set(memberIds
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)));
}

function createPluralKitFrontSync(deps) {
  const {
    readPersistedToken,
    resolveExternalIds,
    fetchImpl = fetch,
    baseUrl = DEFAULT_BASE_URL,
    userAgent = DEFAULT_USER_AGENT,
    logger = console,
  } = deps;

  return async function syncFrontToPluralKit(systemId, memberIds) {
    const localMemberIds = normalizeMemberIds(memberIds);
    const token = await readPersistedToken(systemId);

    if (!token) {
      logger.info('[front-sync] pluralKit sync skipped: missing token', { systemId });
      return { status: 'skipped', reason: 'missing_saved_token', details: null };
    }

    const resolved = await resolveExternalIds(systemId, localMemberIds);
    if (!resolved || !Array.isArray(resolved.externalMemberIds)) {
      logger.error('[front-sync] pluralKit sync failed: invalid resolver payload', { systemId });
      return { status: 'failed', reason: 'internal_mapping_error', details: null };
    }

    if (resolved.missingCount > 0) {
      logger.warn('[front-sync] pluralKit sync skipped: missing member links', {
        systemId,
        missingCount: resolved.missingCount,
      });
      return {
        status: 'skipped',
        reason: 'missing_member_links',
        details: { missingCount: resolved.missingCount },
      };
    }

    const response = await fetchImpl(`${baseUrl}/systems/@me/switches`, {
      method: 'POST',
      headers: {
        Authorization: token,
        'User-Agent': userAgent,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({ members: resolved.externalMemberIds }),
    });

    const bodyText = await response.text();
    const body = parseRemoteBody(bodyText);

    if (!response.ok) {
      const message = readRemoteMessage(body) ?? `Provider request failed with HTTP ${response.status}.`;
      logger.error('[front-sync] pluralKit sync failed', {
        systemId,
        statusCode: response.status,
        message,
      });

      return {
        status: 'failed',
        reason: 'provider_rejected_switch',
        details: {
          statusCode: response.status,
          message,
        },
      };
    }

    return {
      status: 'synced',
      reason: localMemberIds.length > 0 ? 'switch_created' : 'switch_out_created',
      details: {
        membersPushed: resolved.externalMemberIds.length,
      },
    };
  };
}

module.exports = {
  createPluralKitFrontSync,
  normalizeMemberIds,
};
