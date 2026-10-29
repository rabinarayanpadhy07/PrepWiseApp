import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "@/lib/api/client";
import BillingPage from "@/pages/app/billing-page";
import { makeUsage } from "@/test/fixtures";
import { renderRoute } from "@/test/render";

const PLAN = {
  code: "platform-30-day",
  name: "Platform AI · 30 days",
  currency: "INR",
  price_minor: 500000,
  duration_days: 30,
  renewal_mode: "manual",
  version: 1,
};

const ORDER = {
  id: "0b9f3c1e-0000-4000-8000-000000000001",
  status: "created",
  amount_minor: 500000,
  currency: "INR",
  gateway: "razorpay",
  plan: { code: PLAN.code, name: PLAN.name, version: 1, duration_days: 30 },
  subscription: null,
  invoice: null,
  checkout: {
    key_id: "rzp_test_public",
    gateway_order_id: "order_abc",
    amount: 500000,
    currency: "INR",
    name: "PrepWise",
    description: "Platform AI · 30 days (30 days)",
    prefill: { name: "Test User", email: "user@example.com" },
  },
  created_at: "2026-10-27T10:00:00Z",
  paid_at: null,
};

const PAID_ORDER = {
  ...ORDER,
  status: "paid",
  checkout: null,
  paid_at: "2026-10-27T10:01:00Z",
  subscription: {
    id: 5,
    status: "active",
    starts_at: "2026-10-27T10:01:00Z",
    ends_at: "2026-11-26T10:01:00Z",
    revoke_reason: "",
  },
  invoice: { id: 31, number: "PW-2026-000031", issued_at: "2026-10-27T10:01:00Z" },
};

const CHECKOUT_RESPONSE = {
  razorpay_order_id: "order_abc",
  razorpay_payment_id: "pay_123",
  razorpay_signature: "signed-by-gateway",
};

function subscriptionStatus(overrides = {}) {
  return { status: "none", current: null, upcoming: [], history: [], payments_enabled: true, ...overrides };
}

let history;

function mockApi({ status = subscriptionStatus(), orderAfterVerify = null } = {}) {
  vi.spyOn(apiClient, "get").mockImplementation(async (url, config) => {
    if (url === "/billing/subscription/") return { data: status };
    if (url === "/billing/plans/") return { data: { count: 1, results: [PLAN] } };
    if (url === "/payments/history/") return { data: history(config?.params?.page ?? 1) };
    if (url === `/payments/orders/${ORDER.id}/`) return { data: orderAfterVerify ?? ORDER };
    if (url.endsWith("/pdf/")) {
      return {
        data: new Blob(["%PDF-1.4"], { type: "application/pdf" }),
        headers: { "content-disposition": 'attachment; filename="PW-2026-000031.pdf"' },
      };
    }
    throw new Error(`Unexpected GET ${url}`);
  });
}

/** Stand-in for Razorpay Checkout: the test decides what the user does. */
function installCheckout(behaviour) {
  const instances = [];
  window.Razorpay = vi.fn(function Razorpay(options) {
    const handlers = {};
    const instance = {
      options,
      on: (event, callback) => (handlers[event] = callback),
      open: () => behaviour({ options, handlers }),
    };
    instances.push(instance);
    return instance;
  });
  return instances;
}

beforeEach(() => {
  history = () => ({ count: 0, next: null, previous: null, results: [] });
  URL.createObjectURL = vi.fn(() => "blob:invoice");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  delete window.Razorpay;
  vi.useRealTimers();
});

function renderPage() {
  return renderRoute(<BillingPage />, { path: "/app/billing" });
}

describe("BillingPage checkout", () => {
  it("activates only after the backend verifies the payment", async () => {
    mockApi();
    const post = vi.spyOn(apiClient, "post").mockImplementation(async (url) => {
      if (url === "/payments/orders/") return { data: ORDER };
      if (url === `/payments/orders/${ORDER.id}/verify/`) return { data: PAID_ORDER };
      throw new Error(`Unexpected POST ${url}`);
    });
    const instances = installCheckout(({ options }) => options.handler(CHECKOUT_RESPONSE));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Buy now" }));

    expect(await screen.findByText("Payment confirmed")).toBeInTheDocument();
    // Only the plan is sent; the server sets the price.
    expect(post).toHaveBeenNthCalledWith(1, "/payments/orders/", { plan_code: PLAN.code });
    expect(post).toHaveBeenNthCalledWith(2, `/payments/orders/${ORDER.id}/verify/`, CHECKOUT_RESPONSE);
    expect(instances[0].options).toMatchObject({
      key: "rzp_test_public",
      order_id: "order_abc",
      amount: 500000,
      currency: "INR",
    });
  });

  it("doesn't claim success while the payment is unconfirmed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockApi();
    vi.spyOn(apiClient, "post").mockImplementation(async (url) => {
      if (url === "/payments/orders/") return { data: ORDER };
      // Signature fine but the payment isn't captured yet.
      return { data: ORDER };
    });
    installCheckout(({ options }) => options.handler(CHECKOUT_RESPONSE));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Buy now" }));
    expect((await screen.findAllByText(/Confirming your payment/)).length).toBeGreaterThan(0);
    await act(() => vi.advanceTimersByTimeAsync(31_000));

    expect(await screen.findByText("We haven't confirmed this payment yet")).toBeInTheDocument();
    expect(screen.queryByText("Payment confirmed")).not.toBeInTheDocument();
  });

  it("picks up a confirmation that arrives through the webhook", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockApi({ orderAfterVerify: PAID_ORDER });
    vi.spyOn(apiClient, "post").mockImplementation(async (url) => {
      if (url === "/payments/orders/") return { data: ORDER };
      throw new ApiError({ code: "network_error", message: "Network down" });
    });
    installCheckout(({ options }) => options.handler(CHECKOUT_RESPONSE));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Buy now" }));
    await act(() => vi.advanceTimersByTimeAsync(3_500));

    expect(await screen.findByText("Payment confirmed")).toBeInTheDocument();
  });

  it("reports a rejected verification without activating", async () => {
    mockApi();
    vi.spyOn(apiClient, "post").mockImplementation(async (url) => {
      if (url === "/payments/orders/") return { data: ORDER };
      throw new ApiError({
        status: 400,
        code: "payment_verification_failed",
        message: "We couldn't verify this payment. If you were charged, contact support.",
      });
    });
    installCheckout(({ options }) => options.handler(CHECKOUT_RESPONSE));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Buy now" }));

    expect(await screen.findByText("The payment couldn't be completed")).toBeInTheDocument();
    expect(screen.getByText(/couldn't verify this payment/)).toBeInTheDocument();
    expect(screen.queryByText("Payment confirmed")).not.toBeInTheDocument();
  });

  it("treats a closed payment window as cancelled and never verifies", async () => {
    mockApi();
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({ data: ORDER });
    installCheckout(({ options }) => options.modal.ondismiss());
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Buy now" }));

    expect(await screen.findByText("Payment cancelled")).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("shows the gateway's reason when a payment fails", async () => {
    mockApi();
    vi.spyOn(apiClient, "post").mockResolvedValue({ data: ORDER });
    installCheckout(({ options, handlers }) => {
      handlers["payment.failed"]({ error: { description: "Your bank declined the payment." } });
      options.modal.ondismiss();
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Buy now" }));

    expect(await screen.findByText("The payment didn't go through")).toBeInTheDocument();
    expect(screen.getByText("Your bank declined the payment.")).toBeInTheDocument();
  });

  it("explains when online payment is unavailable", async () => {
    mockApi({ status: subscriptionStatus({ payments_enabled: false }) });
    renderPage();

    expect(await screen.findByText(/Online payment isn't available right now/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Buy now" })).not.toBeInTheDocument();
  });
});

describe("BillingPage status and history", () => {
  it("shows an active subscription with manual renewal and usage", async () => {
    mockApi({
      status: subscriptionStatus({
        status: "active",
        current: {
          id: 5,
          plan_name: PLAN.name,
          starts_at: "2026-10-20T10:00:00Z",
          ends_at: "2026-11-19T10:00:00Z",
          usage: makeUsage({ dailyTokens: 50_000 }),
        },
        upcoming: [{ id: 6, starts_at: "2026-11-19T10:00:00Z", ends_at: "2026-12-19T10:00:00Z" }],
      }),
    });
    renderPage();

    expect(await screen.findByText(/It doesn't renew automatically/)).toBeInTheDocument();
    expect(screen.getByText(/Next period: 19 Nov 2026 to 19 Dec 2026/)).toBeInTheDocument();
    expect(screen.getByText("46,000 of 50,000 left")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Buy another period" })).toBeInTheDocument();
  });

  it("explains a revoked subscription", async () => {
    mockApi({
      status: subscriptionStatus({
        status: "revoked",
        history: [
          {
            id: 5,
            ends_at: "2026-11-19T10:00:00Z",
            revoked_at: "2026-10-25T10:00:00Z",
            revoke_reason: "Payment refunded in full",
          },
        ],
      }),
    });
    renderPage();

    expect(await screen.findByText(/Payment refunded in full/)).toBeInTheDocument();
  });

  it("lists payments, refunds and downloads an invoice", async () => {
    history = (page) => ({
      count: 12,
      next: page === 1 ? "next" : null,
      previous: null,
      results: [
        {
          ...PAID_ORDER,
          id: `order-${page}`,
          payments: [
            {
              gateway_payment_id: "pay_123",
              status: "partially_refunded",
              amount_minor: 500000,
              currency: "INR",
              amount_refunded_minor: 100000,
              dispute_status: "",
              refunds: [],
            },
          ],
        },
      ],
    });
    mockApi();
    const user = userEvent.setup();
    renderPage();

    const table = await screen.findByRole("table", { name: "Payment history" });
    expect(within(table).getByText("Paid")).toBeInTheDocument();
    expect(within(table).getByText(/Refunded ₹1,000/)).toBeInTheDocument();

    await user.click(within(table).getByRole("button", { name: "Download invoice PW-2026-000031" }));
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        "/payments/invoices/31/pdf/",
        expect.objectContaining({ responseType: "blob" }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        "/payments/history/",
        expect.objectContaining({ params: { page: 2, page_size: 10 } }),
      ),
    );
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });
});
