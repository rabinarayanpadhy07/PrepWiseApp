import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { vi } from "vitest";

import { AuthContext } from "@/features/auth/auth-provider";

export const testUser = {
  id: 1,
  email: "user@example.com",
  full_name: "Test User",
  role: "user",
  date_joined: "2026-10-01T10:00:00Z",
};

/** A fake auth context value. Override fields as needed. */
export function makeAuth(overrides = {}) {
  const user = overrides.user === undefined ? testUser : overrides.user;
  return {
    status: user ? "authenticated" : "anonymous",
    user,
    expired: false,
    isAdmin: user?.role === "admin",
    startSession: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Renders a page inside a memory router and a fresh, non-retrying query client.
 * Pass `auth` to provide an auth context, `routes` for extra routes, and
 * `initialEntries` to start somewhere other than `path`.
 */
export function renderRoute(
  element,
  { path = "/", auth = makeAuth(), routes = [], initialEntries } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      { path, element },
      ...routes,
      { path: "*", element: <p>Other route</p> },
    ],
    { initialEntries: initialEntries ?? [path] },
  );

  const view = render(
    <QueryClientProvider client={queryClient}>
      <AuthContext value={auth}>
        <RouterProvider router={router} />
      </AuthContext>
    </QueryClientProvider>,
  );
  return { ...view, router, queryClient, auth };
}
