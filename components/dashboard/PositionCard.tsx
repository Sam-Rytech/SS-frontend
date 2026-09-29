"use client";

import { Card, CardContent } from "@/components/ui/card";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { HoldingActionsMenu } from "@/components/dashboard/HoldingActionsMenu";
import { TopUpModal } from "@/components/invoices/TopUpModal";
import { KeyTransferModal } from "@/components/dashboard/KeyTransferModal";
import { PositionTransferModal } from "@/components/dashboard/PositionTransferModal";
import { BurnKeyModal } from "@/components/keys/BurnKeyModal";
import type { InvestmentPosition } from "@/lib/portfolio";

function formatCommittedXlm(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Rounds to two decimal places; whole numbers render without trailing zeros (e.g. 100%). */
export function formatSharePercent(share: number | null | undefined): string {
  if (typeof share !== "number" || Number.isNaN(share)) {
    return "—";
  }
  return `${Number(share.toFixed(2))}%`;
}

interface PositionCardProps {
  position: InvestmentPosition;
}

export function PositionCard({ position }: PositionCardProps) {
  const shareDisplay = formatSharePercent(position.share_percent);
  const isKeyHolding = Boolean(position.key_id);
  const hasTransferableBalance = isKeyHolding && (position.quantity ?? 0) > 0;
  const canTopUp = position.status === "active" && (position.remaining_capacity ?? 0) > 0;

  return (
    <Card data-testid="position-card">
      <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{position.invoice_title}</p>
          <p className="text-sm text-muted-foreground">
            <span data-testid="position-committed">
              {formatCommittedXlm(position.committed_amount)} XLM committed
            </span>
            {" · "}
            <span data-testid="position-share">{shareDisplay}</span>
            {shareDisplay !== "—" ? " share" : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isKeyHolding && <HoldingActionsMenu position={position} />}
          {canTopUp && (
            <TopUpModal
              invoiceId={position.invoice_id}
              currentCommittedAmount={position.committed_amount}
              remainingCapacity={position.remaining_capacity ?? 0}
            />
          )}
          {position.status === "active" && (
            <PositionTransferModal position={position} />
          )}
          {hasTransferableBalance && <KeyTransferModal position={position} />}
          {hasTransferableBalance && <BurnKeyModal position={position} />}
          <InvoiceStatusBadge status={position.status} />
        </div>
      </CardContent>
    </Card>
  );
}
