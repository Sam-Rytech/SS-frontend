import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { InvoiceDetailView } from "../InvoiceDetailView";
import { useInvoiceStatusPolling } from "@/hooks/useInvoiceStatusPolling";
import { useProtocolStatus } from "@/hooks/useProtocolStatus";
import { useWallet } from "@/context/WalletContext";

// Focused coverage for the maturity countdown / matured banner (issue #314),
// ported here after InvoiceDetail.tsx (its original home) was replaced by
// this shared view in the invoice-detail rework (#376). The rest of this
// page's own behavior (KYC gating, investing, documents, etc.) is
// pre-existing and out of scope for this port.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/invoices/inv-1",
}));
vi.mock("@/hooks/useInvoiceStatusPolling", () => ({
  useInvoiceStatusPolling: vi.fn(),
}));
vi.mock("@/hooks/useProtocolStatus", () => ({
  useProtocolStatus: vi.fn().mockReturnValue({ data: undefined }),
}));
vi.mock("@/context/WalletContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/context/WalletContext")>();
  return { ...actual, useWallet: vi.fn().mockReturnValue({ address: null }) };
});
vi.mock("@/hooks/useKycStatus", () => ({
  useIsKycApproved: vi.fn().mockReturnValue({ isApproved: false, isLoading: false, status: undefined }),
  useKycStatus: vi.fn().mockReturnValue({ data: undefined, isLoading: false }),
}));
vi.mock("@/components/invoices/InvoiceRatingWidget", () => ({
  InvoiceRatingWidget: () => null,
}));
vi.mock("@/components/marketplace/InvestorDemandMetrics", () => ({
  InvestorDemandMetrics: () => null,
}));
vi.mock("@/components/invoices/ReturnsBreakdown", () => ({
  ReturnsBreakdown: () => null,
}));

function makeInvoice(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "inv-1",
    title: "Test Invoice",
    seller: "seller-address",
    description: "A test invoice",
    amount: 10000,
    raised: 10000,
    investor_count: 3,
    status: "funded",
    due_date: new Date(Date.now() + 86400000).toISOString(),
    document_url: "ipfs://doc",
    investors: [],
    has_more: false,
    next_cursor: null,
    ...overrides,
  };
}

function renderView(invoice: ReturnType<typeof makeInvoice>) {
  vi.mocked(useInvoiceStatusPolling).mockReturnValue({
    data: invoice,
    isLoading: false,
    isError: false,
    isFetching: false,
  } as any);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <InvoiceDetailView invoiceId={invoice.id as string} />
    </QueryClientProvider>
  );
}

describe("InvoiceDetailView - maturity status (issue #314)", () => {
  it("shows a maturity countdown for a funded invoice with a future maturity date", async () => {
    renderView(
      makeInvoice({ maturity_date: new Date(Date.now() + 5 * 86400000).toISOString() })
    );

    await waitFor(() => {
      expect(screen.getByTestId("maturity-countdown")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("invoice-matured-banner")).not.toBeInTheDocument();
  });

  it("shows a matured banner with settlement pending label once the maturity date has passed", async () => {
    renderView(makeInvoice({ maturity_date: "2025-01-01T00:00:00Z" }));

    await waitFor(() => {
      expect(screen.getByTestId("invoice-matured-banner")).toBeInTheDocument();
    });
    expect(screen.getByTestId("settlement-pending-label")).toBeInTheDocument();
    expect(screen.queryByTestId("maturity-countdown")).not.toBeInTheDocument();
  });

  it("shows no maturity UI for a funded invoice when the backend has not supplied a maturity date", async () => {
    renderView(makeInvoice({ maturity_date: undefined }));

    await waitFor(() => {
      expect(screen.getByTestId("invest-cta")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("maturity-countdown")).not.toBeInTheDocument();
    expect(screen.queryByTestId("invoice-matured-banner")).not.toBeInTheDocument();
  });

  it("shows no maturity UI for an open (not yet funded) invoice", async () => {
    renderView(
      makeInvoice({
        status: "open",
        raised: 5000,
        maturity_date: new Date(Date.now() + 5 * 86400000).toISOString(),
      })
    );

    await waitFor(() => {
      expect(screen.queryByTestId("invoice-detail-loading")).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId("maturity-countdown")).not.toBeInTheDocument();
    expect(screen.queryByTestId("invoice-matured-banner")).not.toBeInTheDocument();
  });
});
