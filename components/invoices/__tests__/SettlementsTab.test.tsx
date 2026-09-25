import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettlementsTab } from "../SettlementsTab";

vi.mock("@/hooks/useCurrency", () => ({
  useCurrency: () => ({ format: (n: number) => `${n.toFixed(2)} XLM` }),
}));

const mockUseSettlements = vi.fn();
const mockClaimMutate = vi.fn();
const mockBatchClaimMutate = vi.fn();

vi.mock("@/hooks/useSettlements", () => ({
  useSettlements: () => mockUseSettlements(),
  useClaimSettlement: () => ({ mutate: mockClaimMutate, isPending: false }),
  useBatchClaimSettlement: () => ({ mutate: mockBatchClaimMutate, isPending: false }),
}));

describe("SettlementsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state while settlements are loading", () => {
    mockUseSettlements.mockReturnValue({ data: undefined, isLoading: true });

    render(<SettlementsTab />);
    expect(screen.getByTestId("settlements-loading")).toBeInTheDocument();
  });

  it("shows an empty state when there are no claimable settlements", () => {
    mockUseSettlements.mockReturnValue({
      data: { claimable: [], claimed_history: [], total_claimable: 0, total_claimed: 0 },
      isLoading: false,
    });

    render(<SettlementsTab />);
    expect(screen.getByText("No settlements available to claim yet.")).toBeInTheDocument();
  });

  it("lists each claimable settlement with accurate return amounts", () => {
    mockUseSettlements.mockReturnValue({
      data: {
        claimable: [
          {
            invoice_id: "inv-1",
            invoice_title: "Acme receivable",
            invested_amount: 1000,
            return_amount: 1100,
            net_profit: 100,
            settled_at: "2026-09-01T00:00:00.000Z",
          },
        ],
        claimed_history: [],
        total_claimable: 1100,
        total_claimed: 0,
      },
      isLoading: false,
    });

    render(<SettlementsTab />);
    expect(screen.getByTestId("claimable-inv-1")).toBeInTheDocument();
    expect(screen.getByText("1 invoice ready to claim — 1100.00 XLM total")).toBeInTheDocument();
  });

  it("submits an individual claim for the correct invoice", () => {
    mockUseSettlements.mockReturnValue({
      data: {
        claimable: [
          {
            invoice_id: "inv-1",
            invoice_title: "Acme receivable",
            invested_amount: 1000,
            return_amount: 1100,
            net_profit: 100,
            settled_at: "2026-09-01T00:00:00.000Z",
          },
        ],
        claimed_history: [],
        total_claimable: 1100,
        total_claimed: 0,
      },
      isLoading: false,
    });

    render(<SettlementsTab />);
    fireEvent.click(screen.getByTestId("claim-btn"));
    expect(mockClaimMutate).toHaveBeenCalledWith("inv-1");
  });

  it("shows a Claim All button only when more than one settlement is claimable", () => {
    mockUseSettlements.mockReturnValue({
      data: {
        claimable: [
          {
            invoice_id: "inv-1",
            invoice_title: "A",
            invested_amount: 100,
            return_amount: 110,
            net_profit: 10,
            settled_at: "2026-09-01T00:00:00.000Z",
          },
        ],
        claimed_history: [],
        total_claimable: 110,
        total_claimed: 0,
      },
      isLoading: false,
    });

    render(<SettlementsTab />);
    expect(screen.queryByTestId("batch-claim-btn")).not.toBeInTheDocument();
  });

  it("processes all claimable positions in one batch action", () => {
    mockUseSettlements.mockReturnValue({
      data: {
        claimable: [
          {
            invoice_id: "inv-1",
            invoice_title: "A",
            invested_amount: 100,
            return_amount: 110,
            net_profit: 10,
            settled_at: "2026-09-01T00:00:00.000Z",
          },
          {
            invoice_id: "inv-2",
            invoice_title: "B",
            invested_amount: 200,
            return_amount: 220,
            net_profit: 20,
            settled_at: "2026-09-01T00:00:00.000Z",
          },
        ],
        claimed_history: [],
        total_claimable: 330,
        total_claimed: 0,
      },
      isLoading: false,
    });

    render(<SettlementsTab />);
    fireEvent.click(screen.getByTestId("batch-claim-btn"));
    expect(mockBatchClaimMutate).toHaveBeenCalledWith(["inv-1", "inv-2"]);
  });

  it("moves claimed items into a Claimed History section", () => {
    mockUseSettlements.mockReturnValue({
      data: {
        claimable: [],
        claimed_history: [
          {
            invoice_id: "inv-1",
            invoice_title: "Acme receivable",
            invested_amount: 1000,
            claimed_amount: 1100,
            claimed_at: "2026-09-01T00:00:00.000Z",
            tx_hash: "abc",
          },
        ],
        total_claimable: 0,
        total_claimed: 1100,
      },
      isLoading: false,
    });

    render(<SettlementsTab />);
    expect(screen.getByText("Claimed History")).toBeInTheDocument();
    expect(screen.getByTestId("claimed-inv-1")).toBeInTheDocument();
  });

  it("does not render a Claimed History section when there is no history", () => {
    mockUseSettlements.mockReturnValue({
      data: { claimable: [], claimed_history: [], total_claimable: 0, total_claimed: 0 },
      isLoading: false,
    });

    render(<SettlementsTab />);
    expect(screen.queryByText("Claimed History")).not.toBeInTheDocument();
  });
});
