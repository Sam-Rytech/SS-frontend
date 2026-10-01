import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CurrencyToggle } from "../CurrencyToggle";

const mockUseCurrency = vi.fn();
vi.mock("@/hooks/useCurrency", () => ({
  useCurrency: () => mockUseCurrency(),
}));

describe("CurrencyToggle", () => {
  beforeEach(() => {
    mockUseCurrency.mockReturnValue({
      currency: "XLM",
      toggleCurrency: vi.fn(),
      rate: 0.42,
      isStale: false,
    });
  });

  it("shows the current currency on the toggle button", () => {
    render(<CurrencyToggle />);
    expect(screen.getByTestId("currency-toggle")).toHaveTextContent("XLM");
  });

  it("calls toggleCurrency when clicked", () => {
    const toggleCurrency = vi.fn();
    mockUseCurrency.mockReturnValue({
      currency: "XLM",
      toggleCurrency,
      rate: 0.42,
      isStale: false,
    });

    render(<CurrencyToggle />);
    fireEvent.click(screen.getByTestId("currency-toggle"));
    expect(toggleCurrency).toHaveBeenCalledTimes(1);
  });

  it("displays the live rate alongside the toggle", () => {
    render(<CurrencyToggle />);
    expect(screen.getByTestId("currency-rate")).toHaveTextContent("1 XLM = $0.4200");
  });

  it("does not display a rate when none has loaded yet", () => {
    mockUseCurrency.mockReturnValue({
      currency: "XLM",
      toggleCurrency: vi.fn(),
      rate: null,
      isStale: false,
    });

    render(<CurrencyToggle />);
    expect(screen.queryByTestId("currency-rate")).not.toBeInTheDocument();
  });

  it("shows a stale-rate warning when the rate is stale", () => {
    mockUseCurrency.mockReturnValue({
      currency: "USD",
      toggleCurrency: vi.fn(),
      rate: 0.42,
      isStale: true,
    });

    render(<CurrencyToggle />);
    expect(screen.getByTestId("stale-rate-indicator")).toBeInTheDocument();
  });

  it("does not show a stale-rate warning when the rate is fresh", () => {
    render(<CurrencyToggle />);
    expect(screen.queryByTestId("stale-rate-indicator")).not.toBeInTheDocument();
  });

  it("has an accessible label describing the target currency", () => {
    render(<CurrencyToggle />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Switch to USD");
  });
});
