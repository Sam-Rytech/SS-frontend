import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { SellerDashboard } from "../SellerDashboard";

vi.mock("@/hooks/useSellerDashboard", () => ({
  useSellerDashboard: vi.fn(),
  useSellerKycStatus: vi.fn(),
}));

vi.mock("@/hooks/useStellarWallet", () => ({
  useStellarWallet: vi.fn().mockReturnValue({
    address: "GWALLET1111111111111111111111111111111111111111111111",
    isConnected: true,
    isConnecting: false,
    isInitializing: false,
  }),
}));

// SellerDashboard renders SellerInvoiceTabs, which calls these mutation
// hooks unconditionally; without a mock they reach the real useAuth(),
// which throws outside an AuthProvider.
vi.mock("@/hooks/useSellerInvoiceActions", () => ({
  useSubmitDraftInvoice: () => ({
    mutate: vi.fn(),
    isPending: false,
    variables: undefined,
  }),
  useDeleteDraftInvoice: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
  }),
}));

import {
  useSellerDashboard,
  useSellerKycStatus,
} from "@/hooks/useSellerDashboard";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function makeDashboardData(invoices: any[]) {
  return {
    total_invoices: invoices.length,
    total_funded: invoices.filter((i) => i.status === "funded").length,
    total_settled: invoices.filter((i) => i.status === "settled").length,
    total_raised: invoices.reduce((sum, i) => sum + i.raised, 0),
    invoices,
  };
}

function makeInvoice(overrides: any = {}) {
  return {
    id: "inv-1",
    title: "Test Invoice",
    seller: "seller-address",
    amount: 10000,
    raised: 5000,
    investor_count: 3,
    status: "open",
    due_date: new Date(Date.now() + 86400000).toISOString(),
    has_more: false,
    next_cursor: null,
    ...overrides,
  };
}

describe("SellerDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSellerKycStatus).mockReturnValue({
      data: undefined,
    } as any);
  });

  it("shows loading skeleton while data is loading", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });
    expect(screen.getByTestId("seller-dashboard-loading")).toBeInTheDocument();
  });

  it("shows empty state when no invoices", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([]),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });
    // The invoice breakdown (SellerInvoiceTabs) opens on the draft tab.
    expect(
      screen.getByText("No drafts. Invoices you start but don't submit appear here.")
    ).toBeInTheDocument();
    expect(screen.getByTestId("seller-invoices-empty")).toBeInTheDocument();
  });

  it("points Create Invoice at the publish form", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([]),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });

    const link = screen.getByRole("link", { name: "Create Invoice" });
    expect(link).toHaveAttribute("href", "/seller/publish");
  });

  it("shows skeleton rows while loading, not the empty state", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });

    expect(screen.getByTestId("seller-dashboard-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("seller-invoices-empty")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No invoices yet — create your first invoice to get started")
    ).not.toBeInTheDocument();
  });

  it("does not show the empty state when invoices exist", () => {
    // The default-active tab is "draft", so the fixture must be a draft
    // invoice to appear without switching tabs first.
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([
        makeInvoice({ title: "Existing Invoice", status: "draft" }),
      ]),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText("Existing Invoice")).toBeInTheDocument();
    expect(screen.queryByTestId("seller-invoices-empty")).not.toBeInTheDocument();
  });

  it("renders stat cards", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([makeInvoice()]),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText("Total Invoices")).toBeInTheDocument();
    expect(screen.getByText("Total Funded")).toBeInTheDocument();
    expect(screen.getByText("Total Settled")).toBeInTheDocument();
    expect(screen.getByText("XLM Raised")).toBeInTheDocument();
  });

  it("shows rejected banner for rejected invoices", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([
        makeInvoice({ status: "rejected", rejection_reason: "Missing documentation" }),
      ]),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });

    expect(screen.getByTestId("rejected-banner")).toBeInTheDocument();
    expect(screen.getByText(/This invoice was not approved/)).toBeInTheDocument();
    expect(screen.getByText(/Missing documentation/)).toBeInTheDocument();
  });

  it("shows Edit and resubmit action for a rejected invoice", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([
        makeInvoice({ id: "inv-abc", status: "rejected", rejection_reason: "Invalid amount" }),
      ]),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });

    const link = screen.getByRole("link", { name: "Edit and resubmit" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/seller/invoices/inv-abc/edit");
  });

  it("does not show rejected banner for open invoices", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([makeInvoice({ status: "open" })]),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });
    expect(screen.queryByTestId("rejected-banner")).not.toBeInTheDocument();
  });

  it("does not show rejected banner for settled invoices", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([makeInvoice({ status: "settled" })]),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });
    expect(screen.queryByTestId("rejected-banner")).not.toBeInTheDocument();
  });

  it("does not show rejected banner for funded invoices", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([makeInvoice({ status: "funded" })]),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });
    expect(screen.queryByTestId("rejected-banner")).not.toBeInTheDocument();
  });

  it("shows rejected KYC banner with the rejection reason", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([]),
      isLoading: false,
    } as any);
    vi.mocked(useSellerKycStatus).mockReturnValue({
      data: { status: "rejected", rejection_reason: "Expired ID" },
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });

    expect(screen.getByTestId("kyc-rejected-banner")).toHaveTextContent(
      "Your KYC was rejected. Reason: Expired ID. Please resubmit."
    );
    expect(screen.getByRole("link", { name: "Go to KYC" })).toHaveAttribute(
      "href",
      "/kyc/reapply"
    );
  });

  it("shows requires resubmission KYC banner", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([]),
      isLoading: false,
    } as any);
    vi.mocked(useSellerKycStatus).mockReturnValue({
      data: { status: "requires_resubmission" },
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });

    expect(screen.getByTestId("kyc-resubmission-banner")).toHaveTextContent(
      "Additional documents required. Please update your KYC."
    );
  });

  it("shows onboarding checklist until wallet, KYC, and first invoice are complete", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: {
        ...makeDashboardData([]),
        display_name: null,
        avatar_url: null,
      },
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });

    expect(screen.getByTestId("onboarding-checklist")).toBeInTheDocument();
  });
});

describe("SellerDashboard - pipeline breakdown (issue #313)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSellerKycStatus).mockReturnValue({
      data: undefined,
    } as any);
  });

  function makePipelineData() {
    return makeDashboardData([
      makeInvoice({ id: "inv-draft", status: "draft" }),
      makeInvoice({ id: "inv-open-1", status: "open" }),
      makeInvoice({ id: "inv-open-2", status: "open" }),
      makeInvoice({ id: "inv-funded", status: "funded" }),
      makeInvoice({ id: "inv-settled", status: "settled" }),
      makeInvoice({ id: "inv-rejected", status: "rejected" }),
    ]);
  }

  it("shows an accurate count per pipeline stage", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makePipelineData(),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });

    expect(screen.getByTestId("pipeline-stage-all")).toHaveTextContent("All (6)");
    expect(screen.getByTestId("pipeline-stage-draft")).toHaveTextContent("Draft (1)");
    expect(screen.getByTestId("pipeline-stage-open")).toHaveTextContent("Active (2)");
    expect(screen.getByTestId("pipeline-stage-funded")).toHaveTextContent("Funded (1)");
    expect(screen.getByTestId("pipeline-stage-settled")).toHaveTextContent("Settled (1)");
    expect(screen.getByTestId("pipeline-stage-rejected")).toHaveTextContent("Rejected (1)");
  });

  it("filters the invoice list to the selected stage", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makePipelineData(),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByTestId("pipeline-stage-funded"));

    expect(screen.getByText("Test Invoice")).toBeInTheDocument();
    // Only one card should render for the funded stage. Scoped to the
    // invoice list's tabpanel — the page also has an unrelated h3 in the
    // onboarding checklist.
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getAllByRole("heading", { level: 3 })).toHaveLength(1);
  });

  it("shows a stage-specific empty state when a stage has no invoices", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makeDashboardData([makeInvoice({ status: "open" })]),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByTestId("pipeline-stage-rejected"));

    // SellerInvoiceTabs uses one shared empty-state testid for every
    // tab/stage rather than a separate stage-specific one.
    expect(screen.getByTestId("seller-invoices-empty")).toBeInTheDocument();
    expect(
      screen.getByText("No drafts. Invoices you start but don't submit appear here.")
    ).toBeInTheDocument();
  });

  it("returns to the draft tab's own list when 'All' is reselected", () => {
    // Clearing the pipeline filter falls back to SellerInvoiceTabs' own tab
    // state (defaulting to "draft") rather than an unfiltered, cross-tab
    // view — there is no single view that shows every status at once.
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makePipelineData(),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByTestId("pipeline-stage-funded"));
    fireEvent.click(screen.getByTestId("pipeline-stage-all"));

    const panel = screen.getByRole("tabpanel");
    // The draft tab holds both the draft and the rejected fixture.
    expect(within(panel).getAllByRole("heading", { level: 3 })).toHaveLength(2);
  });

  it("shows a persistent quick action to submit a new invoice", () => {
    vi.mocked(useSellerDashboard).mockReturnValue({
      data: makePipelineData(),
      isLoading: false,
    } as any);

    render(<SellerDashboard />, { wrapper: createWrapper() });

    const link = screen.getByTestId("quick-action-submit-invoice");
    expect(link).toHaveAttribute("href", "/seller/publish");
  });
});
