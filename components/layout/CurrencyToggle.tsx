"use client";

/**
 * Multi-currency display (#437)
 *
 * USD / XLM segmented toggle, used in the navbar and on the settings page.
 * It reads and writes the shared CurrencyProvider state, so switching here
 * re-renders every <Money /> on the page and the choice persists (the
 * provider saves it to localStorage).
 */

import { AlertTriangle } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { CURRENCIES, formatRate } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface CurrencyToggleProps {
  className?: string;
  /** Show the current rate next to the toggle (settings page). */
  showRate?: boolean;
}

export function CurrencyToggle({ className, showRate = false }: CurrencyToggleProps) {
  const { currency, setCurrency, rate, isStale, rateError, rateLoading } = useCurrency();
  const usdUnavailable = currency === "USD" && rate === null && !rateLoading;

  return (
    <div className={cn("flex items-center gap-2", className)} data-testid="currency-toggle">
      <div
        role="group"
        aria-label="Display currency"
        className="inline-flex h-8 items-center rounded-md border bg-muted/40 p-0.5"
      >
        {CURRENCIES.map((option) => {
          const active = currency === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => setCurrency(option)}
              data-testid={`currency-option-${option.toLowerCase()}`}
              className={cn(
                "h-full rounded px-2.5 font-mono text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>

      {showRate && rate !== null && (
        <span className="text-xs text-muted-foreground" data-testid="currency-rate">
          1 XLM ≈ {formatRate(rate)}
        </span>
      )}

      {(isStale || usdUnavailable || (rateError && rate === null)) && (
        <span
          className="text-amber-500"
          title={
            isStale
              ? "Exchange rate may be stale"
              : "Exchange rate unavailable — values are shown in XLM"
          }
          data-testid="stale-rate-indicator"
        >
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">
            {isStale ? "Exchange rate may be stale" : "Exchange rate unavailable"}
          </span>
        </span>
      )}
    </div>
  );
}
