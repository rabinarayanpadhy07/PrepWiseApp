import { formatDateTime, formatDuration, formatNumber } from "@/lib/format";

/** Metered kinds, in display order. Keys match the backend's usage kinds. */
export const USAGE_KINDS = [
  { key: "ai_tokens", label: "Platform AI tokens", format: formatNumber },
  { key: "interview", label: "Mock interviews", format: formatNumber },
  { key: "voice_seconds", label: "Voice answer time", format: formatDuration },
];

const PROVIDER_LABELS = { anthropic: "Anthropic", openai: "OpenAI", gemini: "Google Gemini" };

export function providerLabel(provider) {
  return PROVIDER_LABELS[provider] ?? provider;
}

/** Describe a usage-limit error's `limit` object ({ kind, scope, limit, used, requested, resets_at }). */
export function describeLimit(limit) {
  if (!limit) return null;
  const kind = USAGE_KINDS.find((item) => item.key === limit.kind);
  const format = kind?.format ?? formatNumber;
  const scope = limit.scope === "daily" ? "today" : "this period";
  let resets = "";
  if (limit.resets_at) {
    resets =
      limit.scope === "daily"
        ? ` It resets at ${formatDateTime(limit.resets_at)}.`
        : ` Your current period ends ${formatDateTime(limit.resets_at)}.`;
  }
  return `Used ${format(limit.used)} of ${format(limit.limit)} ${scope}; this request needs up to ${format(limit.requested)}.${resets}`;
}
