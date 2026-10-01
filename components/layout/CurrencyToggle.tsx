"use client";

import { useCurrency, type Currency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function CurrencyToggle() {
  const { currency, toggleCurrency, rate, isStale } = useCurrency();

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleCurrency}
        className="h-8 px-2 text-xs font-mono"
        data-testid="currency-toggle"
        aria-label={`Switch to ${currency === "XLM" ? "USD" : "XLM"}`}
      >
        {currency === "XLM" ? "XLM" : "USD"}
      </Button>
      {rate !== null && (
        <span
          className="text-xs text-muted-foreground font-mono"
          data-testid="currency-rate"
        >
          1 XLM = ${rate.toFixed(4)}
        </span>
      )}
      {isStale && (
        <span
          className="text-amber-500"
          title="Exchange rate may be stale"
          data-testid="stale-rate-indicator"
        >
          <AlertTriangle className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}
