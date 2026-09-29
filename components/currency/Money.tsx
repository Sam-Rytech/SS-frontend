"use client";

/**
 * Multi-currency display (#437)
 *
 * Renders an XLM-denominated amount in the user's display currency.
 *
 *  - XLM (or USD with no rate yet): renders exactly the text the call site
 *    used before (`xlmText`, default `formatXLM`) with no extra markup, so XLM
 *    screens look and test the same as before this feature.
 *  - USD: renders the converted value followed by an asterisk. The asterisk
 *    and the value's tooltip carry the exchange-rate disclaimer (rate,
 *    source, fetch time, "settles in XLM"), so every converted value has its
 *    disclaimer right next to it. Pages also show the full sentence once via
 *    <ExchangeRateDisclaimer />.
 */

import { useCurrency } from "@/hooks/useCurrency";
import { describeExchangeRate, formatUsd } from "@/lib/currency";
import { formatXLM } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MoneyProps {
  /** Amount in XLM (the unit every API value uses). */
  xlm: number | string | null | undefined;
  /** Exact text to show when displaying XLM; defaults to `formatXLM`. */
  xlmText?: string;
  className?: string;
}

export function Money({ xlm, xlmText, className }: MoneyProps) {
  const { isConverted, convert, exchangeRate } = useCurrency();
  const amount = Number(xlm ?? 0);

  if (!isConverted || !exchangeRate || !Number.isFinite(amount)) {
    return <>{xlmText ?? formatXLM(amount)}</>;
  }

  const disclaimer = describeExchangeRate(exchangeRate);

  return (
    <span
      className={cn("whitespace-nowrap", className)}
      title={disclaimer}
      data-testid="money-converted"
      data-xlm={amount}
    >
      {formatUsd(convert(amount))}
      <sup aria-hidden="true" className="ml-0.5 text-[0.6em] font-normal text-muted-foreground">
        *
      </sup>
      <span className="sr-only"> (estimated from XLM)</span>
    </span>
  );
}
