type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  error?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Reads a successful Front mutation and publishes the returned server snapshot
 * before the caller enables the next interaction.
 *
 * This ordering is load-bearing: a second quick member action must build on
 * the first response, not on the stale list that existed before the request.
 */
export async function commitFrontMutationToCache<T>(
  response: Response,
  publish: (snapshot: T) => void | Promise<unknown>
): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiFailure
    | null;

  if (
    !response.ok ||
    !payload ||
    payload.success !== true ||
    !("data" in payload)
  ) {
    const message =
      isRecord(payload) &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Front mutation failed";
    throw new Error(message);
  }

  await publish(payload.data);
  return payload.data;
}
