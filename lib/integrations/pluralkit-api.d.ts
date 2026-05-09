export const PLURALKIT_RATE_LIMITS: {
  readonly GENERIC_GET_PER_SECOND: 10;
  readonly GENERIC_UPDATE_PER_SECOND: 3;
};

export function asArray(value: unknown): unknown[];
export function readRemoteMessage(value: unknown): string | null;
export function readRetryAfter(value: unknown): string | null;
export function parsePluralKitFronters(value: unknown): {
  memberRecords: unknown[];
  externalIds: string[];
  startedAt: Date | null;
};
