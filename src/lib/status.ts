import { getLang, type Lang } from "../i18n/core";
import type { BookingStatus, ProviderStatus, Rating, ReportStatus, CategoryRequestStatus } from "../api/types";

export type Tone = "amber" | "teal" | "blue" | "purple" | "green" | "red" | "slate";

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending", tone: "amber" },
  ACCEPTED: { label: "Accepted", tone: "teal" },
  IN_PROGRESS: { label: "In progress", tone: "blue" },
  AWAITING_CONFIRMATION: { label: "Awaiting confirmation", tone: "purple" },
  COMPLETED: { label: "Completed", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  CANCELLED: { label: "Cancelled", tone: "slate" },
};

export const PROVIDER_STATUS: Record<ProviderStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending approval", tone: "amber" },
  APPROVED: { label: "Active", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  SUSPENDED: { label: "Suspended", tone: "red" },
  BANNED: { label: "Banned", tone: "slate" },
};

export const REPORT_STATUS: Record<ReportStatus, { label: string; tone: Tone }> = {
  OPEN: { label: "Open", tone: "amber" },
  UNDER_REVIEW: { label: "Under review", tone: "blue" },
  RESOLVED: { label: "Resolved", tone: "green" },
  DISMISSED: { label: "Dismissed", tone: "slate" },
};

export const REQUEST_STATUS: Record<CategoryRequestStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending", tone: "amber" },
  APPROVED: { label: "Approved", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
};

/** Backend value -> UI label (BAD/GOOD/VERY_GOOD/EXCELLENT; never stars or numbers). */
export const RATING_LABEL: Record<Rating, string> = {
  BAD: "Bad", GOOD: "Good", VERY_GOOD: "V.Good", EXCELLENT: "Excellent",
};
const RATING_LABEL_FR: Record<Rating, string> = { BAD: "Mauvais", GOOD: "Bien", VERY_GOOD: "Très bien", EXCELLENT: "Excellent" };
/** Rating word in the given language (default: the active one). */
export const ratingLabel = (rating: Rating, lang: Lang = getLang()) => (lang === "fr" ? RATING_LABEL_FR : RATING_LABEL)[rating];
export const RATING_ORDER: Rating[] = ["BAD", "GOOD", "VERY_GOOD", "EXCELLENT"];
export const ratingRank = (rating: Rating | null | undefined) => (rating ? RATING_ORDER.indexOf(rating) + 1 : 0);

export const ACTIVE_BOOKING: BookingStatus[] = ["PENDING", "ACCEPTED", "IN_PROGRESS", "AWAITING_CONFIRMATION"];
export const CLOSED_BOOKING: BookingStatus[] = ["REJECTED", "CANCELLED"];
