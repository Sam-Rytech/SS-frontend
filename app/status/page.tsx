"use client";

import { PlatformStatus } from "@/components/status/PlatformStatus";
import { usePageTitle } from "@/hooks/usePageTitle";

/**
 * Public platform status page (issue #425).
 *
 * Health of Horizon API, IPFS/Pinata, KYC provider and backend API with
 * 30-day uptime, an incident log and email subscribe. Refreshes every 60s.
 */
export default function StatusPage() {
  usePageTitle("Platform Status");

  return (
    <main className="container mx-auto px-4 py-8 pb-24 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Platform Status</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live health of StellarSettle services and recent incidents.
        </p>
      </header>
      <PlatformStatus />
    </main>
  );
}
