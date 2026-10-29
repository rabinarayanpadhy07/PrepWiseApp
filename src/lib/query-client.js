import { QueryClient } from "@tanstack/react-query";

const MAX_RETRIES = 2;

function shouldRetry(failureCount, error) {
  // Client errors (4xx) will not succeed on retry.
  if (error?.status && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
