"use client";

/**
 * Multi-currency display (#437)
 *
 * Page-level disclaimer placed near blocks of converted values. It is only
 * rendered when it's relevant:
 *  - USD shown   → the full rate disclaimer (estimate, rate, source, time,
 *                  settles in XLM, plus a stale warning if applicable).
 *  - USD chosen but no rate available → says values are still in XLM.
 *  - XLM         → nothing (values are shown in their native unit).
 */

import { useCurrency } from "@/hooks/useCurrency";
import { describeExchangeRate } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function ExchangeRateDisclaimer({ className }: { className?: string }) {
  const { currency, isConverted, exchangeRate, rateLoading, isStale } = useCurrency();

  if (currency !== "USD") return null;

  if (!isConverted || !exchangeRate) {
    return (
      <p
        role="status"
        data-testid="exchange-rate-unavailable"
        className={cn("text-xs text-muted-foreground", className)}
      >
        {rateLoading
          ? "Loading the XLM/USD exchange rate… values are shown in XLM until it arrives."
          : "The XLM/USD exchange rate is unavailable right now, so values are shown in XLM."}
      </p>
    );
  }

  return (
    <p
      role="note"
      data-testid="exchange-rate-disclaimer"
      className={cn(
        "text-xs",
        isStale ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
        className,
      )}
    >
      * {describeExchangeRate(exchangeRate)}
    </p>
  );
}
