import { useRef } from "react";

/** A random UUID v4. randomUUID is missing outside secure contexts (plain HTTP on a LAN IP). */
export function newIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * A client-generated key for one user action that calls an AI provider or
 * starts a payment. The server returns the first result for a repeated key,
 * so retrying after a timeout or lost connection never pays twice.
 *
 * Keep the key while the outcome is unknown (network error, timeout); start a
 * new one once the server has answered.
 */
export function useIdempotencyKey() {
  const ref = useRef(null);
  if (ref.current === null) ref.current = newIdempotencyKey();
  return {
    get current() {
      return ref.current;
    },
    /** Pass as onError: rotates the key only if the server responded. */
    rotateAfter(error) {
      if (error?.status) ref.current = newIdempotencyKey();
    },
    rotate() {
      ref.current = newIdempotencyKey();
    },
  };
}
