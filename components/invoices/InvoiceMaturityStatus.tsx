"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { isExpired } from "@/components/marketplace";

interface InvoiceMaturityStatusProps {
  /** Settlement maturity date for a funded invoice (issue #314). May be
   * absent if the backend hasn't started populating it yet — renders
   * nothing in that case rather than showing a broken countdown. */
  maturityDate: string | null | undefined;
}

/**
 * Shows time remaining until a funded invoice's settlement maturity date, or
 * a "matured, settlement pending" banner once that date has passed.
 */
export function InvoiceMaturityStatus({
  maturityDate,
}: InvoiceMaturityStatusProps) {
  const hasMaturityDate = Boolean(maturityDate);
  const matured = hasMaturityDate && isExpired(maturityDate as string);
  const countdown = useCountdown(
    maturityDate ?? null,
    hasMaturityDate && !matured
  );

  if (!hasMaturityDate) return null;

  if (matured) {
    return (
      <div
        className="rounded-md border border-amber-200 bg-amber-50 p-4"
        data-testid="invoice-matured-banner"
      >
        <p className="text-sm font-medium text-amber-800">
          This invoice has matured
        </p>
        <p className="text-sm text-amber-700" data-testid="settlement-pending-label">
          Settlement pending — payout is being processed
        </p>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground" data-testid="maturity-countdown">
      Matures in {countdown.days}d {countdown.hours}h {countdown.minutes}m
    </p>
  );
}
