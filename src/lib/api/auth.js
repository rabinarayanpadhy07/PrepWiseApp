import { apiClient, refreshSession } from "@/lib/api/client";
import { clearSession, setAccessToken } from "@/lib/auth/session";

// Endpoints that read or set the refresh cookie need the CSRF token and must
// never trigger the automatic refresh-and-retry.
const cookieEndpoint = { skipAuth: true, skipAuthRefresh: true, csrf: true };

function startSession(data) {
  setAccessToken(data.access);
  return data;
}

export async function login({ email, password }) {
  const { data } = await apiClient.post("/auth/login/", { email, password }, cookieEndpoint);
  return startSession(data);
}

export async function register({ fullName, email, password }) {
  const { data } = await apiClient.post(
    "/auth/register/",
    { full_name: fullName, email, password },
    cookieEndpoint,
  );
  return startSession(data);
}

export async function logout() {
  try {
    await apiClient.post("/auth/logout/", null, cookieEndpoint);
  } finally {
    clearSession();
  }
}

export { refreshSession };

export async function updateProfile({ fullName }) {
  const { data } = await apiClient.patch("/auth/me/", { full_name: fullName });
  return data;
}

export async function changePassword({ currentPassword, newPassword }) {
  const { data } = await apiClient.post(
    "/auth/password/change/",
    { current_password: currentPassword, new_password: newPassword },
    { csrf: true },
  );
  return startSession(data);
}

/** Sign-in methods the server offers: { google_client_id } (null when disabled). */
export async function fetchAuthProviders() {
  const { data } = await apiClient.get("/auth/providers/", { skipAuth: true, skipAuthRefresh: true });
  return data;
}

/** Exchange a Google ID token (from Google Identity Services) for a PrepWise session. */
export async function signInWithGoogle(credential) {
  const { data } = await apiClient.post("/auth/google/", { credential }, cookieEndpoint);
  return startSession(data);
}
