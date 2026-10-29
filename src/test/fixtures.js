/** API response fixtures shaped like the backend serializers. */

export function usageWindow(limit, used = 0, extra = {}) {
  return { limit, used, in_progress: 0, remaining: Math.max(limit - used, 0), ...extra };
}

export function makeUsage({ dailyTokens = null } = {}) {
  return {
    ai_tokens: {
      period: usageWindow(3_000_000, 4_000),
      daily: dailyTokens
        ? { ...usageWindow(dailyTokens, 4_000), resets_at: "2026-10-28T00:00:00+05:30" }
        : null,
    },
    interview: { period: usageWindow(60, 1), daily: null },
    voice_seconds: { period: usageWindow(18_000, 0), daily: null },
  };
}

export function makeByokUsage({ tokens = 0, cost = null } = {}) {
  const rows = tokens
    ? [
        {
          provider: "anthropic",
          tokens,
          input_tokens: tokens / 2,
          output_tokens: tokens / 2,
          estimated_cost: cost,
          cost_currency: cost === null ? null : "USD",
        },
      ]
    : [];
  return {
    today: { tokens, by_provider: rows },
    month: { tokens, by_provider: rows },
    interviews_today: { limit: null, used: 0, remaining: null },
    voice_today: { limit: 3600, used: 0, remaining: 3600 },
    resets_at: "2026-10-28T00:00:00+05:30",
  };
}

export const MODES = [
  {
    key: "fast",
    label: "Fast",
    description: "Quickest responses at the lowest cost.",
    platform: true,
    byok_providers: ["anthropic", "openai"],
    byok_with_saved_key: [],
  },
  {
    key: "advanced",
    label: "Advanced",
    description: "The most thorough analysis and feedback.",
    platform: true,
    byok_providers: ["anthropic"],
    byok_with_saved_key: [],
  },
];

export const PROVIDERS = [
  { provider: "anthropic", label: "Anthropic (Claude)", has_key: false },
  { provider: "openai", label: "OpenAI", has_key: false },
  { provider: "gemini", label: "Google Gemini", has_key: false },
];

export function makeCredential(overrides = {}) {
  return {
    provider: "anthropic",
    provider_label: "Anthropic (Claude)",
    masked_key: "••••WXYZ",
    key_hint: "WXYZ",
    status: "active",
    created_at: "2026-10-20T10:00:00Z",
    updated_at: "2026-10-20T10:00:00Z",
    last_verified_at: "2026-10-20T10:00:00Z",
    last_used_at: null,
    ...overrides,
  };
}

/** /ai/access/ for a user with the given subscription and saved keys. */
export function makeAccess({ subscribed = false, credentials = [], preference = {} } = {}) {
  const saved = credentials.map((credential) => credential.provider);
  return {
    platform_status: subscribed ? "available" : "subscription_required",
    byok_available: credentials.length > 0,
    billing_choice_required: subscribed && credentials.length > 0 && !preference.billing_mode,
    preference: { billing_mode: "", byok_provider: "", ai_mode: "fast", ...preference },
    default_mode: "fast",
    modes: MODES.map((mode) => ({
      ...mode,
      byok_with_saved_key: mode.byok_providers.filter((provider) => saved.includes(provider)),
    })),
    providers: PROVIDERS.map((item) => ({ ...item, has_key: saved.includes(item.provider) })),
    credentials,
    subscription: subscribed
      ? {
          id: 3,
          plan_code: "platform-30-day",
          plan_name: "Platform AI · 30 days",
          source: "payment",
          starts_at: "2026-10-20T10:00:00Z",
          ends_at: "2026-11-19T10:00:00Z",
          usage: makeUsage(),
        }
      : null,
    byok_usage: makeByokUsage(),
    voice: {
      max_answer_seconds: 180,
      platform_remaining_seconds: subscribed ? 180 : 0,
      byok_remaining_seconds: credentials.length ? 180 : 0,
    },
  };
}
