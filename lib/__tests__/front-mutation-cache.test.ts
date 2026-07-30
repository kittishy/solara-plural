import { describe, expect, it, vi } from "vitest";
import { commitFrontMutationToCache } from "../front-mutation-cache";

type Snapshot = {
  id: string;
  memberIds: string[];
};

describe("commitFrontMutationToCache", () => {
  it("publishes server truth before allowing the next front action", async () => {
    const serverTruth: Snapshot = {
      id: "front-b",
      memberIds: ["member-a", "member-b"],
    };
    const publish = vi.fn(async (_snapshot: Snapshot) => undefined);
    const response = new Response(
      JSON.stringify({ success: true, data: serverTruth }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );

    const committed = await commitFrontMutationToCache(response, publish);

    expect(publish).toHaveBeenCalledOnce();
    expect(publish).toHaveBeenCalledWith(serverTruth);
    expect(committed).toEqual(serverTruth);

    const nextMemberIds = [...committed.memberIds, "member-c"];
    expect(nextMemberIds).toEqual(["member-a", "member-b", "member-c"]);
  });

  it("does not publish an invalid mutation response", async () => {
    const publish = vi.fn(async (_snapshot: Snapshot) => undefined);
    const response = new Response(
      JSON.stringify({ success: false, error: "save failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );

    await expect(
      commitFrontMutationToCache(response, publish)
    ).rejects.toThrow("save failed");
    expect(publish).not.toHaveBeenCalled();
  });
});
