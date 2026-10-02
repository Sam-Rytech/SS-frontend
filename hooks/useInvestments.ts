"use client";

import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { investInInvoice, transferInvoiceFractions, transferInvoicePosition } from "@/lib/api";
import type { InvoiceDetail } from "@/lib/api";
import { toast } from "sonner";
import { getNetwork, getExplorerUrl } from "@/lib/stellar";
import { INVOICES_QUERY_KEY } from "./useInvoices";
import { PORTFOLIO_QUERY_KEY } from "./usePortfolio";

interface InvestMutationVars {
  invoiceId: string;
  amount: number;
}

/** One toast id per invoice so the pending state morphs into the resolved
 * state in place, rather than stacking a second toast (issue #310). */
function investTxToastId(invoiceId: string): string {
  return `invest-tx-${invoiceId}`;
}

export function useInvestMutation() {
  const queryClient = useQueryClient();
  // Always-fresh reference to the mutation's own `mutate`, so the retry CTA
  // on a failure toast can resubmit the same variables without a circular
  // reference to the mutation object being constructed below.
  const mutateRef = useRef<(vars: InvestMutationVars) => void>(() => {});

  const mutation = useMutation({
    mutationFn: ({ invoiceId, amount }: InvestMutationVars) =>
      investInInvoice(invoiceId, amount),

    onMutate: async ({ invoiceId, amount }) => {
      // Transaction status toast, shown synchronously and immediately on
      // submission (issue #310) — before the cancelQueries await below so
      // there's no delay, however small, before the wallet sees feedback.
      // Persisted (by re-using this id) until confirmation or failure.
      toast.loading("Submitting transaction…", {
        id: investTxToastId(invoiceId),
      });

      await queryClient.cancelQueries({ queryKey: ["invoice", invoiceId] });

      const previous = queryClient.getQueryData<InvoiceDetail>([
        "invoice",
        invoiceId,
      ]);

      if (previous) {
        queryClient.setQueryData<InvoiceDetail>(
          ["invoice", invoiceId],
          (old) => {
            if (!old) return old;
            const newRaised = Math.min(old.raised + amount, old.amount);
            return {
              ...old,
              raised: newRaised,
              investor_count: old.investor_count + 1,
            };
          },
        );
      }

      return { previous };
    },

    onError: (_err, vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["invoice", vars.invoiceId], context.previous);
      }
      toast.error("Investment failed. Your progress bar has been restored.", {
        id: investTxToastId(vars.invoiceId),
        action: {
          label: "Retry",
          onClick: () => mutateRef.current(vars),
        },
      });
    },

    onSuccess: async (data, { invoiceId, amount }) => {
      const network = await getNetwork();
      const explorerUrl =
        data.tx_hash && network ? getExplorerUrl(data.tx_hash, network) : null;

      toast.success(
        `Investment of ${amount.toLocaleString()} XLM committed successfully`,
        {
          id: investTxToastId(invoiceId),
          duration: 5000,
          action: explorerUrl
            ? {
                label: "View on Explorer",
                onClick: () => window.open(explorerUrl, "_blank"),
              }
            : undefined,
        },
      );
    },

    onSettled: (_data, _error, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
    },
  });

  mutateRef.current = mutation.mutate;

  return mutation;
}

interface TransferPositionMutationVars {
  invoiceId: string;
  buyer: string;
  salePriceXlm: number;
  walletAddress: string;
  token?: string | null;
}

/** Issue #119: sells an investor's position in a funded invoice to another
 * wallet via the `transfer_position` contract function. */
export function useTransferPositionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      buyer,
      salePriceXlm,
      walletAddress,
      token,
    }: TransferPositionMutationVars) =>
      transferInvoicePosition(
        invoiceId,
        buyer,
        salePriceXlm,
        walletAddress,
        token ?? undefined
      ),

    onSuccess: () => {
      toast.success("Position transferred successfully");
      // Removes the transferred position from the investor's portfolio list
      // (issue #119's "position removed from list after confirmed transfer").
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
    },

    onError: () => {
      toast.error("Position transfer failed");
    },
  });
}

interface TransferFractionsMutationVars {
  invoiceId: string;
  recipient: string;
  quantity: number;
  walletAddress: string;
  token?: string | null;
}

/**
 * Issue #421: sends a number of invoice fractions the investor already holds to
 * another Stellar wallet, without selling them.
 *
 * The transaction hash is returned rather than swallowed because the transfer
 * modal shows it as a receipt link — a confirmed transfer the user cannot
 * verify is not a confirmed transfer as far as they are concerned.
 */
export function useTransferFractionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      recipient,
      quantity,
      walletAddress,
      token,
    }: TransferFractionsMutationVars) =>
      transferInvoiceFractions(
        invoiceId,
        recipient,
        quantity,
        walletAddress,
        token ?? undefined
      ),

    onSuccess: (data, { quantity }) => {
      toast.success(
        `Transferred ${quantity} fraction${quantity === 1 ? "" : "s"} successfully`
      );
      // The sender's balance drops, so the portfolio row this was opened from
      // has to re-read.
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
    },

    onError: () => {
      toast.error("Fraction transfer failed");
    },
  });
}
