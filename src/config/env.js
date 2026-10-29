// Only VITE_* variables are exposed to the browser. Never put secrets in them.
const DEFAULT_API_BASE_URL = "http://localhost:8000/api/v1";

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

export const env = Object.freeze({
  apiBaseUrl: trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL),
  apiTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 15000,
  appName: import.meta.env.VITE_APP_NAME || "PrepWise",
});
