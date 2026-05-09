const DEFAULT_BASE_URL = 'https://api.pluralkit.me/v2';
const DEFAULT_USER_AGENT = 'SolaraPlural/0.1 (https://solara-plural.vercel.app; front-sync)';
const DEFAULT_REQUEST_TIMEOUT_MS = 5000;

const {
  readRemoteMessage,
  readRetryAfter,
} = require('./pluralkit-api.js');

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

function normalizeMemberIds(memberIds) {
  if (!Array.isArray(memberIds)) return [];
  return Array.from(new Set(memberIds
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)));
}

function normalizeUnmappedIds(candidateIds, mappedIds) {
  const mapped = new Set(normalizeMemberIds(mappedIds));
  return normalizeMemberIds(candidateIds).filter((id) => !mapped.has(id));
}

function normalizeResolverPayload(payload, localMemberIds) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const externalMemberIds = normalizeMemberIds(payload.externalMemberIds);
  const hasExplicitResolved = Array.isArray(payload.resolvedLocalMemberIds);
  const hasExplicitUnresolved = Array.isArray(payload.unresolvedLocalMemberIds);
  const fallbackResolvedIds = hasExplicitResolved
    ? payload.resolvedLocalMemberIds
    : (externalMemberIds.length === localMemberIds.length ? localMemberIds : []);
  const unresolvedLocalMemberIds = hasExplicitUnresolved
    ? normalizeMemberIds(payload.unresolvedLocalMemberIds)
    : normalizeUnmappedIds(localMemberIds, fallbackResolvedIds);

  return {
    externalMemberIds,
    unresolvedLocalMemberIds,
  };
}

function isAbortError(error) {
  return error instanceof Error && error.name === 'AbortError';
}

function createPluralKitFrontSync(deps) {
  const {
    readPersistedToken,
    resolveExternalIds,
    fetchImpl = fetch,
    baseUrl = DEFAULT_BASE_URL,
    userAgent = DEFAULT_USER_AGENT,
    logger = console,
    requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  } = deps;

  return async function syncFrontToPluralKit(systemId, memberIds, context = {}) {
    const requestId = typeof context.requestId === 'string' && context.requestId.trim()
      ? context.requestId.trim()
      : null;
    const localMemberIds = normalizeMemberIds(memberIds);
    const token = await readPersistedToken(systemId);

    if (!token) {
      logger.info('[front-sync] pluralKit sync skipped: missing token', {
        event: 'pluralkit_front_sync_skipped',
        reasonCode: 'missing_saved_token',
        requestId,
        systemId,
      });
      return {
        status: 'skipped',
        reasonCode: 'missing_saved_token',
        providerStatus: 'skipped',
        httpStatus: null,
        mappedCount: 0,
        unmappedIds: localMemberIds,
        details: null,
      };
    }

    const resolvedPayload = await resolveExternalIds(systemId, localMemberIds);
    const resolved = normalizeResolverPayload(resolvedPayload, localMemberIds);

    if (!resolved) {
      logger.error('[front-sync] pluralKit sync failed: invalid resolver payload', {
        event: 'pluralkit_front_sync_failed',
        reasonCode: 'internal_mapping_error',
        requestId,
        systemId,
      });
      return {
        status: 'failed',
        reasonCode: 'internal_mapping_error',
        providerStatus: 'error',
        httpStatus: null,
        mappedCount: 0,
        unmappedIds: localMemberIds,
        details: null,
      };
    }

    if (resolved.externalMemberIds.length === 0 && localMemberIds.length > 0) {
      logger.warn('[front-sync] pluralKit sync skipped: no mapped external members', {
        event: 'pluralkit_front_sync_skipped',
        reasonCode: 'no_mapped_members',
        requestId,
        systemId,
        localMemberCount: localMemberIds.length,
      });
      return {
        status: 'skipped',
        reasonCode: 'no_mapped_members',
        providerStatus: 'skipped',
        httpStatus: null,
        mappedCount: 0,
        unmappedIds: resolved.unresolvedLocalMemberIds,
        details: {
          localMemberCount: localMemberIds.length,
        },
      };
    }

    if (resolved.unresolvedLocalMemberIds.length > 0) {
      logger.warn('[front-sync] pluralKit sync proceeding with partial member mapping', {
        event: 'pluralkit_front_sync_partial_mapping',
        reasonCode: 'partial_member_links',
        requestId,
        systemId,
        mappedCount: resolved.externalMemberIds.length,
        unmappedCount: resolved.unresolvedLocalMemberIds.length,
      });
    }

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeout = controller && Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0
      ? setTimeout(() => controller.abort(), requestTimeoutMs)
      : null;

    let response;
    try {
      response = await fetchImpl(`${baseUrl}/systems/@me/switches`, {
        method: 'POST',
        headers: {
          Authorization: token,
          'User-Agent': userAgent,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({ members: resolved.externalMemberIds }),
        ...(controller ? { signal: controller.signal } : {}),
      });
    } catch (error) {
      if (isAbortError(error)) {
        logger.error('[front-sync] pluralKit sync timed out', {
          event: 'pluralkit_front_sync_failed',
          reasonCode: 'provider_timeout',
          requestId,
          systemId,
          timeoutMs: requestTimeoutMs,
        });

        return {
          status: 'failed',
          reasonCode: 'provider_timeout',
          providerStatus: 'error',
          httpStatus: null,
          mappedCount: resolved.externalMemberIds.length,
          unmappedIds: resolved.unresolvedLocalMemberIds,
          details: {
            timeoutMs: requestTimeoutMs,
          },
        };
      }

      throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    const bodyText = await response.text();
    const body = parseRemoteBody(bodyText);

    if (!response.ok) {
      const message = readRemoteMessage(body) ?? `Provider request failed with HTTP ${response.status}.`;
      const retryAfter = response.status === 429 ? readRetryAfter(body) : null;
      logger.error('[front-sync] pluralKit sync failed', {
        event: 'pluralkit_front_sync_failed',
        reasonCode: response.status === 429 ? 'rate_limited' : 'provider_rejected_switch',
        requestId,
        systemId,
        statusCode: response.status,
        message,
        retryAfter,
      });

      return {
        status: 'failed',
        reasonCode: response.status === 429 ? 'rate_limited' : 'provider_rejected_switch',
        providerStatus: 'error',
        httpStatus: response.status,
        mappedCount: resolved.externalMemberIds.length,
        unmappedIds: resolved.unresolvedLocalMemberIds,
        details: {
          statusCode: response.status,
          message,
          retryAfter,
        },
      };
    }

    logger.info('[front-sync] pluralKit sync completed', {
      event: 'pluralkit_front_sync_synced',
      reasonCode: resolved.unresolvedLocalMemberIds.length > 0 ? 'partial_member_links' : 'switch_created',
      requestId,
      systemId,
      mappedCount: resolved.externalMemberIds.length,
      unmappedCount: resolved.unresolvedLocalMemberIds.length,
      switchOut: localMemberIds.length === 0,
    });

    return {
      status: 'synced',
      reasonCode: localMemberIds.length === 0
        ? 'switch_out_created'
        : (resolved.unresolvedLocalMemberIds.length > 0 ? 'partial_member_links' : 'switch_created'),
      providerStatus: 'ok',
      httpStatus: response.status,
      mappedCount: resolved.externalMemberIds.length,
      unmappedIds: resolved.unresolvedLocalMemberIds,
      details: {
        membersPushed: resolved.externalMemberIds.length,
      },
    };
  };
}

module.exports = {
  createPluralKitFrontSync,
  normalizeMemberIds,
  normalizeResolverPayload,
};
