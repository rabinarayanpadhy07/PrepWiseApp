import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/session";
import LoginPage from "@/pages/public/login-page";
import { makeAuth, renderRoute, testUser } from "@/test/render";

const anonymous = () => makeAuth({ user: null });

async function fillAndSubmit(user, password = "Correct-Horse-Battery-9") {
  await user.type(screen.getByLabelText("Email"), "user@example.com");
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Log in" }));
}

describe("LoginPage", () => {
  it("validates input before calling the API", async () => {
    const post = vi.spyOn(apiClient, "post");
    const user = userEvent.setup();
    renderRoute(<LoginPage />, { path: "/login", auth: anonymous() });

    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Enter your email address.");
    expect(post).not.toHaveBeenCalled();
  });

  it("logs in through the API and opens the app", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: { access: "access-token", user: testUser } });
    const auth = anonymous();
    const user = userEvent.setup();
    const { router } = renderRoute(<LoginPage />, {
      path: "/login",
      auth,
      routes: [{ path: "/app", element: <p>App home</p> }],
    });

    await fillAndSubmit(user);

    expect(await screen.findByText("App home")).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith(
      "/auth/login/",
      { email: "user@example.com", password: "Correct-Horse-Battery-9" },
      expect.objectContaining({ csrf: true, skipAuthRefresh: true }),
    );
    expect(auth.startSession).toHaveBeenCalledWith({ access: "access-token", user: testUser });
    expect(getAccessToken()).toBe("access-token");
    expect(router.state.location.pathname).toBe("/app");
  });

  it("shows invalid credentials without revealing which field was wrong", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValue(
      new ApiError({ status: 401, code: "invalid_credentials", message: "Incorrect email or password." }),
    );
    const user = userEvent.setup();
    renderRoute(<LoginPage />, { path: "/login", auth: anonymous() });

    await fillAndSubmit(user, "wrong-password");

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
  });

  it("explains when a previous session expired", () => {
    renderRoute(<LoginPage />, {
      path: "/login",
      auth: anonymous(),
      initialEntries: [{ pathname: "/login", state: { reason: "expired", from: "/app" } }],
    });

    expect(screen.getByRole("status")).toHaveTextContent("Your session has ended");
  });

  it("sends signed-in users to the app", () => {
    renderRoute(<LoginPage />, {
      path: "/login",
      routes: [{ path: "/app", element: <p>App home</p> }],
    });

    expect(screen.getByText("App home")).toBeInTheDocument();
  });
});
