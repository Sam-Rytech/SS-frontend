import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CURRENCY_STORAGE_KEY,
  RATE_STALE_AFTER_MS,
  RATE_STORAGE_KEY,
  USDC_ISSUER,
  convertXlmToUsd,
  describeExchangeRate,
  fetchXlmUsdRate,
  formatRate,
  formatUsd,
  isCurrency,
  isRateStale,
  parseOrderBookMidPrice,
  readStoredCurrency,
  readStoredRate,
  writeStoredCurrency,
  writeStoredRate,
  xlmUsdcOrderBookUrl,
} from "@/lib/currency";

// #437 — pure currency helpers: Horizon rate parsing, conversion, formatting,
// persistence and disclaimer text.

const ORDER_BOOK = {
  bids: [{ price: "0.2219970", amount: "505.4361096" }],
  asks: [{ price: "0.2222196", amount: "1890.2760945" }],
};

function mockFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("xlmUsdcOrderBookUrl", () => {
  it("builds the Horizon XLM/USDC order-book URL", () => {
    const url = new URL(xlmUsdcOrderBookUrl("https://horizon.example.org/"));
    expect(url.origin + url.pathname).toBe("https://horizon.example.org/order_book");
    expect(url.searchParams.get("selling_asset_type")).toBe("native");
    expect(url.searchParams.get("buying_asset_code")).toBe("USDC");
    expect(url.searchParams.get("buying_asset_issuer")).toBe(USDC_ISSUER);
    expect(url.searchParams.get("limit")).toBe("1");
  });
});

describe("parseOrderBookMidPrice", () => {
  it("returns the mid-price of the best bid and ask", () => {
    expect(parseOrderBookMidPrice(ORDER_BOOK)).toBeCloseTo((0.221997 + 0.2222196) / 2, 7);
  });

  it("falls back to the only side that has a price", () => {
    expect(parseOrderBookMidPrice({ bids: [{ price: "0.2" }], asks: [] })).toBe(0.2);
    expect(parseOrderBookMidPrice({ bids: [], asks: [{ price: "0.3" }] })).toBe(0.3);
  });

  it("throws when there is no usable price", () => {
    expect(() => parseOrderBookMidPrice({ bids: [], asks: [] })).toThrow();
    expect(() => parseOrderBookMidPrice({ bids: [{ price: "0" }], asks: [{ price: "abc" }] })).toThrow();
    expect(() => parseOrderBookMidPrice(null)).toThrow();
  });
});

describe("fetchXlmUsdRate", () => {
  it("fetches the order book from Horizon and returns the mid-price", async () => {
    const fetchImpl = mockFetch(ORDER_BOOK);
    const rate = await fetchXlmUsdRate("https://horizon.example.org", fetchImpl);

    expect(rate).toBeCloseTo(0.2221083, 6);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0])).toContain(
      "https://horizon.example.org/order_book?",
    );
  });

  it("rejects when Horizon responds with an error status", async () => {
    await expect(
      fetchXlmUsdRate("https://horizon.example.org", mockFetch({}, { ok: false, status: 503 })),
    ).rejects.toThrow("503");
  });

  it("rejects when the order book is empty", async () => {
    await expect(
      fetchXlmUsdRate("https://horizon.example.org", mockFetch({ bids: [], asks: [] })),
    ).rejects.toThrow();
  });
});

describe("conversion and formatting", () => {
  it("converts XLM to USD with the given rate", () => {
    expect(convertXlmToUsd(1000, 0.25)).toBe(250);
  });

  it("formats USD with a dollar sign, separators and 2 decimals", () => {
    expect(formatUsd(1234.5)).toBe("$1,234.50");
    expect(formatUsd(-12)).toBe("-$12.00");
    expect(formatUsd(Number.NaN)).toBe("$0.00");
  });

  it("formats the rate with 4 decimals", () => {
    expect(formatRate(0.2221083)).toBe("$0.2221");
  });
});

describe("persistence", () => {
  it("round-trips the currency preference", () => {
    expect(readStoredCurrency()).toBeNull();
    writeStoredCurrency("USD");
    expect(localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe("USD");
    expect(readStoredCurrency()).toBe("USD");
  });

  it("ignores unknown stored currencies", () => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, "EUR");
    expect(readStoredCurrency()).toBeNull();
    expect(isCurrency("EUR")).toBe(false);
    expect(isCurrency("XLM")).toBe(true);
  });

  it("round-trips the cached rate and rejects invalid entries", () => {
    writeStoredRate({ rate: 0.2, fetchedAt: 1000 });
    expect(readStoredRate()).toEqual({ rate: 0.2, fetchedAt: 1000 });

    localStorage.setItem(RATE_STORAGE_KEY, "not json");
    expect(readStoredRate()).toBeNull();

    localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify({ rate: -1, fetchedAt: 1 }));
    expect(readStoredRate()).toBeNull();
  });

  it("does not throw when localStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readStoredCurrency()).toBeNull();
    expect(readStoredRate()).toBeNull();
    expect(() => writeStoredCurrency("USD")).not.toThrow();
    expect(() => writeStoredRate({ rate: 1, fetchedAt: 1 })).not.toThrow();
  });
});

describe("staleness and disclaimer", () => {
  const rate = { rate: 0.2221, fetchedAt: 1_000_000 };

  it("flags a rate older than two refresh cycles as stale", () => {
    expect(isRateStale(null)).toBe(false);
    expect(isRateStale(rate, rate.fetchedAt + RATE_STALE_AFTER_MS)).toBe(false);
    expect(isRateStale(rate, rate.fetchedAt + RATE_STALE_AFTER_MS + 1)).toBe(true);
  });

  it("describes the rate, its source and that settlement is in XLM", () => {
    const text = describeExchangeRate(rate, rate.fetchedAt);
    expect(text).toContain("estimates");
    expect(text).toContain("1 XLM ≈ $0.2221");
    expect(text).toContain("Horizon");
    expect(text).toContain("settle in XLM");
    expect(text).not.toContain("out of date");
  });

  it("adds a warning when the rate is stale", () => {
    expect(describeExchangeRate(rate, rate.fetchedAt + RATE_STALE_AFTER_MS + 1)).toContain(
      "out of date",
    );
  });
});
