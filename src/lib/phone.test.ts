import { describe, expect, it } from "vitest";
import { formatCmPhone, normalizeCmPhone, telUrl, whatsappUrl } from "./phone";

describe("cameroon phone", () => {
  it.each(["6 77 12 34 56", "+237677123456", "00237677123456", "237-677-123-456", "(677) 12.34.56"])("accepts %s", (raw) => {
    expect(normalizeCmPhone(raw)).toBe("+237677123456");
  });
  it("accepts landlines starting with 2", () => expect(normalizeCmPhone("222 23 45 67")).toBe("+237222234567"));
  it.each(["12345", "+33612345678", "577123456", "6771234567", ""])("rejects %j", (raw) => {
    expect(normalizeCmPhone(raw)).toBeNull();
  });
  it("builds links and display format", () => {
    expect(whatsappUrl("+237677123456", "Bonjour")).toBe("https://wa.me/237677123456?text=Bonjour");
    expect(whatsappUrl("+237677123456")).toBe("https://wa.me/237677123456");
    expect(telUrl("+237677123456")).toBe("tel:+237677123456");
    expect(formatCmPhone("+237677123456")).toBe("+237 6 77 12 34 56");
  });
});
