import { screen } from "@testing-library/react";
import { useLocation } from "react-router";
import { describe, expect, it } from "vitest";

import { RequireAdmin, RequireAuth } from "@/features/auth/guards";
import { makeAuth, renderRoute, testUser } from "@/test/render";

function LoginProbe() {
  const location = useLocation();
  return (
    <p>
      Login page from={location.state?.from} reason={String(location.state?.reason)}
    </p>
  );
}

const loginRoute = { path: "/login", element: <LoginProbe /> };

describe("RequireAuth", () => {
  it("sends anonymous visitors to the login page and remembers where they were going", () => {
    renderRoute(
      <RequireAuth>
        <p>Secret dashboard</p>
      </RequireAuth>,
      {
        path: "/app/interviews",
        initialEntries: ["/app/interviews?status=completed"],
        auth: makeAuth({ user: null }),
        routes: [loginRoute],
      },
    );

    expect(screen.queryByText("Secret dashboard")).not.toBeInTheDocument();
    expect(
      screen.getByText("Login page from=/app/interviews?status=completed reason=null"),
    ).toBeInTheDocument();
  });

  it("tells the login page when the session expired", () => {
    renderRoute(<RequireAuth>secret</RequireAuth>, {
      path: "/app",
      auth: makeAuth({ user: null, expired: true }),
      routes: [loginRoute],
    });

    expect(screen.getByText(/reason=expired/)).toBeInTheDocument();
  });

  it("waits while the session is being restored", () => {
    renderRoute(<RequireAuth>secret</RequireAuth>, {
      auth: makeAuth({ status: "loading", user: null }),
    });

    expect(screen.getByRole("status")).toHaveTextContent("Checking your session");
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("renders protected content for signed-in users", () => {
    renderRoute(<RequireAuth>secret</RequireAuth>);

    expect(screen.getByText("secret")).toBeInTheDocument();
  });
});

describe("RequireAdmin", () => {
  it("blocks users without the administrator role", () => {
    renderRoute(<RequireAdmin>admin tools</RequireAdmin>);

    expect(screen.queryByText("admin tools")).not.toBeInTheDocument();
    expect(screen.getByText("Administrator access required")).toBeInTheDocument();
  });

  it("allows administrators", () => {
    renderRoute(<RequireAdmin>admin tools</RequireAdmin>, {
      auth: makeAuth({ user: { ...testUser, role: "admin" } }),
    });

    expect(screen.getByText("admin tools")).toBeInTheDocument();
  });
});
