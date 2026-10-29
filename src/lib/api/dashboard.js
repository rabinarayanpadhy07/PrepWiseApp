import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";

export const dashboardKeys = {
  summary: ["dashboard", "summary"],
  activity: (page) => ["dashboard", "activity", page],
};

/** Counts, subscription state, platform allowances and BYOK usage for the signed-in user. */
export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary,
    queryFn: async () => (await apiClient.get("/dashboard/summary/")).data,
  });
}

export function useActivity(page = 1) {
  return useQuery({
    queryKey: dashboardKeys.activity(page),
    queryFn: async () =>
      (await apiClient.get("/dashboard/activity/", { params: { page, page_size: 10 } })).data,
    placeholderData: (previous) => previous,
  });
}

export const reportUrls = {
  analysis: (id) => `/reports/analyses/${id}/pdf/`,
  interview: (id) => `/reports/interviews/${id}/pdf/`,
  invoice: (id) => `/payments/invoices/${id}/pdf/`,
};
