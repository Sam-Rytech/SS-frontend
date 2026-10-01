import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CurrencyToggle } from "../CurrencyToggle";

// The toggle is a USD / XLM segmented control (#437) that writes the shared
// currency through setCurrency; these keep the #309 behaviour covered.

const mockUseCurrency = vi.fn();
vi.mock("@/hooks/useCurrency", () => ({
  useCurrency: () => mockUseCurrency(),
}));

function currencyState(overrides: Record<string, unknown> = {}) {
  return {
    currency: "XLM",
    setCurrency: vi.fn(),
    toggleCurrency: vi.fn(),
    rate: 0.42,
    isStale: false,
    rateError: false,
    rateLoading: false,
    ...overrides,
  };
}

describe("CurrencyToggle", () => {
  beforeEach(() => {
    mockUseCurrency.mockReturnValue(currencyState());
  });

  it("marks the current currency as pressed", () => {
    render(<CurrencyToggle />);
    expect(screen.getByTestId("currency-option-xlm")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("currency-option-usd")).toHaveAttribute("aria-pressed", "false");
  });

  it("switches currency when an option is clicked", () => {
    const setCurrency = vi.fn();
    mockUseCurrency.mockReturnValue(currencyState({ setCurrency }));

    render(<CurrencyToggle />);
    fireEvent.click(screen.getByTestId("currency-option-usd"));
    expect(setCurrency).toHaveBeenCalledTimes(1);
    expect(setCurrency).toHaveBeenCalledWith("USD");
  });

  it("displays the live rate alongside the toggle", () => {
    render(<CurrencyToggle />);
    expect(screen.getByTestId("currency-rate")).toHaveTextContent("1 XLM ≈ $0.4200");
  });

  it("can hide the rate", () => {
    render(<CurrencyToggle showRate={false} />);
    expect(screen.queryByTestId("currency-rate")).not.toBeInTheDocument();
  });

  it("does not display a rate when none has loaded yet", () => {
    mockUseCurrency.mockReturnValue(currencyState({ rate: null, rateLoading: true }));

    render(<CurrencyToggle />);
    expect(screen.queryByTestId("currency-rate")).not.toBeInTheDocument();
  });

  it("shows a stale-rate warning when the rate is stale", () => {
    mockUseCurrency.mockReturnValue(currencyState({ currency: "USD", isStale: true }));

    render(<CurrencyToggle />);
    expect(screen.getByTestId("stale-rate-indicator")).toBeInTheDocument();
  });

  it("does not show a stale-rate warning when the rate is fresh", () => {
    render(<CurrencyToggle />);
    expect(screen.queryByTestId("stale-rate-indicator")).not.toBeInTheDocument();
  });

  it("has accessible labels describing each target currency", () => {
    render(<CurrencyToggle />);
    expect(screen.getByRole("button", { name: "Show values in USD" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show values in XLM" })).toBeInTheDocument();
  });
});
