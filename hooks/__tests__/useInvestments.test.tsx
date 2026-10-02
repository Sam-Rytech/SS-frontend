import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useInvestMutation } from "@/hooks/useInvestments";

const investInInvoice = vi.fn();
const loadingToast = vi.fn();
const successToast = vi.fn();
const errorToast = vi.fn();
const getNetwork = vi.fn();
const getExplorerUrl = vi.fn();

vi.mock("@/lib/api", () => ({
  investInInvoice: (...args: unknown[]) => investInInvoice(...args),
  transferInvoicePosition: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    loading: (...args: unknown[]) => loadingToast(...args),
    success: (...args: unknown[]) => successToast(...args),
    error: (...args: unknown[]) => errorToast(...args),
  },
}));

vi.mock("@/lib/stellar", () => ({
  getNetwork: (...args: unknown[]) => getNetwork(...args),
  getExplorerUrl: (...args: unknown[]) => getExplorerUrl(...args),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useInvestMutation - Soroban transaction status tracking (issue #310)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getNetwork.mockResolvedValue("testnet");
    getExplorerUrl.mockImplementation(
      (hash: string, network: string) =>
        `https://stellar.expert/explorer/${network}/tx/${hash}`
    );
  });

  it("shows a pending toast immediately on submission, keyed by invoice id", () => {
    investInInvoice.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useInvestMutation(), { wrapper });
    result.current.mutate({ invoiceId: "inv-1", amount: 100 });

    expect(loadingToast).toHaveBeenCalledWith(
      "Submitting transaction…",
      expect.objectContaining({ id: "invest-tx-inv-1" })
    );
  });

  it("updates the same toast to a success state with an explorer link when a tx hash is returned", async () => {
    investInInvoice.mockResolvedValue({
      success: true,
      invested_amount: 100,
      tx_hash: "abc123",
    });

    const { result } = renderHook(() => useInvestMutation(), { wrapper });
    result.current.mutate({ invoiceId: "inv-1", amount: 100 });

    await waitFor(() => expect(successToast).toHaveBeenCalled());

    const [, options] = successToast.mock.calls[0];
    expect(options.id).toBe("invest-tx-inv-1");
    expect(options.action.label).toBe("View on Explorer");
    expect(getExplorerUrl).toHaveBeenCalledWith("abc123", "testnet");
  });

  it("omits the explorer action when no tx hash is returned", async () => {
    investInInvoice.mockResolvedValue({ success: true, invested_amount: 100 });

    const { result } = renderHook(() => useInvestMutation(), { wrapper });
    result.current.mutate({ invoiceId: "inv-1", amount: 100 });

    await waitFor(() => expect(successToast).toHaveBeenCalled());

    const [, options] = successToast.mock.calls[0];
    expect(options.action).toBeUndefined();
  });

  it("updates the same toast to a failed state with a retry action on error", async () => {
    investInInvoice.mockRejectedValue(new Error("Investment failed"));

    const { result } = renderHook(() => useInvestMutation(), { wrapper });
    result.current.mutate({ invoiceId: "inv-1", amount: 100 });

    await waitFor(() => expect(errorToast).toHaveBeenCalled());

    const [, options] = errorToast.mock.calls[0];
    expect(options.id).toBe("invest-tx-inv-1");
    expect(options.action.label).toBe("Retry");
  });

  it("resubmits the same variables when the retry action is invoked", async () => {
    investInInvoice
      .mockRejectedValueOnce(new Error("Investment failed"))
      .mockResolvedValueOnce({ success: true, invested_amount: 100 });

    const { result } = renderHook(() => useInvestMutation(), { wrapper });
    result.current.mutate({ invoiceId: "inv-1", amount: 100 });

    await waitFor(() => expect(errorToast).toHaveBeenCalled());
    const [, options] = errorToast.mock.calls[0];

    options.action.onClick();

    await waitFor(() => expect(investInInvoice).toHaveBeenCalledTimes(2));
    expect(investInInvoice).toHaveBeenLastCalledWith("inv-1", 100);
  });
});
