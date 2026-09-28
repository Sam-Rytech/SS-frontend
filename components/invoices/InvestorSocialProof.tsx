"use client";

import { Users } from "lucide-react";
import { investorSocialProofLabel } from "@/lib/invoiceShare";

interface InvestorSocialProofProps {
  count: number;
  className?: string;
}

/**
 * Social-proof label for the invoice detail page (issue #421):
 * "X investors have already invested".
 *
 * Shown whenever the count is known (including 0, which reads as an
 * invitation rather than an error) so the label never flickers in late.
 */
export function InvestorSocialProof({ count, className = "" }: InvestorSocialProofProps) {
  const safeCount = Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
  return (
    <p
      data-testid="investor-social-proof"
      aria-label={investorSocialProofLabel(safeCount)}
      className={`flex items-center gap-1.5 text-sm text-muted-foreground ${className}`}
    >
      <Users className="size-4" aria-hidden="true" />
      <span data-testid="investor-count-label">{investorSocialProofLabel(safeCount)}</span>
    </p>
  );
}
