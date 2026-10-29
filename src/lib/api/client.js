import axios from "axios";

import { env } from "@/config/env";
import {
  clearSession,
  emitSessionEvent,
  getAccessToken,
  getCsrfToken,
  setAccessToken,
  setCsrfToken,
} from "@/lib/auth/session";

/**
 * Normalised API error. The backend returns errors as
 * { error: { code, message, details, request_id, limit? } }.
 * `limit` is present on usage-limit errors:
 * { kind, scope, limit, used, requested, resets_at }.
 */
export class ApiError extends Error {
  constructor({
    message,
    status = null,
    code = "unknown_error",
    details = null,
    requestId = null,
    limit = null,
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.limit = limit;
  }
}

export function toApiError(error) {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return new ApiError({
        code: error.code === "ECONNABORTED" ? "timeout" : "network_error",
        message:
          error.code === "ECONNABORTED"
            ? "The server took too long to respond. Please try again."
            : "We couldn't reach the PrepWise server. Check your connection and try again.",
      });
    }

    const { status, data } = error.response;
    const body = data && typeof data === "object" ? data.error : null;
    return new ApiError({
      status,
      code: body?.code ?? "http_error",
      message: body?.message ?? "Something went wrong. Please try again.",
      details: body?.details ?? null,
      requestId: body?.request_id ?? error.response.headers?.["x-request-id"] ?? null,
      limit: body?.limit ?? null,
    });
  }

  return new ApiError({ message: "Something went wrong. Please try again." });
}

/** Requests that call an AI provider can take much longer than ordinary ones. */
export const AI_REQUEST_TIMEOUT_MS = 180_000;

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeoutMs,
  // Sends the HttpOnly refresh and CSRF cookies to the API origin.
  withCredentials: true,
  headers: { Accept: "application/json" },
});

/**
 * Per-request options (on the axios config):
 *   skipAuth         - don't attach the access token
 *   skipAuthRefresh  - don't try to refresh the session on 401
 *   csrf             - attach the CSRF token (cookie-based auth endpoints)
 */
async function ensureCsrfToken(force = false) {
  if (!getCsrfToken() || force) {
    const { data } = await apiClient.get("/auth/csrf/", { skipAuth: true, skipAuthRefresh: true });
    setCsrfToken(data.csrf_token);
  }
  return getCsrfToken();
}

apiClient.interceptors.request.use(async (config) => {
  const token = getAccessToken();
  if (token && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.csrf) {
    config.headers["X-CSRFToken"] = await ensureCsrfToken();
  }
  return config;
});

let refreshInFlight = null;

/**
 * Exchanges the refresh cookie for a new access token. Concurrent callers in a
 * tab share one request; across tabs a Web Lock serialises refreshes so two tabs
 * never race to rotate the same refresh token.
 */
export function refreshSession() {
  if (!refreshInFlight) {
    const run = async () => {
      const { data } = await apiClient.post("/auth/refresh/", null, {
        skipAuth: true,
        skipAuthRefresh: true,
        csrf: true,
      });
      setAccessToken(data.access);
      emitSessionEvent({ type: "refreshed", user: data.user });
      return data;
    };
    const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
    const request = locks?.request ? locks.request("prepwise-auth-refresh", run) : run();
    refreshInFlight = request.finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

const EXPIRED_ACCESS_CODES = new Set(["token_not_valid", "not_authenticated", "authentication_failed"]);

apiClient.interceptors.response.use(
  (response) => response,
  async (rawError) => {
    const error = toApiError(rawError);
    const config = rawError?.config;
    if (!config) throw error;

    // The CSRF token can go stale (e.g. cookie cleared); fetch a new one once.
    if (error.code === "csrf_failed" && config.csrf && !config._csrfRetried) {
      config._csrfRetried = true;
      config.headers["X-CSRFToken"] = await ensureCsrfToken(true);
      return apiClient(config);
    }

    if (
      error.status === 401 &&
      EXPIRED_ACCESS_CODES.has(error.code) &&
      !config.skipAuthRefresh &&
      !config._authRetried
    ) {
      config._authRetried = true;
      try {
        await refreshSession();
      } catch {
        clearSession();
        emitSessionEvent({ type: "expired" });
        throw new ApiError({
          status: 401,
          code: "session_expired",
          message: "Your session has ended. Please log in again.",
        });
      }
      config.headers.Authorization = `Bearer ${getAccessToken()}`;
      return apiClient(config);
    }

    throw error;
  },
);
