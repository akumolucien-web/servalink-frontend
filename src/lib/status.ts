import { getLang, translate, type Key, type Lang } from "../i18n/core";
import type { BookingStatus, ProviderStatus, Rating, ReportStatus, CategoryRequestStatus } from "../api/types";

export type Tone = "amber" | "teal" | "blue" | "purple" | "green" | "red" | "slate";

export const BOOKING_STATUS: Record<BookingStatus, { label: Key; tone: Tone }> = {
  PENDING: { label: "status.booking.PENDING", tone: "amber" },
  ACCEPTED: { label: "status.booking.ACCEPTED", tone: "teal" },
  IN_PROGRESS: { label: "status.booking.IN_PROGRESS", tone: "blue" },
  AWAITING_CONFIRMATION: { label: "status.booking.AWAITING_CONFIRMATION", tone: "purple" },
  COMPLETED: { label: "status.booking.COMPLETED", tone: "green" },
  REJECTED: { label: "status.booking.REJECTED", tone: "red" },
  CANCELLED: { label: "status.booking.CANCELLED", tone: "slate" },
};

export const PROVIDER_STATUS: Record<ProviderStatus, { label: Key; tone: Tone }> = {
  PENDING: { label: "status.provider.PENDING", tone: "amber" },
  APPROVED: { label: "status.provider.APPROVED", tone: "green" },
  REJECTED: { label: "status.provider.REJECTED", tone: "red" },
  SUSPENDED: { label: "status.provider.SUSPENDED", tone: "red" },
  BANNED: { label: "status.provider.BANNED", tone: "slate" },
};

export const REPORT_STATUS: Record<ReportStatus, { label: Key; tone: Tone }> = {
  OPEN: { label: "status.report.OPEN", tone: "amber" },
  UNDER_REVIEW: { label: "status.report.UNDER_REVIEW", tone: "blue" },
  RESOLVED: { label: "status.report.RESOLVED", tone: "green" },
  DISMISSED: { label: "status.report.DISMISSED", tone: "slate" },
};

export const REQUEST_STATUS: Record<CategoryRequestStatus, { label: Key; tone: Tone }> = {
  PENDING: { label: "status.request.PENDING", tone: "amber" },
  APPROVED: { label: "status.request.APPROVED", tone: "green" },
  REJECTED: { label: "status.request.REJECTED", tone: "red" },
};

const UNKNOWN_STATUS: { label: Key; tone: Tone } = { label: "common.unknown", tone: "slate" };
/** Looks a status up in one of the maps above; a value the frontend does not know yet shows as "Unknown" instead of crashing. */
export function statusOf<S extends string>(map: Record<S, { label: Key; tone: Tone }>, status: S | string | null | undefined): { label: Key; tone: Tone } {
  return status && Object.prototype.hasOwnProperty.call(map, status) ? map[status as S] : UNKNOWN_STATUS;
}

/** Backend value -> UI label (BAD/GOOD/VERY_GOOD/EXCELLENT; never stars or numbers). */
export const RATING_LABEL: Record<Rating, string> = {
  BAD: "Bad", GOOD: "Good", VERY_GOOD: "V.Good", EXCELLENT: "Excellent",
};
const RATING_LABEL_FR: Record<Rating, string> = { BAD: "Mauvais", GOOD: "Bien", VERY_GOOD: "Très bien", EXCELLENT: "Excellent" };
/** Rating word in the given language (default: the active one). */
export const ratingLabel = (rating: Rating, lang: Lang = getLang()) => (lang === "fr" ? RATING_LABEL_FR : RATING_LABEL)[rating];
/** Report reasons are sent to the backend in English (the stored value); screens show them in the active language. */
export const REPORT_REASONS: { value: string; label: Key }[] = [
  { value: "The work wasn't completed", label: "rp.reason.incomplete" },
  { value: "Poor quality of work", label: "rp.reason.poor" },
  { value: "Unprofessional behavior", label: "rp.reason.behavior" },
  { value: "Safety concern", label: "rp.reason.safety" },
  { value: "The provider didn't show up", label: "rp.reason.noShow" },
  { value: "Something else", label: "rp.reason.other" },
];
export const reportReasonLabel = (reason: string, lang: Lang = getLang()) => {
  const known = REPORT_REASONS.find((r) => r.value === reason);
  return known ? translate(lang, known.label) : reason;
};
export const RATING_ORDER: Rating[] = ["BAD", "GOOD", "VERY_GOOD", "EXCELLENT"];
export const ratingRank = (rating: Rating | null | undefined) => (rating ? RATING_ORDER.indexOf(rating) + 1 : 0);

export const ACTIVE_BOOKING: BookingStatus[] = ["PENDING", "ACCEPTED", "IN_PROGRESS", "AWAITING_CONFIRMATION"];
export const CLOSED_BOOKING: BookingStatus[] = ["REJECTED", "CANCELLED"];
