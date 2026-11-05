import { translateApiMessage } from "../i18n/apiMessages";
import { getLang } from "../i18n/core";
import { ApiError, del, get, post, put } from "./client";
import type {
  AdminProvider, Booking, BookingAction, Category, CategoryRequest, GalleryItem, Profile,
  ProviderCard, ProviderDetail, ProviderRecord, ProviderStatus, PublicVouch, Rating, Report, Review, Service, Vouch, VouchActionBody,
} from "./types";

export { ApiError } from "./client";
export * from "./types";

const PUBLIC = { auth: false } as const;

export const api = {
  // --- public ---
  categories: () => get<{ categories: Category[] }>("/service-categories", PUBLIC).then((r) => r.categories),
  providers: (query: { category?: string; city?: string; limit?: number } = {}) =>
    get<{ providers: ProviderCard[] }>("/providers", { ...PUBLIC, query }).then((r) => r.providers),
  provider: (id: string) => get<{ provider: ProviderDetail }>(`/providers/${id}`, PUBLIC).then((r) => r.provider),
  service: (id: string) => get<{ service: Service }>(`/services/${id}`, PUBLIC).then((r) => r.service),
  providerReviews: (providerId: string) =>
    get<{ reviews: Review[] }>("/reviews", { ...PUBLIC, query: { provider_id: providerId } }).then((r) => r.reviews),
  providerGallery: (providerId: string) =>
    get<{ gallery: GalleryItem[] }>("/gallery", { ...PUBLIC, query: { provider_id: providerId } }).then((r) => r.gallery),

  // --- profile ---
  /** Resolves null when the application profile does not exist yet (404). */
  profile: async (): Promise<Profile | null> => {
    try { return await get<Profile>("/profile"); }
    catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
  },
  saveProfile: (body: { full_name: string; region: string; city: string; quartier?: string; phone: string; profile_image_key?: string | null; accept_terms?: boolean; language?: "fr" | "en"; notify_sms?: boolean }) =>
    put<{ profile: Profile }>("/profile", body).then((r) => r.profile),

  // --- provider (own) ---
  myProvider: async (): Promise<ProviderRecord | null> => {
    try { return await get<ProviderRecord>("/provider"); }
    catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
  },
  applyAsProvider: (body: { service_category: string; service_title: string; description: string; phone: string }) =>
    post<{ provider: ProviderRecord }>("/provider", body).then((r) => r.provider),
  saveProviderProfile: (body: { service_title?: string; description?: string }) =>
    put<{ provider: ProviderRecord }>("/provider", body).then((r) => r.provider),
  myServices: (providerId: string) =>
    get<{ services: Service[] }>("/services", { ...PUBLIC, query: { provider_id: providerId } }).then((r) => r.services),
  createService: (body: { category_id: string; region: string; city: string; name: string; description?: string; price_from?: number | null; price_note?: string }) =>
    post<{ service: Service }>("/services", body).then((r) => r.service),
  updateService: (id: string, body: { name?: string; description?: string; price_from?: number | null; price_note?: string }) =>
    put<{ service: Service }>(`/services/${id}`, body).then((r) => r.service),
  deleteService: (id: string) => del<{ message: string }>(`/services/${id}`),
  categoryRequests: () => get<{ requests: CategoryRequest[] }>("/service-category-requests").then((r) => r.requests),
  requestCategory: (body: { proposed_name: string; description: string }) =>
    post<{ request: CategoryRequest }>("/service-category-requests", body).then((r) => r.request),

  // --- bookings ---
  bookings: (role: "citizen" | "provider") =>
    get<{ bookings: Booking[] }>("/bookings", { query: { role } }).then((r) => r.bookings),
  booking: (id: string) => get<{ booking: Booking }>(`/bookings/${id}`).then((r) => r.booking),
  createBooking: (body: { service_id: string; booking_date: string; message: string; quartier: string; address_details: string }) =>
    post<{ booking: Booking }>("/bookings", body).then((r) => r.booking),
  bookingAction: (id: string, action: BookingAction, reason?: string) =>
    put<{ status: Booking["status"] }>(`/bookings/${id}`, { action, reason }),

  // --- reviews / reports ---
  myReviews: () => get<{ reviews: Review[] }>("/reviews/mine").then((r) => r.reviews),
  createReview: (body: { booking_id: string; rating: Rating; comment: string; photo_key?: string }) =>
    post<{ review: Review }>("/reviews", { action: "CREATE_REVIEW", ...body }).then((r) => r.review),
  myReports: () => get<{ reports: Report[] }>("/reports").then((r) => r.reports),
  createReport: (body: { booking_id: string; reason: string; description: string; evidence_key?: string }) =>
    post<{ report: Report }>("/reports", body).then((r) => r.report),

  // --- client vouches ---
  createVouch: (body: { client_name: string; client_phone: string; job_summary: string; job_month: string }) =>
    post<{ vouch: Vouch; link: string }>("/vouches", body),
  myVouches: () => get<{ vouches: Vouch[] }>("/vouches").then((r) => r.vouches),
  publicVouch: (token: string) => get<PublicVouch>(`/vouch/${encodeURIComponent(token)}`, PUBLIC),
  vouchAction: (token: string, body: VouchActionBody) =>
    post<{ message?: string }>(`/vouch/${encodeURIComponent(token)}`, body, PUBLIC),

  // --- gallery ---
  createGalleryItem: (body: { photo_key: string; caption: string }) =>
    post<{ gallery_item: GalleryItem }>("/gallery", { action: "CREATE_ITEM", ...body }).then((r) => r.gallery_item),
  deleteGalleryItem: (id: string) => del<{ message: string }>(`/gallery/${id}`),

  // --- admin ---
  adminProviders: (status?: ProviderStatus) =>
    get<{ providers: AdminProvider[] }>("/admin/providers", { query: { status } }).then((r) => r.providers),
  adminSetProviderStatus: (id: string, status: Exclude<ProviderStatus, "PENDING">, reason: string) =>
    put<{ provider: ProviderRecord }>(`/admin/providers/${id}/status`, { status, reason }),
  adminReports: () => get<{ reports: Report[] }>("/admin/reports").then((r) => r.reports),
  adminProcessReport: (id: string, action: "START_REVIEW" | "RESOLVE" | "DISMISS", admin_note: string) =>
    put<{ report: Report }>(`/admin/reports/${id}`, { action, admin_note }),
  adminCategoryRequests: () =>
    get<{ requests: CategoryRequest[] }>("/admin/service-category-requests").then((r) => r.requests),
  adminProcessCategoryRequest: (id: string, action: "APPROVE" | "REJECT") =>
    put<{ message: string }>(`/admin/service-category-requests/${id}`, { action }),
};

// --- image uploads (presigned S3, key then sent to the domain API) ---
export type UploadPurpose = "PROFILE_IMAGE" | "REPORT_EVIDENCE" | "REVIEW" | "GALLERY";
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return translateApiMessage("Use a JPEG, PNG or WEBP image.", getLang());
  if (file.size > MAX_IMAGE_BYTES) return translateApiMessage("The image must be 10 MB or smaller.", getLang());
  return null;
}

export async function uploadImage(file: File, purpose: UploadPurpose): Promise<string> {
  const problem = validateImage(file);
  if (problem) throw new ApiError(400, problem);
  let target: { upload_url: string; key: string };
  if (purpose === "PROFILE_IMAGE" || purpose === "REPORT_EVIDENCE") {
    target = await post<{ upload_url: string; key: string }>("/uploads", { purpose, content_type: file.type });
  } else {
    const path = purpose === "REVIEW" ? "/reviews" : "/gallery";
    const result = await post<{ upload_url: string; photo_key: string }>(path, { action: "GENERATE_UPLOAD_URL", content_type: file.type });
    target = { upload_url: result.upload_url, key: result.photo_key };
  }
  let response: Response;
  try {
    response = await fetch(target.upload_url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  } catch {
    throw new ApiError(0, "The image upload failed. Check your connection and try again.");
  }
  if (!response.ok) throw new ApiError(response.status, "The image upload failed. Try again.");
  return target.key;
}
