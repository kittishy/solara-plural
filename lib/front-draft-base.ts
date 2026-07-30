import {
  createFrontSnapshotSignature,
  type FrontTier,
} from "@/lib/front";

type FrontSnapshot = {
  id: string;
  memberIds: string[];
  memberTiers?: Record<string, FrontTier>;
  note?: string | null;
  startedAt: string | number | Date;
};

export type FrontDraftBase = {
  expectedFrontId: string | null;
  expectedFrontSignature: string | null;
};

type FrontDraftChanges = {
  memberIds: string[];
  memberTiers: Record<string, FrontTier>;
  note: string;
};

export function captureFrontDraftBase(
  snapshot: FrontSnapshot | null
): FrontDraftBase {
  return snapshot
    ? {
        expectedFrontId: snapshot.id,
        expectedFrontSignature: createFrontSnapshotSignature(snapshot),
      }
    : {
        expectedFrontId: null,
        expectedFrontSignature: null,
      };
}

export function createFrontDraftMutationPayload(
  base: FrontDraftBase,
  changes: FrontDraftChanges
) {
  return {
    ...changes,
    expectedFrontId: base.expectedFrontId,
    expectedFrontSignature: base.expectedFrontSignature,
  };
}
