import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "@/features/auth/auth-provider";
import { draftKey, readDraft, writeDraft } from "@/lib/drafts";

vi.mock("@/lib/api/auth", () => ({
  refreshSession: vi.fn().mockResolvedValue({ user: { id: 1, email: "user@example.com", role: "user" } }),
  logout: vi.fn().mockResolvedValue(undefined),
}));

function SignOut() {
  const auth = useAuth();
  return (
    <button type="button" onClick={() => auth.signOut()}>
      {auth.status}
    </button>
  );
}

afterEach(() => window.localStorage.clear());

describe("AuthProvider", () => {
  it("removes unsent interview drafts when the user signs out", async () => {
    writeDraft(draftKey(7, 1), "My unsent answer about a past employer");
    writeDraft(draftKey(7, 2), "Another draft");
    window.localStorage.setItem("unrelated", "kept");
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <SignOut />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "authenticated" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "anonymous" })).toBeInTheDocument());
    expect(readDraft(draftKey(7, 1))).toBe("");
    expect(readDraft(draftKey(7, 2))).toBe("");
    expect(window.localStorage.getItem("unrelated")).toBe("kept");
  });
});
