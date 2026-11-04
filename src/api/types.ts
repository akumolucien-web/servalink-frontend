// Mirrors PROJECT_CONTEXT.md / BACKEND_STATE.md. Enum values must match the backend exactly.

export type BookingStatus =
  | "PENDING" | "ACCEPTED" | "IN_PROGRESS" | "AWAITING_CONFIRMATION"
  | "COMPLETED" | "REJECTED" | "CANCELLED";
export type Rating = "BAD" | "GOOD" | "VERY_GOOD" | "EXCELLENT";
export type ProviderStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "BANNED";
export type ReportStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
export type CategoryRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type BookingAction =
  | "ACCEPT" | "REJECT" | "START_WORK" | "MARK_COMPLETED" | "CONFIRM_COMPLETION" | "CANCEL" | "PROVIDER_CANCEL";

export interface Category {
  category_id: string;
  category_name: string;
  description: string;
  status: string;
}

export interface Profile {
  user_id: string;
  email: string;
  full_name: string;
  city: string;
  region?: string;
  quartier?: string;
  phone: string;
  profile_image_key: string | null;
  terms_accepted_at?: string;
  terms_version?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProviderRecord {
  provider_id: string;
  category_id: string;
  service_category: string;
  description: string;
  service_title: string;
  phone: string;
  city: string;
  status: ProviderStatus;
  status_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminProvider extends ProviderRecord {
  name: string;
  email: string;
}

export interface ProviderCard {
  provider_id: string;
  name: string;
  photo_url: string | null;
  category: string;
  service_title: string;
  city: string;
  description: string;
  review_count: number;
  bad_review_count: number;
  overall_rating: Rating | null;
}

export interface Service {
  service_id: string;
  provider_id: string;
  category_id: string;
  category_name: string;
  name: string;
  description: string;
  region?: string;
  city: string;
  price_from?: number | null;
  price_note?: string;
  status: string;
  provider_name?: string;
  provider_photo_url?: string | null;
  review_count?: number;
  overall_rating?: Rating | null;
}

export interface ProviderDetail extends ProviderCard {
  services: Service[];
}

export interface Booking {
  booking_id: string;
  reference: string;
  citizen_id: string;
  provider_id: string;
  service_id: string;
  category_name?: string;
  city?: string;
  booking_date: string;
  message: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  citizen_name: string;
  provider_name: string;
  reviewed: boolean;
  report_id?: string;
  quartier?: string;
  address_details?: string;
  /** E.164; the backend only sends it once the booking is ACCEPTED or later. */
  counterparty_phone?: string | null;
  cancel_reason?: string;
  cancelled_by?: "CITIZEN" | "PROVIDER";
}

export interface Review {
  review_id: string;
  booking_id: string;
  provider_id: string;
  rating: Rating;
  comment: string;
  created_at: string;
  reviewer_name: string;
  verified_booking: boolean;
  photo_url?: string;
}

export interface Report {
  report_id: string;
  booking_id: string;
  citizen_id: string;
  provider_id: string;
  reason: string;
  description: string;
  status: ReportStatus;
  created_at: string;
  admin_note?: string;
  evidence_url?: string;
}

export interface GalleryItem {
  gallery_item_id: string;
  provider_id: string;
  caption: string;
  created_at: string;
  photo_url: string | null;
}

export interface CategoryRequest {
  request_id: string;
  provider_id: string;
  proposed_name: string;
  description: string;
  status: CategoryRequestStatus;
  created_at: string;
}
