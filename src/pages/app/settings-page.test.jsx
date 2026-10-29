import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "@/lib/api/client";
import SettingsPage from "@/pages/app/settings-page";
import { makeAccess, makeCredential } from "@/test/fixtures";
import { renderRoute } from "@/test/render";

const FULL_KEY = "sk-ant-api03-real-looking-user-key-0000WXYZ";

function mockAccess(initial) {
  let access = initial;
  vi.spyOn(apiClient, "get").mockImplementation(async (url) => {
    if (url === "/ai/access/") return { data: access };
    throw new Error(`Unexpected GET ${url}`);
  });
  return { set: (next) => (access = next) };
}

function renderAiTab() {
  return renderRoute(<SettingsPage />, {
    path: "/app/settings",
    initialEntries: ["/app/settings?tab=ai"],
  });
}

function providerCard(name) {
  return screen.getByRole("heading", { name }).closest("[data-slot='card']");
}

describe("Settings: your own API keys", () => {
  it("is available without a subscription and shows only the masked key", async () => {
    mockAccess(makeAccess({ credentials: [makeCredential()] }));
    renderAiTab();

    const card = await waitFor(() => providerCard("Anthropic (Claude)"));
    expect(within(card).getByText("••••WXYZ")).toBeInTheDocument();
    expect(within(card).getByText("Working")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("sk-ant-");
    // Providers without a key offer the add form.
    expect(within(providerCard("OpenAI")).getByLabelText("OpenAI API key")).toBeInTheDocument();
  });

  it("tests and saves a new key, then clears it from the page", async () => {
    const access = mockAccess(makeAccess());
    const post = vi.spyOn(apiClient, "post").mockImplementation(async (url, body) => {
      access.set(makeAccess({ credentials: [makeCredential()] }));
      return { data: makeCredential({ key_hint: body.api_key.slice(-4) }) };
    });
    const user = userEvent.setup();
    renderAiTab();

    const input = await screen.findByLabelText("Anthropic (Claude) API key");
    await user.type(input, FULL_KEY);
    await user.click(
      within(providerCard("Anthropic (Claude)")).getByRole("button", { name: "Test and save key" }),
    );

    expect(post).toHaveBeenCalledWith(
      "/ai/credentials/",
      { provider: "anthropic", api_key: FULL_KEY },
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
    expect(await within(providerCard("Anthropic (Claude)")).findByText("••••WXYZ")).toBeInTheDocument();
    expect(screen.queryByDisplayValue(FULL_KEY)).not.toBeInTheDocument();
  });

  it("explains a rejected key and doesn't keep it in the form", async () => {
    mockAccess(makeAccess());
    vi.spyOn(apiClient, "post").mockRejectedValue(
      new ApiError({
        status: 400,
        code: "byok_key_rejected",
        message: "Your API key was rejected by the AI provider. Check or replace it in Settings.",
      }),
    );
    const user = userEvent.setup();
    renderAiTab();

    const input = await screen.findByLabelText("Anthropic (Claude) API key");
    await user.type(input, FULL_KEY);
    await user.click(screen.getAllByRole("button", { name: "Test and save key" })[0]);

    expect(await screen.findByText("The key wasn't saved")).toBeInTheDocument();
    expect(screen.getByText(/rejected by the AI provider/)).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(document.body.textContent).not.toContain(FULL_KEY);
  });

  it("asks for a key before calling the API", async () => {
    mockAccess(makeAccess());
    const post = vi.spyOn(apiClient, "post");
    const user = userEvent.setup();
    renderAiTab();

    await screen.findByLabelText("Anthropic (Claude) API key");
    await user.click(screen.getAllByRole("button", { name: "Test and save key" })[0]);

    expect(screen.getByText("Paste your API key.")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("re-tests a saved key and reports a rejection", async () => {
    mockAccess(makeAccess({ credentials: [makeCredential()] }));
    const post = vi.spyOn(apiClient, "post").mockRejectedValue(
      new ApiError({ status: 400, code: "byok_key_rejected", message: "Your API key was rejected." }),
    );
    const user = userEvent.setup();
    renderAiTab();

    await user.click(await screen.findByRole("button", { name: "Test key" }));

    expect(post).toHaveBeenCalledWith("/ai/credentials/anthropic/test/", null, expect.any(Object));
    expect(await screen.findByText("Key test failed")).toBeInTheDocument();
  });

  it("removes a key after confirmation and explains there's no silent fallback", async () => {
    const access = mockAccess(makeAccess({ credentials: [makeCredential()] }));
    const remove = vi.spyOn(apiClient, "delete").mockImplementation(async () => {
      access.set(makeAccess());
      return { status: 204 };
    });
    const user = userEvent.setup();
    renderAiTab();

    await user.click(await screen.findByRole("button", { name: "Remove key" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/never switch to platform AI/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Remove key" }));

    expect(remove).toHaveBeenCalledWith("/ai/credentials/anthropic/");
    await waitFor(() =>
      expect(within(providerCard("Anthropic (Claude)")).getByText("Not added")).toBeInTheDocument(),
    );
  });

  it("saves an explicit default billing choice", async () => {
    mockAccess(makeAccess({ subscribed: true, credentials: [makeCredential()] }));
    const patch = vi.spyOn(apiClient, "patch").mockResolvedValue({
      data: { billing_mode: "byok", byok_provider: "", ai_mode: "fast" },
    });
    const user = userEvent.setup();
    renderAiTab();

    await user.click(await screen.findByLabelText("Pay for AI with"));
    await user.click(await screen.findByRole("option", { name: "My own API key" }));

    expect(patch).toHaveBeenCalledWith("/ai/preference/", { billing_mode: "byok" });
  });
});
