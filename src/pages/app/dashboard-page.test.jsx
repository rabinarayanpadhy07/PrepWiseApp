import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "@/lib/api/client";
import DashboardPage from "@/pages/app/dashboard-page";
import { makeByokUsage, makeUsage } from "@/test/fixtures";
import { renderRoute } from "@/test/render";

function makeSummary(overrides = {}) {
  return {
    counts: {
      resumes: 2,
      analyses: 3,
      analyses_completed: 2,
      interviews: 4,
      interviews_completed: 1,
      answers: 9,
      evaluations: 7,
      average_score: 3.57,
    },
    subscription: {
      status: "active",
      plan_name: "Platform AI · 30 days",
      starts_at: "2026-10-20T10:00:00Z",
      ends_at: "2026-11-19T10:00:00Z",
      renewal_starts_at: null,
      renewal_ends_at: null,
    },
    platform_status: "available",
    platform_usage: makeUsage({ dailyTokens: 50_000 }),
    byok_usage: makeByokUsage({ tokens: 2000, cost: 0.026 }),
    has_byok_key: true,
    ...overrides,
  };
}

const EMPTY_SUMMARY = makeSummary({
  counts: {
    resumes: 0,
    analyses: 0,
    analyses_completed: 0,
    interviews: 0,
    interviews_completed: 0,
    answers: 0,
    evaluations: 0,
    average_score: null,
  },
  subscription: {
    status: "none",
    plan_name: null,
    starts_at: null,
    ends_at: null,
    renewal_starts_at: null,
    renewal_ends_at: null,
  },
  platform_status: "subscription_required",
  platform_usage: null,
  byok_usage: makeByokUsage(),
  has_byok_key: false,
});

const EVALUATION_SUMMARY = {
  evaluation_count: 7,
  competencies: [
    { competency: "communication", label: "Communication", average: 3.5, count: 4 },
    { competency: "problem_solving", label: "Problem solving", average: null, count: 0 },
  ],
  sessions: [
    { id: 1, role_title: "PM", mode: "text", created_at: "2026-10-21T10:00:00Z", average_score: 3, evaluated_count: 3 },
    { id: 2, role_title: "PM", mode: "text", created_at: "2026-10-24T10:00:00Z", average_score: 4, evaluated_count: 4 },
  ],
};

function activityItem(index) {
  return {
    type: "answer_evaluated",
    at: `2026-10-${String(26 - (index % 20)).padStart(2, "0")}T10:00:00Z`,
    title: `Role ${index}`,
    detail: `Question 1: 4 / 5`,
    target: { kind: "interview", id: index },
  };
}

let responses;

function mockApi() {
  vi.spyOn(apiClient, "get").mockImplementation(async (url, config) => {
    const handler = responses[url];
    if (!handler) throw new Error(`Unexpected GET ${url}`);
    return { data: await handler(config?.params ?? {}) };
  });
}

beforeEach(() => {
  responses = {
    "/dashboard/summary/": () => makeSummary(),
    "/dashboard/activity/": ({ page = 1 }) => ({
      count: 12,
      next: page === 1 ? "next" : null,
      previous: page === 2 ? "prev" : null,
      results: page === 1 ? [0, 1, 2].map(activityItem) : [activityItem(11)],
    }),
    "/evaluations/summary/": () => EVALUATION_SUMMARY,
    "/interviews/": () => ({
      count: 1,
      results: [
        {
          id: 8,
          role_title: "Product Manager",
          mode: "voice",
          status: "completed",
          question_count: 5,
          answered_count: 5,
          created_at: "2026-10-24T10:00:00Z",
        },
      ],
    }),
    "/resume-analyses/": () => ({
      count: 1,
      results: [
        {
          id: 3,
          status: "completed",
          created_at: "2026-10-22T10:00:00Z",
          resume: { original_filename: "cv.pdf" },
          job_profile: { title: "Backend Engineer" },
        },
      ],
    }),
  };
});

function renderPage() {
  return renderRoute(<DashboardPage />, { path: "/app" });
}

describe("DashboardPage", () => {
  it("shows real counts, subscription expiry and remaining platform allowance", async () => {
    mockApi();
    renderPage();

    const stats = await screen.findByRole("region", { name: "Your activity in numbers" });
    expect(within(stats).getByText("completed, of 3 started")).toBeInTheDocument();
    expect(within(stats).getByText("9")).toBeInTheDocument();
    expect(within(stats).getByText("3.6 / 5")).toBeInTheDocument();
    expect(screen.getByText(/active until 19 Nov 2026/)).toBeInTheDocument();
    // Daily limit remaining (50,000 limit, 4,000 used).
    expect(screen.getByText("46,000 of 50,000 left")).toBeInTheDocument();
  });

  it("keeps BYOK usage separate and labels its cost as the user's provider bill", async () => {
    mockApi();
    renderPage();

    const byokHeading = await screen.findByRole("heading", { name: "Your own API key" });
    const byokCard = byokHeading.closest("[data-slot='card']");
    expect(within(byokCard).getByText("Tokens this month")).toBeInTheDocument();
    expect(within(byokCard).getByText(/est\.\sUSD\s0\.026/)).toBeInTheDocument();
    expect(within(byokCard).getByText(/Billed to you by your provider/)).toBeInTheDocument();

    const platformCard = screen.getByRole("heading", { name: "Platform AI" }).closest("[data-slot='card']");
    // User-paid provider cost never appears with platform usage.
    expect(within(platformCard).queryByText(/USD/)).not.toBeInTheDocument();
  });

  it("renders progress charts from stored evaluations", async () => {
    mockApi();
    renderPage();

    expect(
      await screen.findByRole("img", { name: /Average score per interview, oldest to newest: 3.0, 4.0/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Communication 3.5/ })).toBeInTheDocument();
  });

  it("paginates recent activity", async () => {
    mockApi();
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText(/Answer feedback: Role 0/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText(/Answer feedback: Role 11/)).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Role 11/ })).toHaveAttribute("href", "/app/interviews/11");
  });

  it("offers report downloads for stored results", async () => {
    URL.createObjectURL = vi.fn(() => "blob:report");
    URL.revokeObjectURL = vi.fn();
    responses["/reports/analyses/3/pdf/"] = () => new Blob(["%PDF"]);
    mockApi();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Download report for Backend Engineer" }));

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        "/reports/analyses/3/pdf/",
        expect.objectContaining({ responseType: "blob" }),
      ),
    );
    expect(screen.getByRole("button", { name: "Download report for Product Manager" })).toBeInTheDocument();
  });

  it("shows honest empty states for a new account", async () => {
    responses["/dashboard/summary/"] = () => EMPTY_SUMMARY;
    responses["/dashboard/activity/"] = () => ({ count: 0, next: null, previous: null, results: [] });
    responses["/evaluations/summary/"] = () => ({ evaluation_count: 0, competencies: [], sessions: [] });
    responses["/interviews/"] = () => ({ count: 0, results: [] });
    responses["/resume-analyses/"] = () => ({ count: 0, results: [] });
    mockApi();
    renderPage();

    expect(await screen.findByText("No scored answers yet")).toBeInTheDocument();
    expect(screen.getByText("None yet")).toBeInTheDocument();
    expect(screen.getByText(/No subscription. Platform-paid allowances/)).toBeInTheDocument();
    expect(screen.getByText("No interviews yet")).toBeInTheDocument();
    expect(screen.getByText("No analyses yet")).toBeInTheDocument();
    expect(screen.getByText("Nothing yet")).toBeInTheDocument();
  });

  it("shows an error with retry when the summary fails", async () => {
    let calls = 0;
    responses["/dashboard/summary/"] = () => {
      calls += 1;
      if (calls === 1) throw new ApiError({ status: 500, code: "server_error", message: "Server error." });
      return makeSummary();
    };
    mockApi();
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Couldn't load your dashboard")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Try again" })[0]);

    expect(await screen.findByRole("region", { name: "Your activity in numbers" })).toBeInTheDocument();
  });
});
