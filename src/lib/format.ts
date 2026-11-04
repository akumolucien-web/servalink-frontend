const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** ISO timestamp from the backend (UTC) shown in the viewer's locale. */
export function formatDateTime(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * booking_date is an opaque local datetime string "YYYY-MM-DDTHH:mm" chosen by the
 * citizen. It is formatted from its parts, never through Date, so no timezone shift.
 */
export function formatBookingDate(value?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value ?? "");
  if (!match) return value ?? "";
  const [, y, m, d, hh, mm] = match;
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}, ${hh}:${mm}`;
}

/** Value for <input type="datetime-local"> min: now, in local time, rounded up to the next hour. */
export function nextHourLocal(from = new Date()): string {
  const date = new Date(from.getTime());
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

export function initials(name?: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function firstName(name?: string): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export function plural(count: number, one: string, many = one + "s"): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "5 000 FCFA"; a regular space separator (toLocaleString varies by browser). No price means "Price on request". */
export function formatFcfa(n?: number | null): string {
  if (n == null) return "Price on request";
  return `${String(Math.round(n)).replace(/\B(?=(\d{3})+$)/g, " ")} FCFA`;
}
