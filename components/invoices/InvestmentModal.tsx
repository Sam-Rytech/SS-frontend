"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InvestmentAmountInput } from "@/components/invoices/InvestmentAmountInput";
import { FeeTierDisplay } from "@/components/invoices/FeeTierDisplay";
import { PriceImpactWarning } from "@/components/invoices/PriceImpactWarning";
import { TopUpCta } from "@/components/wallet/TopUpCta";
import { AccreditationGateSteps } from "@/components/invoices/AccreditationGateModal";
import { useInvestMutation } from "@/hooks/useInvestments";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import { useWallet } from "@/context/WalletContext";
import { useAccreditation } from "@/context/AccreditationContext";
import { formatUsdc, formatXLM } from "@/lib/format";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface InvestmentModalProps {
  invoiceId: string;
  minInvestment: number;
  maxInvestment: number;
  /** Total funding cap used for price-impact calculation (issue #344). */
  fundingCap?: number;
  onSuccess?: () => void;
}

export function InvestmentModal({
  invoiceId,
  minInvestment,
  maxInvestment,
  fundingCap,
  onSuccess,
}: InvestmentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [validAmount, setValidAmount] = useState<number | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const investMutation = useInvestMutation();
  const { address, network } = useWallet();
  const { balance, refresh } = useUsdcBalance(address, network);

  // A null balance means the balance is still unknown, which is not the same as
  // being underfunded, so it must not block the investment.
  const insufficientBalance =
    balance !== null && validAmount !== null && validAmount > balance;

  // Accreditation acknowledgement gate (issue #312): first-time investors
  // must complete the disclosure steps before the investment form appears.
  const { isAcknowledged } = useAccreditation();

  const handleInvest = async () => {
    if (validAmount === null || amountError !== null || insufficientBalance) return;

    await investMutation.mutateAsync({ invoiceId, amount: validAmount });
    setIsOpen(false);
    setValidAmount(null);
    setAmountError(null);
    // The chain has moved; re-read the balance instead of waiting for the
    // 60s poll.
    refresh();
    onSuccess?.();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button data-testid="invest-button">Invest</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        {!isAcknowledged ? (
          <AccreditationGateSteps
            onCancel={() => setIsOpen(false)}
            onAcknowledged={() => {
              /* Falls through to the investment form below on next render. */
            }}
          />
        ) : (
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Invest in this Invoice</h3>
              <p className="text-sm text-muted-foreground">
                Enter the amount you&apos;d like to invest
              </p>
            </div>

            <div className="flex items-center justify-between text-sm" data-testid="investment-modal-min-investment">
              <span className="text-muted-foreground">Minimum investment</span>
              <span
                className="font-medium tabular-nums"
                data-testid="investment-modal-min-value"
              >
                {formatXLM(minInvestment)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Wallet USDC balance
              </span>
              <span
                className="font-medium tabular-nums"
                data-testid="investment-modal-balance"
              >
                {balance === null ? "Loading…" : formatUsdc(balance)}
              </span>
            </div>

            <InvestmentAmountInput
              min={minInvestment}
              max={maxInvestment}
              onValidAmountChange={setValidAmount}
              onErrorChange={setAmountError}
            />

            {insufficientBalance && address && (
              <TopUpCta
                address={address}
                balance={balance}
                requiredAmount={validAmount as number}
              />
            )}

            <FeeTierDisplay amount={validAmount} />

            {/* #450 — link to the full public fee schedule so the tier shown
                above can be read in context (what it applies to, and the other
                fees that will hit this investment later). */}
            <p className="text-xs text-muted-foreground">
              See the{" "}
              <Link
                href="/fees"
                className="underline underline-offset-2 hover:text-foreground"
                data-testid="investment-modal-fees-link"
              >
                full fee schedule
              </Link>{" "}
              for every fee that applies.
            </p>

            <PriceImpactWarning
              amount={validAmount}
              fundingCap={fundingCap ?? maxInvestment}
            />

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInvest}
                disabled={
                  validAmount === null ||
                  amountError !== null ||
                  investMutation.isPending ||
                  insufficientBalance
                }
                data-testid="investment-submit"
                className="flex-1"
              >
                {investMutation.isPending ? "Investing..." : "Invest"}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
