import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "@/lib/api/client";
import RegisterPage from "@/pages/public/register-page";
import { makeAuth, renderRoute, testUser } from "@/test/render";

const anonymous = () => makeAuth({ user: null });

async function fillForm(user, { password = "a-long-password", confirm = password } = {}) {
  await user.type(screen.getByLabelText("Full name"), "Test User");
  await user.type(screen.getByLabelText("Email"), "user@example.com");
  await user.type(screen.getByLabelText("Password"), password);
  await user.type(screen.getByLabelText("Confirm password"), confirm);
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

describe("RegisterPage", () => {
  it("shows accessible validation errors", async () => {
    const user = userEvent.setup();
    renderRoute(<RegisterPage />, { path: "/register", auth: anonymous() });

    await user.click(screen.getByRole("button", { name: "Create account" }));

    const email = screen.getByLabelText("Email");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription("Enter your email address.");
    expect(screen.getByText("Enter your full name.")).toBeInTheDocument();
  });

  it("reports mismatched passwords without calling the API", async () => {
    const post = vi.spyOn(apiClient, "post");
    const user = userEvent.setup();
    renderRoute(<RegisterPage />, { path: "/register", auth: anonymous() });

    await fillForm(user, { confirm: "different-password" });

    expect(await screen.findByText("Passwords don't match.")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("creates the account and never sends a role", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: { access: "access-token", user: testUser } });
    const auth = anonymous();
    const user = userEvent.setup();
    renderRoute(<RegisterPage />, {
      path: "/register",
      auth,
      routes: [{ path: "/app", element: <p>App home</p> }],
    });

    await fillForm(user);

    expect(await screen.findByText("App home")).toBeInTheDocument();
    const [, body] = post.mock.calls[0];
    expect(body).toEqual({
      full_name: "Test User",
      email: "user@example.com",
      password: "a-long-password",
    });
    expect(auth.startSession).toHaveBeenCalled();
  });

  it("puts server validation errors on the matching fields", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValue(
      new ApiError({
        status: 400,
        code: "validation_error",
        message: "Some fields are invalid.",
        details: {
          email: ["An account with this email address already exists."],
          password: ["This password is too common."],
        },
      }),
    );
    const user = userEvent.setup();
    renderRoute(<RegisterPage />, { path: "/register", auth: anonymous() });

    await fillForm(user);

    expect(await screen.findByText("An account with this email address already exists.")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
      expect.stringContaining("This password is too common."),
    );
  });

  it("shows network failures as a form-level error", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValue(
      new ApiError({ code: "network_error", message: "We couldn't reach the PrepWise server." }),
    );
    const user = userEvent.setup();
    renderRoute(<RegisterPage />, { path: "/register", auth: anonymous() });

    await fillForm(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't reach the PrepWise server");
  });
});
