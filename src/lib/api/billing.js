import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";

export const billingKeys = {
  plans: ["billing", "plans"],
  subscription: ["billing", "subscription"],
  history: (page) => ["billing", "history", page],
  order: (id) => ["billing", "order", id],
};

export async function fetchPlans() {
  const { data } = await apiClient.get("/billing/plans/");
  return data.results;
}

export function usePlans() {
  return useQuery({
    queryKey: billingKeys.plans,
    queryFn: fetchPlans,
    staleTime: 5 * 60 * 1000,
  });
}

/** Current subscription with usage, queued renewals and past periods. */
export function useSubscriptionStatus() {
  return useQuery({
    queryKey: billingKeys.subscription,
    queryFn: async () => (await apiClient.get("/billing/subscription/")).data,
  });
}

export function usePaymentHistory(page = 1) {
  return useQuery({
    queryKey: billingKeys.history(page),
    queryFn: async () =>
      (await apiClient.get("/payments/history/", { params: { page, page_size: 10 } })).data,
    placeholderData: (previous) => previous,
  });
}

/** Create a gateway order. Only the plan is sent; the server sets the price. */
export async function createOrder(planCode) {
  return (await apiClient.post("/payments/orders/", { plan_code: planCode })).data;
}

/** Send the Checkout handler's response for server-side verification. */
export async function verifyOrder(orderId, checkoutResponse) {
  return (
    await apiClient.post(`/payments/orders/${orderId}/verify/`, {
      razorpay_order_id: checkoutResponse.razorpay_order_id,
      razorpay_payment_id: checkoutResponse.razorpay_payment_id,
      razorpay_signature: checkoutResponse.razorpay_signature,
    })
  ).data;
}

export async function fetchOrder(orderId) {
  return (await apiClient.get(`/payments/orders/${orderId}/`)).data;
}

export function useInvalidateBilling() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["billing"] });
    queryClient.invalidateQueries({ queryKey: ["ai", "access"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function useCreateOrder() {
  return useMutation({ mutationFn: createOrder });
}
