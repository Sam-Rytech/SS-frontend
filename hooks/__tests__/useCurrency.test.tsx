import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCurrency } from "../useCurrency";

vi.mock("@/lib/api", () => ({
  fetchXlmUsdRate: vi.fn(),
}));

import { fetchXlmUsdRate } from "@/lib/api";

describe("useCurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(fetchXlmUsdRate).mockResolvedValue({ rate: 0.42 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to XLM when no preference is stored", () => {
    const { result } = renderHook(() => useCurrency());
    expect(result.current.currency).toBe("XLM");
  });

  it("toggles between XLM and USD", async () => {
    const { result } = renderHook(() => useCurrency());

    act(() => result.current.toggleCurrency());
    await waitFor(() => expect(result.current.currency).toBe("USD"));

    act(() => result.current.toggleCurrency());
    await waitFor(() => expect(result.current.currency).toBe("XLM"));
  });

  it("persists the selected currency to localStorage", async () => {
    const { result } = renderHook(() => useCurrency());

    act(() => result.current.setCurrency("USD"));
    await waitFor(() => expect(result.current.currency).toBe("USD"));

    expect(localStorage.getItem("stellaresettle_currency")).toBe("USD");
  });

  it("restores a previously selected currency on mount", () => {
    localStorage.setItem("stellaresettle_currency", "USD");
    const { result } = renderHook(() => useCurrency());
    expect(result.current.currency).toBe("USD");
  });

  it("fetches the live rate from the backend rate endpoint on mount", async () => {
    const { result } = renderHook(() => useCurrency());

    await waitFor(() => expect(result.current.rate).toBe(0.42));
    expect(fetchXlmUsdRate).toHaveBeenCalledTimes(1);
  });

  it("converts an XLM amount to USD using the fetched rate", async () => {
    const { result } = renderHook(() => useCurrency());
    await waitFor(() => expect(result.current.rate).toBe(0.42));

    act(() => result.current.setCurrency("USD"));
    await waitFor(() => expect(result.current.currency).toBe("USD"));

    expect(result.current.convert(100)).toBeCloseTo(42);
  });

  it("does not convert when currency is XLM", async () => {
    const { result } = renderHook(() => useCurrency());
    await waitFor(() => expect(result.current.rate).toBe(0.42));

    expect(result.current.convert(100)).toBe(100);
  });

  it("formats a USD amount with a dollar sign and two decimals", async () => {
    const { result } = renderHook(() => useCurrency());
    await waitFor(() => expect(result.current.rate).toBe(0.42));

    act(() => result.current.setCurrency("USD"));
    await waitFor(() => expect(result.current.currency).toBe("USD"));

    expect(result.current.format(100)).toBe("$42.00");
  });

  it("falls back to the last known rate when the fetch fails", async () => {
    localStorage.setItem(
      "stellaresettle_xlm_usd_rate",
      JSON.stringify({ rate: 0.5, fetchedAt: Date.now() - 10 * 60_000 }),
    );
    vi.mocked(fetchXlmUsdRate).mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useCurrency());

    // The cache is older than RATE_CACHE_TTL (60s) so a fresh fetch is
    // attempted; it fails, and the previously cached rate is kept rather
    // than being cleared.
    await waitFor(() => expect(result.current.rate).toBe(0.5));
  });

  it("reports the rate as stale after the staleness threshold", () => {
    localStorage.setItem(
      "stellaresettle_xlm_usd_rate",
      JSON.stringify({ rate: 0.5, fetchedAt: Date.now() - 10 * 60_000 }),
    );

    const { result } = renderHook(() => useCurrency());
    expect(result.current.isStale).toBe(true);
  });

  it("does not report the rate as stale immediately after a fresh fetch", async () => {
    const { result } = renderHook(() => useCurrency());
    await waitFor(() => expect(result.current.rate).toBe(0.42));

    expect(result.current.isStale).toBe(false);
  });
});
