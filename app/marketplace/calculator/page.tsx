"use client";

import { YieldCalculator } from "@/components/marketplace/YieldCalculator";
import { usePageTitle } from "@/hooks/usePageTitle";

/**
 * Standalone yield calculator tool (issue #423).
 *
 * Lets investors model gross / net returns for any amount and tenor before
 * committing to a specific invoice.
 */
export default function YieldCalculatorPage() {
  usePageTitle("Yield Calculator");

  return (
    <main className="container mx-auto px-4 py-8 pb-24 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Yield Calculator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Model returns for any investment amount, yield rate and tenor.
        </p>
      </header>
      <YieldCalculator />
    </main>
  );
}
