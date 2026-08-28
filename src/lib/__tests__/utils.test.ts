import { describe, it, expect } from "vitest";
import { escapeHtml } from "@/lib/utils";

describe("escapeHtml", () => {
  it("échappe les 5 caractères HTML spéciaux", () => {
    expect(escapeHtml("&")).toBe("&amp;");
    expect(escapeHtml("<")).toBe("&lt;");
    expect(escapeHtml(">")).toBe("&gt;");
    expect(escapeHtml('"')).toBe("&quot;");
    expect(escapeHtml("'")).toBe("&#39;");
  });

  it("échappe une chaîne complexe", () => {
    expect(escapeHtml('O\'Brien & <Co> "test"')).toBe(
      "O&#39;Brien &amp; &lt;Co&gt; &quot;test&quot;",
    );
  });

  it("gère le vide et null/undefined", () => {
    expect(escapeHtml("")).toBe("");
    expect(escapeHtml(null as unknown as string)).toBe("");
    expect(escapeHtml(undefined as unknown as string)).toBe("");
  });

  it("ne modifie pas une chaîne sans caractères spéciaux", () => {
    expect(escapeHtml("Hotavis — 379€")).toBe("Hotavis — 379€");
  });
});
