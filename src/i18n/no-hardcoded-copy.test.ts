import { describe, expect, it } from "vitest";

// Every screen must get its words from the dictionaries (t("key")). This scan catches English left in JSX:
// multi-word text nodes and the common string props. Brand names are allowed.
const sources = {
  ...import.meta.glob("../pages/**/*.tsx", { query: "?raw", import: "default", eager: true }),
  ...import.meta.glob("../components/**/*.tsx", { query: "?raw", import: "default", eager: true }),
} as Record<string, string>;

const TEXT_NODE = />\s*[A-Z][a-z]+(?: [a-z]+)+\s*</g;
const STRING_PROP = /\b(?:title|label|placeholder|hint|subtitle)="[A-Z][a-z]/g;
const BRANDS = /ServaLink|WhatsApp|FCFA/;

export function findHardcodedCopy(source: string): { line: number; text: string }[] {
  const found: { line: number; text: string }[] = [];
  for (const pattern of [TEXT_NODE, STRING_PROP]) {
    for (const match of source.matchAll(pattern)) {
      if (BRANDS.test(match[0])) continue;
      found.push({ line: source.slice(0, match.index).split("\n").length, text: match[0].replace(/\s+/g, " ") });
    }
  }
  return found;
}

describe("no hard-coded English copy in pages and components", () => {
  it("scans real files", () => expect(Object.keys(sources).length).toBeGreaterThan(30));

  it("flags text nodes and string props", () => {
    expect(findHardcodedCopy("<p>Something went wrong</p>")).toHaveLength(1);
    expect(findHardcodedCopy('<Field label="Full name" />')).toHaveLength(1);
    expect(findHardcodedCopy("<p>{t('a.b')}</p><p>ServaLink does it</p>")).toHaveLength(0);
  });

  it("finds none", () => {
    const problems = Object.entries(sources).flatMap(([file, source]) =>
      findHardcodedCopy(source).map(({ line, text }) => `${file.replace("../", "src/")}:${line} ${text}`));
    expect(problems).toEqual([]);
  });
});
