import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";

export const aiKeys = {
  access: ["ai", "access"],
  credentials: ["ai", "credentials"],
  preference: ["ai", "preference"],
};

/**
 * How the user can use AI right now: platform status, saved keys (masked),
 * enabled AI modes, usage and voice allowances. See AccessStatusView.
 */
export function useAccessStatus() {
  return useQuery({
    queryKey: aiKeys.access,
    queryFn: async () => (await apiClient.get("/ai/access/")).data,
  });
}

function useInvalidateAi() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["ai"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

// Saving and testing a key asks the provider, which can take a while.
const KEY_CHECK_TIMEOUT_MS = 30_000;

/** Add or replace the key for a provider. The backend tests it before storing it. */
export function useSaveCredential() {
  const invalidate = useInvalidateAi();
  return useMutation({
    mutationFn: async ({ provider, apiKey }) =>
      (
        await apiClient.post(
          "/ai/credentials/",
          { provider, api_key: apiKey },
          { timeout: KEY_CHECK_TIMEOUT_MS },
        )
      ).data,
    onSuccess: invalidate,
  });
}

/** Test the saved key again. A rejected key is marked invalid even though the request fails. */
export function useTestCredential() {
  const invalidate = useInvalidateAi();
  return useMutation({
    mutationFn: async (provider) =>
      (
        await apiClient.post(`/ai/credentials/${provider}/test/`, null, {
          timeout: KEY_CHECK_TIMEOUT_MS,
        })
      ).data,
    onSettled: invalidate,
  });
}

export function useDeleteCredential() {
  const invalidate = useInvalidateAi();
  return useMutation({
    mutationFn: (provider) => apiClient.delete(`/ai/credentials/${provider}/`),
    onSuccess: invalidate,
  });
}

/** Save default choices: billing_mode ("", "platform", "byok"), byok_provider, ai_mode. */
export function useUpdatePreference() {
  const invalidate = useInvalidateAi();
  return useMutation({
    mutationFn: async (values) => (await apiClient.patch("/ai/preference/", values)).data,
    onSuccess: invalidate,
  });
}

/** Request body fields for an explicit AI choice (see AIOptionsSerializer). */
export function aiOptionsPayload(options) {
  if (!options) return {};
  return {
    billing_mode: options.billingMode || null,
    ai_mode: options.aiMode || null,
    byok_provider: options.billingMode === "byok" ? options.byokProvider || null : null,
  };
}
