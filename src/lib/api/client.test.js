import { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ApiError, apiClient, toApiError } from "@/lib/api/client";
import {
  clearSession,
  getAccessToken,
  onSessionEvent,
  setAccessToken,
  setCsrfToken,
} from "@/lib/auth/session";

describe("toApiError", () => {
  it("reads the backend error envelope", () => {
    const error = new AxiosError("Request failed", "ERR_BAD_REQUEST", {}, {}, {
      status: 400,
      headers: {},
      data: {
        error: {
          code: "validation_error",
          message: "Invalid input.",
          details: { email: ["Enter a valid email address."] },
          request_id: "req-123",
        },
      },
    });

    const result = toApiError(error);

    expect(result).toBeInstanceOf(ApiError);
    expect(result).toMatchObject({
      status: 400,
      code: "validation_error",
      message: "Invalid input.",
      details: { email: ["Enter a valid email address."] },
      requestId: "req-123",
    });
  });

  it("keeps machine-readable usage limit details", () => {
    const limit = {
      kind: "interview",
      scope: "period",
      limit: 60,
      used: 60,
      requested: 1,
      resets_at: "2026-11-19T10:00:00Z",
    };
    const error = new AxiosError("Request failed", "ERR_BAD_REQUEST", {}, {}, {
      status: 403,
      headers: {},
      data: { error: { code: "interview_allowance_exhausted", message: "Used up.", limit } },
    });

    expect(toApiError(error)).toMatchObject({ code: "interview_allowance_exhausted", limit });
  });

  it("reports network failures without a response", () => {
    const result = toApiError(new AxiosError("Network Error", "ERR_NETWORK"));

    expect(result.code).toBe("network_error");
    expect(result.status).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Auth transport: bearer header, CSRF header, refresh-on-401
// ---------------------------------------------------------------------------

function respond(config, status, data) {
  if (status >= 400) {
    return Promise.reject(
      new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
        status,
        headers: {},
        data,
        config,
      }),
    );
  }
  return Promise.resolve({ status, data, headers: {}, config, statusText: "OK" });
}

const expiredToken = { error: { code: "token_not_valid", message: "Token is invalid or expired" } };
const refreshed = { access: "new-access", user: { id: 1, email: "user@example.com" } };

describe("apiClient auth handling", () => {
  let calls;
  let originalAdapter;

  beforeEach(() => {
    calls = [];
    originalAdapter = apiClient.defaults.adapter;
    setAccessToken("old-access");
    setCsrfToken("csrf-123");
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    clearSession();
    setCsrfToken(null);
  });

  function useAdapter(handler) {
    apiClient.defaults.adapter = (config) => {
      calls.push({
        url: config.url,
        auth: config.headers.Authorization,
        csrf: config.headers["X-CSRFToken"],
      });
      return handler(config);
    };
  }

  it("sends the in-memory access token as a bearer header", async () => {
    useAdapter((config) => respond(config, 200, {}));

    await apiClient.get("/resumes/");

    expect(calls[0].auth).toBe("Bearer old-access");
    expect(calls[0].csrf).toBeUndefined();
  });

  it("sends the CSRF token only on cookie endpoints", async () => {
    useAdapter((config) => respond(config, 200, {}));

    await apiClient.post("/auth/logout/", null, { skipAuth: true, csrf: true });

    expect(calls[0].csrf).toBe("csrf-123");
    expect(calls[0].auth).toBeUndefined();
  });

  it("refreshes an expired access token once and retries the request", async () => {
    useAdapter((config) => {
      if (config.url === "/auth/refresh/") return respond(config, 200, refreshed);
      if (config.headers.Authorization === "Bearer old-access") {
        return respond(config, 401, expiredToken);
      }
      return respond(config, 200, { ok: true });
    });

    const response = await apiClient.get("/interviews/");

    expect(response.data).toEqual({ ok: true });
    expect(calls.map((call) => call.url)).toEqual(["/interviews/", "/auth/refresh/", "/interviews/"]);
    expect(calls[2].auth).toBe("Bearer new-access");
    expect(getAccessToken()).toBe("new-access");
  });

  it("shares one refresh between concurrent requests", async () => {
    useAdapter((config) => {
      if (config.url === "/auth/refresh/") return respond(config, 200, refreshed);
      if (config.headers.Authorization === "Bearer old-access") {
        return respond(config, 401, expiredToken);
      }
      return respond(config, 200, {});
    });

    await Promise.all([apiClient.get("/a/"), apiClient.get("/b/"), apiClient.get("/c/")]);

    expect(calls.filter((call) => call.url === "/auth/refresh/")).toHaveLength(1);
  });

  it("ends the session when the refresh token is no longer valid", async () => {
    const events = [];
    const unsubscribe = onSessionEvent((event) => events.push(event));
    useAdapter((config) =>
      config.url === "/auth/refresh/"
        ? respond(config, 401, { error: { code: "session_expired", message: "Session ended." } })
        : respond(config, 401, expiredToken),
    );

    await expect(apiClient.get("/interviews/")).rejects.toMatchObject({ code: "session_expired" });

    expect(events).toEqual([{ type: "expired" }]);
    expect(getAccessToken()).toBeNull();
    unsubscribe();
  });

  it("does not try to refresh on other errors", async () => {
    useAdapter((config) =>
      respond(config, 403, { error: { code: "permission_denied", message: "No." } }),
    );

    await expect(apiClient.get("/admin/users/")).rejects.toMatchObject({ status: 403 });
    expect(calls).toHaveLength(1);
  });

  it("fetches a fresh CSRF token once when the server rejects it", async () => {
    let csrfFailures = 0;
    useAdapter((config) => {
      if (config.url === "/auth/csrf/") return respond(config, 200, { csrf_token: "fresh" });
      if (config.headers["X-CSRFToken"] === "csrf-123") {
        csrfFailures += 1;
        return respond(config, 403, { error: { code: "csrf_failed", message: "CSRF." } });
      }
      return respond(config, 204, null);
    });

    await apiClient.post("/auth/logout/", null, { skipAuth: true, skipAuthRefresh: true, csrf: true });

    expect(csrfFailures).toBe(1);
    expect(calls.at(-1).csrf).toBe("fresh");
  });
});
