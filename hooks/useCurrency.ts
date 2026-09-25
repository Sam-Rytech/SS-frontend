"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchXlmUsdRate } from "@/lib/api";

export type Currency = "XLM" | "USD";

const STORAGE_KEY = "stellaresettle_currency";
const RATE_CACHE_KEY = "stellaresettle_xlm_usd_rate";
const RATE_CACHE_TTL = 60_000; // 60 seconds
const STALE_THRESHOLD = 5 * 60_000; // 5 minutes

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

function getStoredCurrency(): Currency {
  if (typeof window === "undefined") return "XLM";
  return (localStorage.getItem(STORAGE_KEY) as Currency) || "XLM";
}

function getStoredRate(): CachedRate | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RATE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredRate(rate: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RATE_CACHE_KEY, JSON.stringify({ rate, fetchedAt: Date.now() }));
}

export function useCurrency() {
  const [currency, setCurrencyState] = useState<Currency>(getStoredCurrency);
  const [rate, setRate] = useState<number | null>(() => getStoredRate()?.rate ?? null);
  const [rateFetchedAt, setRateFetchedAt] = useState<number>(() => getStoredRate()?.fetchedAt ?? 0);
  const [rateLoading, setRateLoading] = useState(false);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem(STORAGE_KEY, c);
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrency(currency === "XLM" ? "USD" : "XLM");
  }, [currency, setCurrency]);

  // Fetches the live XLM/USD rate from the backend rate endpoint. On
  // failure, silently keeps whatever rate is already in state (the last
  // known good rate, if any) — the caller surfaces staleness via `isStale`
  // rather than blocking on a fresh fetch.
  const fetchRate = useCallback(async () => {
    const cached = getStoredRate();
    if (cached && Date.now() - cached.fetchedAt < RATE_CACHE_TTL) {
      setRate(cached.rate);
      setRateFetchedAt(cached.fetchedAt);
      return;
    }

    setRateLoading(true);
    try {
      const { rate: usdRate } = await fetchXlmUsdRate();
      setRate(usdRate);
      setRateFetchedAt(Date.now());
      setStoredRate(usdRate);
    } catch {
      // Use last known rate on failure
    } finally {
      setRateLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRate();
    const interval = setInterval(fetchRate, RATE_CACHE_TTL);
    return () => clearInterval(interval);
  }, [fetchRate]);

  const isStale = rateFetchedAt > 0 && Date.now() - rateFetchedAt > STALE_THRESHOLD;

  const convert = useCallback(
    (xlmAmount: number): number => {
      if (currency === "XLM" || !rate) return xlmAmount;
      return xlmAmount * rate;
    },
    [currency, rate]
  );

  const format = useCallback(
    (xlmAmount: number): string => {
      const converted = convert(xlmAmount);
      if (currency === "USD") {
        return `$${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return `${converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} XLM`;
    },
    [convert, currency]
  );

  return {
    currency,
    setCurrency,
    toggleCurrency,
    rate,
    isStale,
    rateLoading,
    convert,
    format,
  };
}
