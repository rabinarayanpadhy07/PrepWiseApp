import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "@/lib/api/client";
import AdminLayout from "@/pages/app/admin/admin-layout";
import AdminAIPage from "@/pages/app/admin/ai-page";
import AdminPaymentsPage from "@/pages/app/admin/payments-page";
import AdminPlansPage from "@/pages/app/admin/plans-page";
import AdminUsagePage from "@/pages/app/admin/usage-page";
import AdminUsersPage from "@/pages/app/admin/users-page";
import { makeAuth, renderRoute, testUser } from "@/test/render";

const ADMIN = makeAuth({ user: { ...testUser, id: 99, email: "admin@example.com", role: "admin" }, isAdmin: true });

function mockGet(routes) {
  return vi.spyOn(apiClient, "get").mockImplementation(async (url, config) => {
    const handler = routes[url];
    if (!handler) throw new Error(`Unexpected GET ${url}`);
    return { data: typeof handler === "function" ? handler(config?.params ?? {}) : handler };
  });
}

function page(results, count = results.length) {
  return { count, next: null, previous: null, results };
}

const USER = {
  id: 5,
  email: "member@example.com",
  full_name: "Member",
  role: "user",
  is_active: true,
  date_joined: "2026-10-01T10:00:00Z",
  last_login: null,
  sessions_revoked_at: null,
  has_byok_key: true,
  subscription_ends_at: "2026-11-20T10:00:00Z",
};

describe("Admin access", () => {
  it("shows normal users an access message and never calls admin APIs", async () => {
    const get = vi.spyOn(apiClient, "get");
    renderRoute(<AdminLayout />, { path: "/app/admin", auth: makeAuth() });

    expect(await screen.findByText("Administrator access required")).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it("surfaces a server-side 403 instead of showing data", async () => {
    vi.spyOn(apiClient, "get").mockRejectedValue(
      new ApiError({ status: 403, code: "permission_denied", message: "Administrator access is required." }),
    );
    renderRoute(<AdminUsersPage />, { path: "/app/admin/users", auth: ADMIN });

    expect(await screen.findByText("Administrator access is required.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("AdminUsersPage", () => {
  it("suspends a user with a required reason", async () => {
    mockGet({ "/admin/users/": page([USER, { ...USER, id: 99, email: "admin@example.com", role: "admin" }]) });
    const patch = vi.spyOn(apiClient, "patch").mockResolvedValue({ data: { ...USER, is_active: false } });
    const user = userEvent.setup();
    renderRoute(<AdminUsersPage />, { path: "/app/admin/users", auth: ADMIN });

    const row = (await screen.findByText("member@example.com")).closest("tr");
    expect(within(screen.getByText("admin@example.com").closest("tr")).getByText("You")).toBeInTheDocument();
    await user.click(within(row).getByRole("button", { name: "Actions for member@example.com" }));
    await user.click(await screen.findByRole("menuitem", { name: "Suspend" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Suspend" }));
    expect(within(dialog).getByText("Enter a reason.")).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(/Reason/), "Abuse report");
    await user.click(within(dialog).getByRole("button", { name: "Suspend" }));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/admin/users/5/", { is_active: false, reason: "Abuse report" }),
    );
  });

  it("paginates and filters through the API", async () => {
    const get = mockGet({ "/admin/users/": (params) => page([{ ...USER, email: `page${params.page}@example.com` }], 45) });
    const user = userEvent.setup();
    renderRoute(<AdminUsersPage />, { path: "/app/admin/users", auth: ADMIN });

    await screen.findByText("page1@example.com");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("page2@example.com")).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    expect(get).toHaveBeenLastCalledWith("/admin/users/", { params: { page: 2 } });
  });
});

const PLAN = {
  code: "platform-30-day",
  name: "Platform AI · 30 days",
  description: "",
  currency: "INR",
  price_minor: 500000,
  duration_days: 30,
  renewal_mode: "manual",
  ai_token_quota: 3000000,
  daily_ai_token_limit: null,
  interview_quota: 60,
  daily_interview_limit: null,
  voice_seconds_quota: 18000,
  daily_voice_seconds_limit: null,
  is_active: true,
  display_order: 0,
  versions: [{ version: 1, name: "Platform AI · 30 days", currency: "INR", price_minor: 500000, duration_days: 30, interview_quota: 60, created_at: "2026-10-01T10:00:00Z" }],
  updated_at: "2026-10-01T10:00:00Z",
};

describe("AdminPlansPage", () => {
  it("sends only changed fields, with the price in paise", async () => {
    mockGet({ "/admin/plans/": [PLAN] });
    const patch = vi.spyOn(apiClient, "patch").mockResolvedValue({ data: PLAN });
    const user = userEvent.setup();
    renderRoute(<AdminPlansPage />, { path: "/app/admin/plans", auth: ADMIN });

    const price = await screen.findByLabelText("Price (INR)");
    await user.clear(price);
    await user.type(price, "6500");
    const days = screen.getByLabelText("Duration (days)");
    await user.clear(days);
    await user.type(days, "45");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/₹6,500 for 45 days. Existing purchases keep their terms./)).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/Reason/), "New pricing");
    await user.click(within(dialog).getByRole("button", { name: "Save plan" }));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/admin/plans/platform-30-day/", {
        price_minor: 650000,
        duration_days: 45,
        reason: "New pricing",
      }),
    );
  });
});

describe("AdminAIPage", () => {
  it("shows server validation errors for platform limits", async () => {
    mockGet({
      "/admin/ai/providers/": [{ provider: "anthropic", label: "Anthropic (Claude)", platform_key_configured: true, models: 0 }],
      "/admin/ai/models/": [],
      "/admin/ai/modes/": [],
      "/admin/ai/settings/": {
        cost_currency: "USD",
        monthly_spend_cap: null,
        voice_max_answer_seconds: 180,
        byok_daily_voice_seconds: 3600,
        byok_daily_interviews: null,
        reservation_ttl_seconds: 600,
        updated_at: "2026-10-01T10:00:00Z",
      },
    });
    vi.spyOn(apiClient, "patch").mockRejectedValue(
      new ApiError({
        status: 400,
        code: "validation_error",
        message: "Some fields are invalid.",
        details: { reservation_ttl_seconds: ["Must be longer than the AI request timeout (120 seconds)."] },
      }),
    );
    const user = userEvent.setup();
    renderRoute(<AdminAIPage />, { path: "/app/admin/ai", auth: ADMIN });

    expect(await screen.findByText("Platform key configured")).toBeInTheDocument();
    expect(screen.queryByText(/test-platform/)).not.toBeInTheDocument();
    const ttl = screen.getByLabelText("Reservation hold (seconds)");
    await user.clear(ttl);
    await user.type(ttl, "60");
    await user.click(screen.getByRole("button", { name: "Save limits" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Reason/), "Tuning");
    await user.click(within(dialog).getByRole("button", { name: "Save limits" }));

    expect(await within(dialog).findByText(/Must be longer than the AI request timeout/)).toBeInTheDocument();
  });
});

describe("AdminUsagePage", () => {
  it("reports platform and own-key usage separately", async () => {
    mockGet({
      "/admin/usage/summary/": {
        window: { days: 30 },
        cost_currency: "USD",
        platform: { calls: 3, tokens: 6000, input_tokens: 4000, output_tokens: 2000, estimated_cost: "0.078", interviews: 1, voice_seconds: 60 },
        byok: { calls: 2, tokens: 4000, input_tokens: 2000, output_tokens: 2000, estimated_cost: "0.05", interviews: 1, voice_seconds: 0 },
        by_model: [{ source: "byok", provider: "openai", model: "model-x", calls: 2, tokens: 4000, estimated_cost: "0.05" }],
        by_feature: [],
        daily: [{ day: "2026-10-26", platform_tokens: 6000, byok_tokens: 4000, platform_estimated_cost: "0.078" }],
        budget: { monthly_spend_cap: "100.00", estimated_spend_this_month: "0.078" },
      },
      "/admin/usage/users/": page([]),
      "/admin/ai/settings/": { cost_currency: "USD" },
    });
    renderRoute(<AdminUsagePage />, { path: "/app/admin/usage", auth: ADMIN });

    expect(await screen.findByText("Platform-paid tokens")).toBeInTheDocument();
    expect(screen.getByText("Platform-paid tokens").parentElement).toHaveTextContent("6,000");
    expect(screen.getByText("2 calls, paid by users")).toBeInTheDocument();
    expect(screen.getByText("User (own key)")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Platform-paid total 6,000, own-key total 4,000/ })).toBeInTheDocument();
  });
});

describe("AdminPaymentsPage", () => {
  it("refunds a payment with an amount and reason", async () => {
    const order = {
      id: "o1",
      user_id: 5,
      user_email: "member@example.com",
      plan_name: "Platform AI · 30 days",
      plan_version: 1,
      amount_minor: 500000,
      currency: "INR",
      status: "paid",
      invoice: { id: 7, number: "PW-2026-000007" },
      payments: [{ gateway_payment_id: "pay_1", status: "captured", currency: "INR", amount_minor: 500000, amount_refunded_minor: 0, refundable_minor: 500000, is_duplicate: false, dispute_status: "" }],
      created_at: "2026-10-20T10:00:00Z",
      paid_at: "2026-10-20T10:01:00Z",
    };
    mockGet({ "/admin/payments/orders/": page([order]) });
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({ data: order });
    const user = userEvent.setup();
    renderRoute(<AdminPaymentsPage />, { path: "/app/admin/payments", auth: ADMIN });

    await user.click(await screen.findByRole("button", { name: "Refund" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/revokes the subscription/)).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/Amount/), "1000");
    expect(within(dialog).getByText(/The subscription stays active/)).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/Reason/), "Goodwill");
    await user.click(within(dialog).getByRole("button", { name: "Refund" }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        "/admin/payments/payments/pay_1/refund/",
        { amount_minor: 100000, reason: "Goodwill" },
        undefined,
      ),
    );
  });
});
