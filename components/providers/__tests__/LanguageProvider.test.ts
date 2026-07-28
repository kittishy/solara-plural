import { describe, expect, it } from "vitest";
import { resolveInitialLanguage } from "@/lib/i18n";

describe("resolveInitialLanguage", () => {
  it("keeps the server-provided language when the path has no locale", () => {
    expect(resolveInitialLanguage("pt-BR", "/members")).toBe("pt-BR");
  });

  it("uses the visible path locale when it is newer than the server cookie", () => {
    expect(resolveInitialLanguage("en", "/es/front")).toBe("es");
  });
});
