import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FundingProgressBar } from "@/components/invoices/FundingProgressBar";
import { CountdownTimer, isExpired } from "./countdown-timer";
import { InvoiceTagPills } from "./InvoiceTagPills";
import { SettlementCountdown } from "./SettlementCountdown";
import { InvestorDemandMetrics } from "./InvestorDemandMetrics";
import { useComparison } from "./InvoiceComparisonContext";
import { Lock, Scale } from "lucide-react";
import type { Invoice } from "@/lib/api";
import { Money } from "@/components/currency";
import { useSuitabilityTier } from "@/hooks/useSuitabilityTier";
import { REQUIRED_TIER, TIER_LABELS, canInvestInGrade } from "@/lib/suitability";

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  open: "default",
  funded: "secondary",
  settled: "outline",
};

interface InvoiceCardProps {
  invoice: Invoice;
  onInvest?: (invoiceId: string) => void;
}

export function InvoiceCard({ invoice, onInvest }: InvoiceCardProps) {
  const published = invoice.status === "open";
  const expired = isExpired(invoice.due_date);
  const { tier } = useSuitabilityTier();
  const grade = invoice.risk_rating?.tier;
  const locked = !canInvestInGrade(tier, grade);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1 text-base">
            {invoice.title}
          </CardTitle>
          <Badge variant={statusVariant[invoice.status]}>
            {invoice.status}
          </Badge>
        </div>
        <InvoiceTagPills invoice={invoice} />
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">
            <Money xlm={invoice.amount} xlmText={`${invoice.amount.toLocaleString()} XLM`} />
          </span>
          <CountdownTimer deadline={invoice.due_date} published={published} />
        </div>

        <FundingProgressBar
          raised={invoice.raised}
          target={invoice.amount}
          investorCount={invoice.investor_count}
        />

        {/*
          Maturity countdown (#423) and demand signals (#422). The funding
          countdown above tracks the *funding* deadline, which only applies
          while an invoice is open; this one tracks payout, which applies to
          funded and settled invoices alike.
        */}
        <div className="flex items-center justify-between gap-2">
          <SettlementCountdown
            maturityDate={invoice.due_date}
            settledAt={invoice.status === "settled" ? invoice.settled_at : null}
          />
          <InvestorDemandMetrics
            invoiceId={invoice.id}
            investorCountFallback={invoice.investor_count}
          />
        </div>

        {grade && (
          <p className="text-xs text-muted-foreground">Risk grade {grade}</p>
        )}
        {locked && grade && (
          <p className="flex items-center gap-1 text-xs text-amber-700" data-testid="suitability-lock">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Requires risk profile: {TIER_LABELS[REQUIRED_TIER[grade]]} or higher
          </p>
        )}

        <div className="flex gap-2 mt-auto">
          <Button
            className="flex-1"
            disabled={!published || expired || locked}
            onClick={() => onInvest?.(invoice.id)}
          >
            {expired ? "Expired" : locked ? "Locked" : "Invest"}
          </Button>
          <CompareToggleButton invoice={invoice} />
        </div>
      </CardContent>
    </Card>
  );
}
