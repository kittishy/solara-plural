import { describe, expect, it } from "vitest";
import { localizeNavigationHref } from "@/components/navigation/localized-href";

describe("localizeNavigationHref", () => {
  it("adds the active locale to an internal navigation href", () => {
    expect(localizeNavigationHref("/members?view=front#list", "pt-BR")).toBe(
      "/pt-BR/members?view=front#list"
    );
  });

  it("replaces an existing locale instead of nesting locale prefixes", () => {
    expect(localizeNavigationHref("/en/front/history", "es")).toBe(
      "/es/front/history"
    );
  });

  it("leaves external, hash, and query-only hrefs unchanged", () => {
    expect(localizeNavigationHref("https://example.com/docs", "es")).toBe(
      "https://example.com/docs"
    );
    expect(localizeNavigationHref("#details", "es")).toBe("#details");
    expect(localizeNavigationHref("?sheet=more", "es")).toBe("?sheet=more");
  });
});
