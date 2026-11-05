import { describe, expect, it } from "vitest";

// Every screen must get its words from the dictionaries (t("key")). This scan catches English left in JSX
// (text nodes of one or more words, common string props) and in code literals (toast calls, title/message/... fields).
// Brand names are allowed.
const sources = {
  ...import.meta.glob("../pages/**/*.tsx", { query: "?raw", import: "default", eager: true }),
  ...import.meta.glob("../components/**/*.tsx", { query: "?raw", import: "default", eager: true }),
  ...import.meta.glob("../auth/**/*.tsx", { query: "?raw", import: "default", eager: true }),
  ...import.meta.glob("../layouts/**/*.tsx", { query: "?raw", import: "default", eager: true }),
} as Record<string, string>;

// ">Word<", ">Two words<", ">You're done<": starts right after a tag and ends at the next tag. {expressions} never match.
// (?<!=) skips arrow functions: `=> Promise<void>`.
const TEXT_NODE = /(?<!=)>\s*[A-Z][a-z']+(?: [A-Za-z']+)*[.!?:]?\s*</g;
const STRING_PROP = /\b(?:title|label|placeholder|hint|subtitle)="[A-Z][a-z]/g;
const TOAST_LITERAL = /\btoast\.(?:success|error)\(\s*"[A-Z]/g;
const FIELD_LITERAL = /\b(?:title|message|confirmLabel|label|placeholder|hint)\s*:\s*"[A-Z][a-z]/g;
const BRANDS = /ServaLink|WhatsApp|FCFA/;
const WORDMARK_PARTS = new Set(["Serva", "Link"]); // the logo is split over two spans

export function findHardcodedCopy(source: string): { line: number; text: string }[] {
  const found: { line: number; text: string }[] = [];
  for (const pattern of [TEXT_NODE, STRING_PROP, TOAST_LITERAL, FIELD_LITERAL]) {
    for (const match of source.matchAll(pattern)) {
      if (BRANDS.test(match[0]) || WORDMARK_PARTS.has(match[0].replace(/^>\s*|\s*<$/g, ""))) continue;
      found.push({ line: source.slice(0, match.index).split("\n").length, text: match[0].replace(/\s+/g, " ") });
    }
  }
  return found;
}

describe("no hard-coded English copy in pages, components, auth and layouts", () => {
  it("scans real files", () => expect(Object.keys(sources).length).toBeGreaterThan(40));

  it("flags text nodes (one or more words, apostrophes) and string props", () => {
    expect(findHardcodedCopy("<p>Something went wrong</p>")).toHaveLength(1);
    expect(findHardcodedCopy("<Button>Cancel</Button>")).toHaveLength(1);
    expect(findHardcodedCopy("<p>You're approved</p>")).toHaveLength(1);
    expect(findHardcodedCopy("<p>Pay in FCFA now</p><p>Log in</p>")).toHaveLength(1); // the brand line is allowed
    expect(findHardcodedCopy('<Field label="Full name" />')).toHaveLength(1);
  });

  it("flags toast literals and title/message/label fields in code", () => {
    expect(findHardcodedCopy('toast.error("Your access has not updated")')).toHaveLength(1);
    expect(findHardcodedCopy('toast.success(\n  "Saved")')).toHaveLength(1);
    expect(findHardcodedCopy('confirm({ title: "Delete this?", message: "Gone for good." })')).toHaveLength(2);
    expect(findHardcodedCopy('const x = { placeholder: "Type here" }')).toHaveLength(1);
  });

  it("ignores translated text, expressions and brand names", () => {
    expect(findHardcodedCopy('<p>{t("a.b")}</p><span>{name}</span><a>ServaLink</a><b>WhatsApp</b>')).toHaveLength(0);
    expect(findHardcodedCopy('toast.error(t("x")); confirm({ title: t("y"), message: "" })')).toHaveLength(0);
    expect(findHardcodedCopy("const f = (a: number) => a > 1 && b < 2;")).toHaveLength(0);
    expect(findHardcodedCopy("type Fn = () => Promise<void>; <span>Serva</span><span>Link</span>")).toHaveLength(0);
  });

  it("finds none", () => {
    const problems = Object.entries(sources).flatMap(([file, source]) =>
      findHardcodedCopy(source).map(({ line, text }) => `${file.replace("../", "src/")}:${line} ${text}`));
    expect(problems).toEqual([]);
  });
});
