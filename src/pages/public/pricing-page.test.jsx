import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "@/lib/api/client";
import PricingPage from "@/pages/public/pricing-page";
import { renderRoute } from "@/test/render";

const plan = {
  code: "platform-30-day",
  name: "Platform AI · 30 days",
  description: "Use PrepWise's platform AI.",
  currency: "INR",
  price_minor: 500000,
  duration_days: 30,
  renewal_mode: "manual",
  ai_token_quota: 3000000,
  interview_quota: 60,
  voice_seconds_quota: 18000,
};

describe("PricingPage", () => {
  it("renders the plan returned by the backend", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({ data: { results: [plan] } });

    renderRoute(<PricingPage />);

    expect(await screen.findByText("₹5,000")).toBeInTheDocument();
    expect(screen.getByText("for 30 days")).toBeInTheDocument();
    expect(screen.getByText(/up to 60 mock interviews, 5 hr of voice answers/)).toBeInTheDocument();
    expect(
      screen.getByText("Manual renewal. No automatic recurring billing."),
    ).toBeInTheDocument();
  });

  it("shows an error with a retry action when plans cannot be loaded", async () => {
    vi.spyOn(apiClient, "get").mockRejectedValue(
      new ApiError({ code: "network_error", message: "We couldn't reach the PrepWise server." }),
    );

    renderRoute(<PricingPage />);

    expect(await screen.findByText("We couldn't load current pricing")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText(/₹/)).not.toBeInTheDocument();
  });
});
