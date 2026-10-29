/**
 * In-memory session state.
 *
 * The access token lives only in this module (never in localStorage or
 * sessionStorage), so it disappears when the tab closes. The long-lived
 * refresh token is an HttpOnly cookie the browser sends to /api/v1/auth/
 * and that JavaScript cannot read.
 */
let accessToken = null;
let csrfToken = null;
const listeners = new Set();

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getCsrfToken() {
  return csrfToken;
}

export function setCsrfToken(token) {
  csrfToken = token || null;
}

export function clearSession() {
  accessToken = null;
}

/** Subscribe to session events: { type: "refreshed", user } or { type: "expired" }. */
export function onSessionEvent(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitSessionEvent(event) {
  listeners.forEach((listener) => listener(event));
}
