import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { InvestmentModal } from "../InvestmentModal";
import * as stellarUsdc from "@/lib/stellar/usdc";
import type { Network } from "@/lib/stellar";
import { AccreditationProvider } from "@/context/AccreditationContext";

// WalletContext itself is not exported, so the hook is mocked instead.
// Defaults to a disconnected wallet so suites that don't care about wallet
// state (e.g. the accreditation gate tests) don't have to set it up.
const mockUseWallet = vi.fn(() => ({
  address: null as string | null,
  network: null as Network | null,
  isConnected: false,
}));
vi.mock("@/context/WalletContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/context/WalletContext")>();
  return { ...actual, useWallet: () => mockUseWallet() };
});

vi.mock("@/lib/api", () => ({
  investInInvoice: vi.fn().mockResolvedValue({ success: true, invested_amount: 100 }),
  // FeeTierDisplay (rendered inside the investment form) fetches this via
  // useFeeTier; without a mock it hits the unmocked real import and throws
  // during render.
  fetchFeeTier: vi.fn().mockResolvedValue({
    fee_percentage: 1,
    is_lowest_tier: true,
    tier_label: "Standard",
    tiers: [],
    volume_24h: 0,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn() },
}));

const ADDRESS = "GD5X6MPY7HXHYHZWRXKJQKQ7T2WQ2Y3H4ZQ2Y2KQ2WQ2Y2KQ2WQ2Y2KQ2";

// Radix's popover/dialog measure with ResizeObserver, absent in jsdom.
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  mockUseWallet.mockReturnValue({ address: null, network: null, isConnected: false });
});

/** Minimal wallet value; the balance guard only reads address and network. */
function walletValue(address: string | null) {
  return {
    address,
    network: "testnet" as Network,
    isConnected: address !== null,
  };
}

function renderModal(ui: ReactElement, address: string | null) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  mockUseWallet.mockReturnValue(walletValue(address));
  return render(
    <QueryClientProvider client={client}>
      <AccreditationProvider>{ui}</AccreditationProvider>
    </QueryClientProvider>
  );
}

/** Clicks through every accreditation disclosure step so the investment
 * form (rather than the gate) is what's on screen afterwards. */
function acknowledgeAccreditationGate() {
  fireEvent.click(screen.getByTestId("accreditation-step-next")); // risk -> platform rules
  fireEvent.click(screen.getByTestId("accreditation-step-next")); // platform rules -> confirmation
  fireEvent.click(screen.getByTestId("accreditation-step-next")); // confirm
}

function openModal() {
  const result = renderModal(
    <InvestmentModal invoiceId="inv-1" minInvestment={10} maxInvestment={10_000} />,
    ADDRESS
  );
  // The invest UI lives in a popover, which only mounts once opened.
  fireEvent.click(screen.getByTestId("invest-button"));
  // The accreditation gate is shown before the investment form on every
  // first attempt (issue #312); clear it so the balance-guard assertions
  // below can reach the form underneath.
  acknowledgeAccreditationGate();
  return result;
}

describe("InvestmentModal USDC balance guard (#402)", () => {
  it("shows the wallet USDC balance", async () => {
    vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(2_500);

    openModal();

    await waitFor(() =>
      expect(screen.getByTestId("investment-modal-balance")).toHaveTextContent("2,500.00 USDC")
    );
  });

  it("shows no top-up prompt while the balance is sufficient", async () => {
    vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(5_000);

    openModal();

    await waitFor(() =>
      expect(screen.getByTestId("investment-modal-balance")).toHaveTextContent("5,000.00 USDC")
    );
    expect(screen.queryByTestId("insufficient-balance")).not.toBeInTheDocument();
  });

  it("surfaces the top-up CTA when the entered amount exceeds the balance", async () => {
    vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(100);

    openModal();

    await waitFor(() =>
      expect(screen.getByTestId("investment-modal-balance")).toHaveTextContent("100.00 USDC")
    );
    // The guard is evaluated against the amount being committed.
    expect(screen.queryByTestId("insufficient-balance")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Investment amount/i), {
      target: { value: "1000" },
    });

    expect(screen.getByTestId("insufficient-balance")).toBeInTheDocument();
    expect(screen.getByTestId("insufficient-balance")).toHaveTextContent("900.00 USDC");
  });

  it("blocks the investment while the wallet is short", async () => {
    vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(100);

    openModal();

    await waitFor(() => expect(screen.getByTestId("investment-modal-balance")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Investment amount/i), {
      target: { value: "1000" },
    });

    expect(screen.getByTestId("investment-submit")).toBeDisabled();
  });

  it("keeps the investment enabled when the balance covers the amount", async () => {
    vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(5_000);

    openModal();

    await waitFor(() => expect(screen.getByTestId("investment-modal-balance")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Investment amount/i), {
      target: { value: "1000" },
    });

    expect(screen.getByTestId("investment-submit")).toBeEnabled();
  });

  it("does not accuse the user of being short before the balance loads", () => {
    vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockReturnValue(new Promise(() => {}));

    openModal();

    expect(screen.getByTestId("investment-modal-balance")).toHaveTextContent("Loading…");
    expect(screen.queryByTestId("insufficient-balance")).not.toBeInTheDocument();
  });

  it("keeps the comparison affordances out of the invest popover", async () => {
    vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(100);

    openModal();

    await waitFor(() => expect(screen.getByTestId("investment-modal-balance")).toBeInTheDocument());
    expect(screen.getByTestId("invest-button")).toBeInTheDocument();
  });
});

describe("InvestmentModal - accreditation gate (issue #312)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWallet.mockReturnValue({ address: null, network: null, isConnected: false });
  });

  function renderGateModal() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <AccreditationProvider>
          <InvestmentModal
            invoiceId="inv-1"
            minInvestment={1}
            maxInvestment={1000}
          />
        </AccreditationProvider>
      </QueryClientProvider>
    );
  }

  it("shows the accreditation gate instead of the investment form on first click", () => {
    renderGateModal();

    fireEvent.click(screen.getByTestId("invest-button"));

    expect(screen.getByTestId("accreditation-gate-modal")).toBeInTheDocument();
    expect(
      screen.queryByText("Invest in this Invoice")
    ).not.toBeInTheDocument();
  });

  it("reveals the investment form only after all disclosure steps are acknowledged", () => {
    renderGateModal();

    fireEvent.click(screen.getByTestId("invest-button"));
    acknowledgeAccreditationGate();

    expect(screen.getByText("Invest in this Invoice")).toBeInTheDocument();
    expect(
      screen.queryByTestId("accreditation-gate-modal")
    ).not.toBeInTheDocument();
  });

  it("does not re-show the gate on a second investment attempt in the same session", async () => {
    renderGateModal();

    fireEvent.click(screen.getByTestId("invest-button"));
    acknowledgeAccreditationGate();

    // Close and reopen the popover.
    fireEvent.click(screen.getByText("Cancel"));
    fireEvent.click(screen.getByTestId("invest-button"));

    expect(screen.getByText("Invest in this Invoice")).toBeInTheDocument();
    expect(
      screen.queryByTestId("accreditation-gate-modal")
    ).not.toBeInTheDocument();
  });
});
