import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";

/**
 * Administrator API (/admin/*). The server enforces administrator access on
 * every endpoint; these hooks only shape requests.
 */

function clean(params) {
  return Object.fromEntries(
    Object.entries(params ?? {}).filter(([, value]) => value !== "" && value !== null && value !== undefined),
  );
}

/** GET an admin endpoint. `params` are query parameters (empty values are dropped). */
export function useAdminQuery(path, params, { enabled = true } = {}) {
  const query = clean(params);
  return useQuery({
    queryKey: ["admin", path, query],
    queryFn: async () => (await apiClient.get(path, { params: query })).data,
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** A mutation against an admin endpoint. Refreshes admin data afterwards. */
export function useAdminMutation(request) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "plans"] });
    },
  });
}

export const adminApi = {
  patch: (path, body) => apiClient.patch(path, body).then((response) => response.data),
  post: (path, body, config) => apiClient.post(path, body ?? {}, config).then((response) => response.data),
};
