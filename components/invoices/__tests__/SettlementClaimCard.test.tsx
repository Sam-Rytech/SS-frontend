import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClaimableSettlementCard, ClaimedHistoryCard } from "../SettlementClaimCard";
import type { ClaimableSettlement, ClaimedHistory } from "@/hooks/useSettlements";

vi.mock("@/hooks/useCurrency", () => ({
  useCurrency: () => ({ format: (n: number) => `${n.toFixed(2)} XLM` }),
}));

function makeClaimable(overrides: Partial<ClaimableSettlement> = {}): ClaimableSettlement {
  return {
    invoice_id: "inv-1",
    invoice_title: "Acme receivable",
    invested_amount: 1000,
    return_amount: 1100,
    net_profit: 100,
    settled_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeHistory(overrides: Partial<ClaimedHistory> = {}): ClaimedHistory {
  return {
    invoice_id: "inv-1",
    invoice_title: "Acme receivable",
    invested_amount: 1000,
    claimed_amount: 1100,
    claimed_at: "2026-09-01T00:00:00.000Z",
    tx_hash: "abc123",
    ...overrides,
  };
}

describe("ClaimableSettlementCard", () => {
  it("renders invested, return, and net profit amounts", () => {
    render(
      <ClaimableSettlementCard
        settlement={makeClaimable()}
        onClaim={vi.fn()}
        isClaiming={false}
      />,
    );

    expect(screen.getByText("1000.00 XLM")).toBeInTheDocument();
    expect(screen.getByText("1100.00 XLM")).toBeInTheDocument();
    expect(screen.getByText("+100.00 XLM")).toBeInTheDocument();
  });

  it("calls onClaim with the invoice id when clicked", () => {
    const onClaim = vi.fn();
    render(
      <ClaimableSettlementCard
        settlement={makeClaimable()}
        onClaim={onClaim}
        isClaiming={false}
      />,
    );

    fireEvent.click(screen.getByTestId("claim-btn"));
    expect(onClaim).toHaveBeenCalledWith("inv-1");
  });

  it("disables the claim button and shows progress text while claiming", () => {
    render(
      <ClaimableSettlementCard
        settlement={makeClaimable()}
        onClaim={vi.fn()}
        isClaiming={true}
      />,
    );

    const button = screen.getByTestId("claim-btn");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Claiming...");
  });
});

describe("ClaimedHistoryCard", () => {
  it("renders invested and claimed amounts", () => {
    render(<ClaimedHistoryCard entry={makeHistory()} />);

    expect(screen.getByText("1000.00 XLM")).toBeInTheDocument();
    expect(screen.getByText("1100.00 XLM")).toBeInTheDocument();
  });

  it("links the transaction hash to the Stellar block explorer", () => {
    render(<ClaimedHistoryCard entry={makeHistory({ tx_hash: "deadbeef" })} />);

    // TxHash's `testId` prop only labels the hash display span; the
    // explorer link itself always carries its own fixed testid. The
    // default network (testnet, per NEXT_PUBLIC_STELLAR_NETWORK) picks
    // the URL's path segment.
    const link = screen.getByTestId("tx-hash-explorer-link");
    expect(link).toHaveAttribute(
      "href",
      "https://stellar.expert/explorer/testnet/tx/deadbeef",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("does not render a transaction link when no tx_hash is present", () => {
    render(<ClaimedHistoryCard entry={makeHistory({ tx_hash: "" })} />);

    expect(screen.queryByTestId("tx-hash-explorer-link")).not.toBeInTheDocument();
  });
});
