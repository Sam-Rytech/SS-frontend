"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/currency";
import {
  computeReputationScore,
  type IssuerInvoice,
  type ReputationLabel,
} from "@/lib/issuers";

const LABEL_TEXT: Record<ReputationLabel, string> = {
  "no-track-record": "No track record yet",
  poor: "Poor",
  fair: "Fair",
  good: "Good",
  excellent: "Excellent",
};

/** Ring colour tracks the score band so the grade is readable at a glance. */
function scoreColor(label: ReputationLabel): string {
  switch (label) {
    case "excellent":
      return "text-green-600";
    case "good":
      return "text-emerald-600";
    case "fair":
      return "text-amber-600";
    case "poor":
      return "text-red-600";
    default:
      return "text-muted-foreground";
  }
}

interface IssuerScoreCardProps {
  invoices: IssuerInvoice[];
  isLoading?: boolean;
}

/**
 * Surfaces the reputation score alongside the inputs behind it, so an investor
 * can see how many invoices the grade is actually based on.
 */
export function IssuerScoreCard({ invoices, isLoading = false }: IssuerScoreCardProps) {
  if (isLoading) {
    return (
      <Card data-testid="issuer-score-loading">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const reputation = computeReputationScore(invoices);

  return (
    <Card data-testid="issuer-score-card">
      <CardHeader>
        <h2 className="text-lg font-semibold">Reputation</h2>
        <p className="text-sm text-muted-foreground">
          Derived from on-time settlements across settled invoices.
        </p>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-6">
        <div className="flex flex-col items-center">
          <span
            data-testid="issuer-reputation-score"
            aria-label={`Reputation score ${reputation.score} out of 100`}
            className={`text-4xl font-bold tabular-nums ${scoreColor(reputation.label)}`}
          >
            {reputation.score}
          </span>
          <span
            data-testid="issuer-reputation-label"
            className="text-xs text-muted-foreground"
          >
            {LABEL_TEXT[reputation.label]}
          </span>
        </div>

        <dl className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">On-time rate</dt>
            <dd
              data-testid="issuer-on-time-rate"
              className="text-lg font-semibold tabular-nums"
            >
              {reputation.onTimeRate.toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Settled invoices</dt>
            <dd
              data-testid="issuer-settled-count"
              className="text-lg font-semibold tabular-nums"
            >
              {reputation.settledCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">On time</dt>
            <dd
              data-testid="issuer-on-time-count"
              className="text-lg font-semibold tabular-nums"
            >
              {reputation.onTimeCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Total invoices</dt>
            <dd
              data-testid="issuer-total-invoice-count"
              className="text-lg font-semibold tabular-nums"
            >
              {reputation.totalInvoiceCount}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

interface TotalFundedProps {
  totalFunded: number;
}

/** Lifetime funded volume, shown in the issuer header. */
export function TotalFunded({ totalFunded }: TotalFundedProps) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">Total funded</p>
      <p data-testid="issuer-total-funded" className="text-sm font-semibold">
        <Money xlm={totalFunded} />
      </p>
    </div>
  );
}
