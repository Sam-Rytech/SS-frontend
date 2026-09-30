import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PublishInvoicePage from "../page";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockUseStellarWallet = vi.fn();
vi.mock("@/hooks/useStellarWallet", () => ({
  useStellarWallet: () => mockUseStellarWallet(),
}));

const mockUseSellerKycStatus = vi.fn();
vi.mock("@/hooks/useSellerDashboard", () => ({
  useSellerKycStatus: () => mockUseSellerKycStatus(),
}));

vi.mock("@/components/invoices", () => ({
  PublishInvoiceForm: () => <div data-testid="publish-invoice-form" />,
}));

describe("PublishInvoicePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStellarWallet.mockReturnValue({ isConnected: true, isInitializing: false });
  });

  it("renders nothing while the wallet is initializing", () => {
    mockUseStellarWallet.mockReturnValue({ isConnected: false, isInitializing: true });
    mockUseSellerKycStatus.mockReturnValue({ data: undefined, isLoading: true });

    const { container } = render(<PublishInvoicePage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing while the KYC status is loading", () => {
    mockUseSellerKycStatus.mockReturnValue({ data: undefined, isLoading: true });

    const { container } = render(<PublishInvoicePage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("blocks publishing and links to Start KYC when KYC was never submitted", () => {
    mockUseSellerKycStatus.mockReturnValue({
      data: { status: "not_submitted" },
      isLoading: false,
    });

    render(<PublishInvoicePage />);

    expect(screen.getByTestId("publish-kyc-blocked")).toBeInTheDocument();
    expect(screen.queryByTestId("publish-invoice-form")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Complete KYC" })).toHaveAttribute(
      "href",
      "/kyc/start",
    );
  });

  it("blocks publishing and links to the reapply flow when KYC was rejected", () => {
    mockUseSellerKycStatus.mockReturnValue({
      data: { status: "rejected" },
      isLoading: false,
    });

    render(<PublishInvoicePage />);

    expect(screen.getByTestId("publish-kyc-blocked")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Complete KYC" })).toHaveAttribute(
      "href",
      "/kyc/reapply",
    );
  });

  it("blocks publishing while KYC is pending review", () => {
    mockUseSellerKycStatus.mockReturnValue({
      data: { status: "pending" },
      isLoading: false,
    });

    render(<PublishInvoicePage />);

    expect(screen.getByTestId("publish-kyc-blocked")).toBeInTheDocument();
    expect(screen.queryByTestId("publish-invoice-form")).not.toBeInTheDocument();
  });

  it("renders the publish form once KYC is approved", () => {
    mockUseSellerKycStatus.mockReturnValue({
      data: { status: "approved" },
      isLoading: false,
    });

    render(<PublishInvoicePage />);

    expect(screen.getByTestId("publish-invoice-form")).toBeInTheDocument();
    expect(screen.queryByTestId("publish-kyc-blocked")).not.toBeInTheDocument();
  });
});
