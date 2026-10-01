import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { CurrencyToggle } from "@/components/layout/CurrencyToggle";
import { CurrencySettings } from "@/components/settings/CurrencySettings";
import { ExchangeRateDisclaimer, Money } from "@/components/currency";
import { useCurrency } from "@/hooks/useCurrency";
import { CURRENCY_STORAGE_KEY, RATE_REFRESH_INTERVAL_MS, RATE_STORAGE_KEY } from "@/lib/currency";

// #437 — USD / XLM display: toggle, platform-wide conversion, Horizon rate
// refresh, persistence and disclaimers.

/** Let pending promises (the rate fetch) settle inside act(). */
async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

function Values() {
  return (
    <div>
      <p data-testid="price">
        <Money xlm={1000} xlmText="1,000 XLM" />
      </p>
      <p data-testid="payout">
        <Money xlm={250.5} />
      </p>
      <ExchangeRateDisclaimer />
    </div>
  );
}

function renderApp(fetchRate: () => Promise<number>) {
  return render(
    <CurrencyProvider fetchRate={fetchRate}>
      <CurrencyToggle />
      <Values />
    </CurrencyProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("currency toggle", () => {
  it("defaults to XLM and renders the original XLM text unchanged", async () => {
    renderApp(vi.fn().mockResolvedValue(0.25));
    await flush();

    expect(screen.getByTestId("price")).toHaveTextContent(/^1,000 XLM$/);
    expect(screen.getByTestId("payout")).toHaveTextContent(/^250\.50 XLM$/);
    expect(screen.getByTestId("currency-option-xlm")).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByTestId("exchange-rate-disclaimer")).not.toBeInTheDocument();
  });

  it("switches every monetary value to USD at the Horizon rate, and back", async () => {
    renderApp(vi.fn().mockResolvedValue(0.25));
    await flush();

    fireEvent.click(screen.getByTestId("currency-option-usd"));

    expect(screen.getByTestId("currency-option-usd")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("price")).toHaveTextContent("$250.00");
    expect(screen.getByTestId("payout")).toHaveTextContent("$62.63");
    expect(screen.queryByText("1,000 XLM")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("currency-option-xlm"));
    expect(screen.getByTestId("price")).toHaveTextContent(/^1,000 XLM$/);
  });

  it("shares one currency across separate toggles (navbar + settings)", async () => {
    render(
      <CurrencyProvider fetchRate={vi.fn().mockResolvedValue(0.2)}>
        <CurrencyToggle />
        <CurrencySettings />
        <Values />
      </CurrencyProvider>,
    );
    await flush();

    const [, settingsUsd] = screen.getAllByTestId("currency-option-usd");
    fireEvent.click(settingsUsd);

    for (const option of screen.getAllByTestId("currency-option-usd")) {
      expect(option).toHaveAttribute("aria-pressed", "true");
    }
    expect(screen.getByTestId("price")).toHaveTextContent("$200.00");
    for (const rate of screen.getAllByTestId("currency-rate")) {
      expect(rate).toHaveTextContent("1 XLM ≈ $0.2000");
    }
  });
});

describe("persistence", () => {
  it("saves the preference and restores it after a refresh", async () => {
    const fetchRate = vi.fn().mockResolvedValue(0.25);
    const { unmount } = renderApp(fetchRate);
    await flush();

    fireEvent.click(screen.getByTestId("currency-option-usd"));
    expect(localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe("USD");
    unmount();

    // Simulates a page reload: a brand-new provider reads the saved choice.
    renderApp(fetchRate);
    await flush();
    expect(screen.getByTestId("currency-option-usd")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("price")).toHaveTextContent("$250.00");
  });

  it("follows a currency change made in another tab", async () => {
    renderApp(vi.fn().mockResolvedValue(0.25));
    await flush();

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: CURRENCY_STORAGE_KEY, newValue: "USD" }));
    });
    expect(screen.getByTestId("price")).toHaveTextContent("$250.00");
  });

  it("shows the cached rate immediately while the first fetch is pending", async () => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, "USD");
    localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify({ rate: 0.1, fetchedAt: Date.now() }));

    renderApp(() => new Promise<number>(() => {})); // never resolves
    await flush();

    expect(screen.getByTestId("price")).toHaveTextContent("$100.00");
  });
});

describe("Horizon rate refresh", () => {
  it("fetches on load and refreshes every 5 minutes without a loading flash", async () => {
    vi.useFakeTimers();
    localStorage.setItem(CURRENCY_STORAGE_KEY, "USD");
    const fetchRate = vi.fn().mockResolvedValueOnce(0.2).mockResolvedValueOnce(0.3);

    renderApp(fetchRate);
    await flush();
    expect(fetchRate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("price")).toHaveTextContent("$200.00");

    // Just before the interval nothing is refetched.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RATE_REFRESH_INTERVAL_MS - 1);
    });
    expect(fetchRate).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(fetchRate).toHaveBeenCalledTimes(2);
    // The value is swapped in place; it's never replaced by a loading state.
    expect(screen.getByTestId("price")).toHaveTextContent("$300.00");
    expect(screen.queryByTestId("exchange-rate-unavailable")).not.toBeInTheDocument();
  });

  it("keeps the last good rate when a refresh fails", async () => {
    vi.useFakeTimers();
    localStorage.setItem(CURRENCY_STORAGE_KEY, "USD");
    const fetchRate = vi.fn().mockResolvedValueOnce(0.2).mockRejectedValueOnce(new Error("down"));

    renderApp(fetchRate);
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RATE_REFRESH_INTERVAL_MS);
    });

    expect(fetchRate).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("price")).toHaveTextContent("$200.00");
    expect(screen.getByTestId("exchange-rate-disclaimer")).toBeInTheDocument();
  });

  it("stops polling on unmount", async () => {
    vi.useFakeTimers();
    const fetchRate = vi.fn().mockResolvedValue(0.2);
    const { unmount } = renderApp(fetchRate);
    await flush();
    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(RATE_REFRESH_INTERVAL_MS * 3);
    });
    expect(fetchRate).toHaveBeenCalledTimes(1);
  });
});

describe("disclaimer", () => {
  it("is shown next to converted values with the rate and source", async () => {
    renderApp(vi.fn().mockResolvedValue(0.25));
    await flush();
    fireEvent.click(screen.getByTestId("currency-option-usd"));

    const disclaimer = screen.getByTestId("exchange-rate-disclaimer");
    expect(disclaimer).toHaveTextContent("1 XLM ≈ $0.2500");
    expect(disclaimer).toHaveTextContent("Horizon");
    expect(disclaimer).toHaveTextContent("settle in XLM");

    // Each converted value carries the disclaimer as its tooltip.
    for (const value of screen.getAllByTestId("money-converted")) {
      expect(value).toHaveAttribute("title", expect.stringContaining("1 XLM ≈ $0.2500"));
    }
  });

  it("explains that values stay in XLM when no rate is available", async () => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, "USD");
    renderApp(vi.fn().mockRejectedValue(new Error("down")));
    await flush();

    expect(screen.getByTestId("price")).toHaveTextContent(/^1,000 XLM$/);
    expect(screen.getByTestId("exchange-rate-unavailable")).toHaveTextContent("unavailable");
    expect(screen.queryByTestId("money-converted")).not.toBeInTheDocument();
    expect(screen.getByTestId("stale-rate-indicator")).toBeInTheDocument();
  });
});

describe("useCurrency outside a provider", () => {
  it("defaults to XLM so isolated components render as before", () => {
    function Probe() {
      const { currency, format } = useCurrency();
      return (
        <p data-testid="probe">
          {currency}|{format(1234.5)}|<Money xlm={10} xlmText="10 XLM" />
        </p>
      );
    }
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("XLM|1,234.5 XLM|10 XLM");
  });
});
