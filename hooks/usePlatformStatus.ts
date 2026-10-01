"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPlatformStatus } from "@/lib/platformStatus";

/** Status data refreshes every 60 seconds (issue #425). */
export const PLATFORM_STATUS_POLL_INTERVAL_MS = 60 * 1000;

export function usePlatformStatus() {
  return useQuery({
    queryKey: ["platform-status"],
    queryFn: ({ signal }) => fetchPlatformStatus(signal),
    refetchInterval: PLATFORM_STATUS_POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
    // Keep the previous grid on screen while the 60s refresh lands so the
    // page never collapses to skeletons (no layout shift).
    placeholderData: (previous) => previous,
    staleTime: 30 * 1000,
  });
}
