import { config } from "../config/env";
import { translateApiMessage } from "../i18n/apiMessages";
import { getLang } from "../i18n/core";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(translateApiMessage(message, getLang(), status)); // text is shown to users, so it follows the active language
    this.status = status;
  }
}

type TokenProvider = () => Promise<string | null>;
let tokenProvider: TokenProvider = async () => null;
let onUnauthorized: () => void = () => {};

export function configureClient(options: { getToken: TokenProvider; onUnauthorized: () => void }) {
  tokenProvider = options.getToken;
  onUnauthorized = options.onUnauthorized;
}

interface RequestOptions {
  query?: Record<string, string | number | undefined | null>;
  body?: unknown;
  /** Public endpoints (auth: false) never send the token. */
  auth?: boolean;
}

export async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { query, body, auth = true } = options;
  const url = new URL(config.apiBaseUrl + path, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = await tokenProvider();
    if (!token) {
      onUnauthorized();
      throw new ApiError(401, "Please sign in to continue.");
    }
    // The Cognito authorizer reads the raw ID token (no "Bearer" prefix).
    headers.Authorization = token;
  }
  let response: Response;
  try {
    response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "Can't reach ServaLink. Check your connection and try again.");
  }
  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }
  if (!response.ok) {
    if (response.status === 401 && auth) onUnauthorized();
    const message = (data as { message?: string } | null)?.message;
    throw new ApiError(response.status, friendlyMessage(response.status, message));
  }
  return data as T;
}

function friendlyMessage(status: number, message?: string) {
  if (message && status !== 401 && status !== 403) return message;
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return message && message !== "Forbidden" ? message : "You don't have permission to do that.";
  return message ?? "Something went wrong. Please try again.";
}

export const get = <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options);
export const post = <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, { ...options, body: body ?? {} });
export const put = <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PUT", path, { ...options, body: body ?? {} });
export const del = <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options);
