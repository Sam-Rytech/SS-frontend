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
 * it falls back to a fixed XLM-only value, so nothing is converted and
 * nothing throws.
 */

import { useContext } from "react";
import { CurrencyContext, formatXlmDefault, type CurrencyContextValue } from "@/context/CurrencyContext";
import { DEFAULT_CURRENCY } from "@/lib/currency";

export type { Currency } from "@/lib/currency";

const XLM_ONLY: CurrencyContextValue = {
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
  toggleCurrency: () => {},
  rate: null,
  exchangeRate: null,
  rateLoading: false,
  rateError: false,
  isStale: false,
  isConverted: false,
  convert: (xlmAmount) => xlmAmount,
  format: (xlmAmount, xlmText) => xlmText ?? formatXlmDefault(xlmAmount),
  refreshRate: async () => {},
};

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext) ?? XLM_ONLY;
}
