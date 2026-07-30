import { describe, expect, it } from "vitest";
import {
  captureFrontDraftBase,
  createFrontDraftMutationPayload,
} from "../front-draft-base";

const originalFront = {
  id: "front-v1",
  memberIds: ["member-a"],
  memberTiers: { "member-a": "primary" } as const,
  note: "original",
  startedAt: "2026-07-30T12:00:00.000Z",
};

describe("front draft concurrency base", () => {
  it("keeps the signature captured when the editor opened", () => {
    const base = captureFrontDraftBase(originalFront);

    const payload = createFrontDraftMutationPayload(base, {
      memberIds: ["member-a", "member-b"],
      memberTiers: { "member-a": "primary", "member-b": "cofront" },
      note: "edited draft",
    });

    expect(payload.expectedFrontId).toBe("front-v1");
    expect(payload.expectedFrontSignature).toBe(base.expectedFrontSignature);

    const newerFront = {
      ...originalFront,
      id: "front-v2",
      memberIds: ["member-c"],
      startedAt: "2026-07-30T12:05:00.000Z",
    };
    expect(
      captureFrontDraftBase(newerFront).expectedFrontSignature
    ).not.toBe(payload.expectedFrontSignature);
  });

  it("captures an empty base when starting the first front", () => {
    expect(captureFrontDraftBase(null)).toEqual({
      expectedFrontId: null,
      expectedFrontSignature: null,
    });
  });
});
