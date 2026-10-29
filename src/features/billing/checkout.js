import { useCallback, useRef, useState } from "react";

import { createOrder, fetchOrder, useInvalidateBilling, verifyOrder } from "@/lib/api/billing";
import { toApiError } from "@/lib/api/client";

// Razorpay's official Checkout script. It collects payment details itself, so
// card or UPI data never passes through PrepWise.
const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
const CONFIRM_POLL_MS = 3_000;
const CONFIRM_ATTEMPTS = 10;

let scriptPromise = null;

export function loadCheckoutScript() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error("The payment window couldn't be loaded. Check your connection and try again."));
    };
    document.head.append(script);
  });
  return scriptPromise;
}

/** Open Checkout for a backend-created order. Resolves with the outcome; never rejects on cancel. */
function openCheckout(Razorpay, order) {
  const { checkout } = order;
  return new Promise((resolve) => {
    let settled = false;
    // A failed attempt keeps the window open so the user can try again; remember
    // the latest reason in case they then close it.
    let lastFailure = null;
    const finish = (result) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    const instance = new Razorpay({
      key: checkout.key_id,
      order_id: checkout.gateway_order_id,
      amount: checkout.amount,
      currency: checkout.currency,
      name: checkout.name,
      description: checkout.description,
      prefill: checkout.prefill,
      handler: (response) => finish({ outcome: "submitted", response }),
      modal: {
        ondismiss: () =>
          finish(lastFailure ? { outcome: "failed", reason: lastFailure } : { outcome: "dismissed" }),
      },
    });
    instance.on("payment.failed", (event) => {
      lastFailure = event?.error?.description || "The payment didn't go through.";
    });
    instance.open();
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Purchase flow. `state.step` is one of:
 *   idle, starting, paying, verifying, confirming, paid, unconfirmed, cancelled, error
 * "paid" is set only when the backend reports the order as paid; "unconfirmed"
 * means the payment may still be confirmed by the gateway later.
 */
export function useCheckout() {
  const invalidate = useInvalidateBilling();
  const [state, setState] = useState({ step: "idle" });
  const busy = useRef(false);

  const confirm = useCallback(async (orderId) => {
    for (let attempt = 0; attempt < CONFIRM_ATTEMPTS; attempt += 1) {
      await wait(CONFIRM_POLL_MS);
      try {
        const order = await fetchOrder(orderId);
        if (order.status === "paid") return order;
        if (order.status === "review") return order;
      } catch {
        // Keep polling; the final state is reported below.
      }
    }
    return null;
  }, []);

  const buy = useCallback(
    async (planCode) => {
      if (busy.current) return;
      busy.current = true;
      try {
        setState({ step: "starting" });
        const [order, Razorpay] = await Promise.all([createOrder(planCode), loadCheckoutScript()]);
        if (order.status === "paid") {
          setState({ step: "paid", order });
          return;
        }
        setState({ step: "paying", order });
        const result = await openCheckout(Razorpay, order);
        if (result.outcome !== "submitted") {
          setState({ step: "cancelled", order, reason: result.reason ?? null });
          return;
        }

        setState({ step: "verifying", order });
        let verified = null;
        try {
          verified = await verifyOrder(order.id, result.response);
        } catch (error) {
          const apiError = toApiError(error);
          // A definite rejection: the payment couldn't be verified for this order.
          if (apiError.status && apiError.status < 500) {
            setState({ step: "error", order, error: apiError });
            return;
          }
        }
        if (verified?.status === "paid") {
          setState({ step: "paid", order: verified });
          return;
        }
        // Not confirmed yet (e.g. not captured, or the network failed): the
        // gateway's webhook may still confirm it. Don't claim success.
        setState({ step: "confirming", order });
        const confirmed = await confirm(order.id);
        if (confirmed?.status === "paid") setState({ step: "paid", order: confirmed });
        else setState({ step: "unconfirmed", order: confirmed ?? order });
      } catch (error) {
        setState({ step: "error", error: toApiError(error) });
      } finally {
        busy.current = false;
        invalidate();
      }
    },
    [confirm, invalidate],
  );

  const reset = useCallback(() => setState({ step: "idle" }), []);

  return { state, buy, reset };
}
