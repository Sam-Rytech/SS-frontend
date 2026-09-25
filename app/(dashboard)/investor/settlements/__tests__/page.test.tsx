import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SettlementsPage from "../page";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockUseStellarWallet = vi.fn();
vi.mock("@/hooks/useStellarWallet", () => ({
  useStellarWallet: () => mockUseStellarWallet(),
}));

vi.mock("@/components/invoices/SettlementsTab", () => ({
  SettlementsTab: () => <div data-testid="settlements-tab" />,
}));

describe("SettlementsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to connect-wallet when not connected", () => {
    mockUseStellarWallet.mockReturnValue({ isConnected: false, isInitializing: false });

    render(<SettlementsPage />);
    expect(mockReplace).toHaveBeenCalledWith("/connect-wallet");
  });

  it("renders nothing while the wallet is initializing", () => {
    mockUseStellarWallet.mockReturnValue({ isConnected: false, isInitializing: true });

    const { container } = render(<SettlementsPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the settlements tab once connected", () => {
    mockUseStellarWallet.mockReturnValue({ isConnected: true, isInitializing: false });

    render(<SettlementsPage />);
    expect(screen.getByTestId("settlements-tab")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Settlement Claims" })).toBeInTheDocument();
  });
});
