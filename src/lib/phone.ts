/** Same rules as the backend: optional +237 / 00237 / 237 prefix, then 9 digits starting with 6 or 2. */
export function normalizeCmPhone(raw: string): string | null {
  let digits = raw.replace(/[\s.\-()]/g, "");
  if (!/^[62][0-9]{8}$/.test(digits)) { // already national: "237123456" is not a prefixed number
    const prefix = ["+237", "00237", "237"].find((p) => digits.startsWith(p));
    if (prefix) digits = digits.slice(prefix.length);
  }
  return /^[62][0-9]{8}$/.test(digits) ? `+237${digits}` : null;
}

export const whatsappUrl = (e164: string, text?: string) =>
  `https://wa.me/${e164.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const telUrl = (e164: string) => `tel:${e164}`;

/** +237677123456 -> "+237 6 77 12 34 56" */
export const formatCmPhone = (e164: string) => e164.replace(/^\+237(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, "+237 $1 $2 $3 $4 $5");
