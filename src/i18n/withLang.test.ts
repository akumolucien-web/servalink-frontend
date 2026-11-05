import { afterEach, describe, expect, it } from "vitest";
import { applyLang, withLang } from "./core";

afterEach(() => applyLang("en"));

describe("withLang (profile creation body)", () => {
  it("adds the language the user is browsing in, so the backend does not default to French", () => {
    applyLang("en");
    expect(withLang({ full_name: "Awa", accept_terms: true })).toEqual({ full_name: "Awa", accept_terms: true, language: "en" });
    applyLang("fr");
    expect(withLang({ full_name: "Awa" }).language).toBe("fr");
  });
});
