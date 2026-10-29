import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "@/lib/api/client";
import NewAnalysisPage from "@/pages/app/new-analysis-page";
import { makeAccess, makeCredential } from "@/test/fixtures";
import { renderRoute } from "@/test/render";

const RESUME = {
  id: 4,
  original_filename: "cv.pdf",
  file_type: "pdf",
  created_at: "2026-10-20T10:00:00Z",
};
const PROFILE = { id: 9, title: "Backend Engineer", company: "", created_at: "2026-10-20T10:00:00Z" };

function mockApi(access) {
  vi.spyOn(apiClient, "get").mockImplementation(async (url) => {
    if (url === "/ai/access/") return { data: access };
    if (url === "/resumes/") return { data: { count: 1, results: [RESUME] } };
    if (url === "/job-profiles/") return { data: { count: 1, results: [PROFILE] } };
    throw new Error(`Unexpected GET ${url}`);
  });
}

function renderPage() {
  return renderRoute(<NewAnalysisPage />, {
    path: "/app/analyses/new",
    routes: [{ path: "/app/analyses/:id", element: <p>Analysis page</p> }],
  });
}

describe("NewAnalysisPage AI choice", () => {
  it("requires an explicit billing choice when both a subscription and a key exist", async () => {
    mockApi(makeAccess({ subscribed: true, credentials: [makeCredential()] }));
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({ data: { id: 12 } });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Run analysis" }));
    expect(await screen.findByText("Choose how this request is paid for.")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();

    await user.click(screen.getByRole("radio", { name: /Your own API key/ }));
    await user.click(screen.getByRole("button", { name: "Run analysis" }));

    expect(post).toHaveBeenCalledTimes(1);
    const [url, body] = post.mock.calls[0];
    expect(url).toBe("/resume-analyses/");
    expect(body).toMatchObject({
      resume_id: 4,
      job_profile_id: 9,
      billing_mode: "byok",
      byok_provider: "anthropic",
      ai_mode: "fast",
    });
    expect(body.idempotency_key).toMatch(/^[0-9a-f-]{36}$/);
    expect(await screen.findByText("Analysis page")).toBeInTheDocument();
  });

  it("states the only available billing mode and sends it explicitly", async () => {
    mockApi(makeAccess({ subscribed: true }));
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({ data: { id: 12 } });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Uses your platform AI subscription allowance.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Run analysis" }));

    expect(post.mock.calls[0][1]).toMatchObject({ billing_mode: "platform", byok_provider: null });
  });

  it("shows limit details from a machine-readable usage error", async () => {
    mockApi(makeAccess({ subscribed: true }));
    vi.spyOn(apiClient, "post").mockRejectedValue(
      new ApiError({
        status: 403,
        code: "daily_token_limit_reached",
        message: "You've reached today's platform AI limit. It resets at midnight.",
        limit: {
          kind: "ai_tokens",
          scope: "daily",
          limit: 50000,
          used: 49800,
          requested: 9000,
          resets_at: "2026-10-28T00:00:00+05:30",
        },
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Run analysis" }));

    expect(await screen.findByText(/today's platform AI limit/)).toBeInTheDocument();
    expect(screen.getByText(/Used 49,800 of 50,000 today/)).toBeInTheDocument();
  });

  it("explains how to get access when there is none", async () => {
    mockApi(makeAccess());
    renderPage();

    expect(await screen.findByText("Set up AI access")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run analysis" })).toBeDisabled();
  });
});
