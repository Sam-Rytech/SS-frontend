"use client";

/**
 * Multi-currency display (#437)
 *
 * Reads the app-wide currency state from <CurrencyProvider> (mounted in
 * components/providers.tsx). This used to hold its own state per call, so
 * each component had a separate currency and a hard-coded placeholder rate;
 * all callers now share one preference and one live Horizon rate.
 *
 * The return shape is a superset of the old hook, so existing callers
 * (SettlementClaimCard, SettlementsTab) keep working unchanged.
 *
 * Outside a provider (e.g. a component rendered on its own in a unit test)
 * it falls back to standalone state: the stored preference plus the live
 * rate from the backend rate endpoint (#309), with the last known rate kept
 * when a fetch fails. XLM stays the default, so nothing is converted until
 * the user picks USD.
 */

import { useCallback, useContext, useEffect, useState } from "react";
import { fetchXlmUsdRate as fetchBackendXlmUsdRate } from "@/lib/api";
import { CurrencyContext, formatXlmDefault, type CurrencyContextValue } from "@/context/CurrencyContext";
import {
  formatUsd,
  readStoredCurrency,
  readStoredRate,
  writeStoredCurrency,
  writeStoredRate,
  type Currency,
  type ExchangeRate,
} from "@/lib/currency";

export type { Currency } from "@/lib/currency";

/** Standalone fallback only: reuse a cached rate younger than this (#309). */
const STANDALONE_RATE_CACHE_TTL_MS = 60_000;
/** Standalone fallback only: flag the rate as stale after 5 minutes (#309). */
const STANDALONE_STALE_AFTER_MS = 5 * 60_000;

/**
 * Per-component currency state used when no <CurrencyProvider> is mounted.
 * It is always called (hooks can't be conditional) but stays idle, with no
 * fetch and no timer, while `enabled` is false.
 */
function useStandaloneCurrency(enabled: boolean): CurrencyContextValue {
  const [currency, setCurrencyState] = useState<Currency>(() => readStoredCurrency() ?? "XLM");
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(() => readStoredRate());
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState(false);

  const setCurrency = useCallback((next: Currency) => {
    setCurrencyState(next);
    writeStoredCurrency(next);
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrency(currency === "XLM" ? "USD" : "XLM");
  }, [currency, setCurrency]);

  // On failure the last known rate stays in state; `isStale` reports its age.
  const refreshRate = useCallback(async () => {
    const cached = readStoredRate();
    if (cached && Date.now() - cached.fetchedAt < STANDALONE_RATE_CACHE_TTL_MS) {
      setExchangeRate(cached);
      return;
    }
    setRateLoading(true);
    try {
      const { rate } = await fetchBackendXlmUsdRate();
      const next: ExchangeRate = { rate, fetchedAt: Date.now() };
      setExchangeRate(next);
      writeStoredRate(next);
      setRateError(false);
    } catch {
      setRateError(true);
    } finally {
      setRateLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refreshRate();
    const id = setInterval(() => void refreshRate(), STANDALONE_RATE_CACHE_TTL_MS);
    return () => clearInterval(id);
  }, [enabled, refreshRate]);

  const rate = exchangeRate?.rate ?? null;
  const isConverted = currency === "USD" && rate !== null;
  const convert = useCallback(
    (xlmAmount: number) => (isConverted ? xlmAmount * rate! : xlmAmount),
    [isConverted, rate],
  );
  const format = useCallback(
    (xlmAmount: number, xlmText?: string) =>
      isConverted ? formatUsd(xlmAmount * rate!) : (xlmText ?? formatXlmDefault(xlmAmount)),
    [isConverted, rate],
  );

  return {
    currency,
    setCurrency,
    toggleCurrency,
    rate,
    exchangeRate,
    rateLoading,
    rateError,
    isStale: exchangeRate !== null && Date.now() - exchangeRate.fetchedAt > STANDALONE_STALE_AFTER_MS,
    isConverted,
    convert,
    format,
    refreshRate,
  };
}

export function useCurrency(): CurrencyContextValue {
  const shared = useContext(CurrencyContext);
  const standalone = useStandaloneCurrency(shared === null);
  return shared ?? standalone;
}
