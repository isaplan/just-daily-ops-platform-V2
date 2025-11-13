/**
 * React Query Retry Configuration Utilities
 * Shared retry patterns for network error handling with exponential backoff
 */

import { isNetworkError } from "@/lib/services/finance/eitje-data-imported.service";

/**
 * Default retry configuration for network errors
 * Uses exponential backoff: 1s, 2s, 4s (max 4s)
 */
export function getNetworkRetryConfig() {
  return {
    retry: (failureCount: number, error: unknown) => {
      // Retry more for network errors
      if (isNetworkError(error)) {
        return failureCount < 3;
      }
      return failureCount < 1;
    },
    retryDelay: (attemptIndex: number) => {
      // Exponential backoff: 1s, 2s, 4s (capped at 4s)
      return Math.min(1000 * Math.pow(2, attemptIndex), 4000);
    },
  };
}

/**
 * Standard retry configuration (1 attempt for non-network errors)
 */
export function getStandardRetryConfig() {
  return {
    retry: 1,
    retryDelay: 1000,
  };
}

/**
 * Aggressive retry configuration (5 attempts for critical operations)
 */
export function getAggressiveRetryConfig() {
  return {
    retry: (failureCount: number, error: unknown) => {
      if (isNetworkError(error)) {
        return failureCount < 5;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex: number) => {
      return Math.min(1000 * Math.pow(2, attemptIndex), 8000);
    },
  };
}

