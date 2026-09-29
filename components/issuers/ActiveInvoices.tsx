"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FundingProgressBar } from "@/components/invoices/FundingProgressBar";
import { CountdownTimer } from "@/components/marketplace";
import { formatPercent } from "@/lib/format";
import { Money } from "@/components/currency";
import {
  formatDate,
  fundingProgressPercent,
  isOpenForInvestment,
  type IssuerInvoice,
} from "@/lib/issuers";

interface ActiveInvoicesProps {
  invoices: IssuerInvoice[];
  isLoading?: boolean;
  /** Injected so the section is deterministic under test. */
  now?: Date;
}

function ActiveInvoicesSkeleton() {
  return (
    <div className="space-y-4" data-testid="active-invoices-loading">
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
  );
}

/**
 * Open listings for an issuer, each with its own invest CTA. Invoices that are
 * past maturity or no longer open are excluded rather than shown as dead ends.
 */
export function ActiveInvoices({ invoices, isLoading = false, now }: ActiveInvoicesProps) {
  const referenceDate = now ?? new Date();
  const active = invoices
    .filter((invoice) => isOpenForInvestment(invoice, referenceDate))
    .sort(
      (a, b) =>
        new Date(a.maturity_date).getTime() - new Date(b.maturity_date).getTime()
    );

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Active invoices</h2>
        <p className="text-sm text-muted-foreground">
          Currently open for investment.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <ActiveInvoicesSkeleton />
        ) : active.length === 0 ? (
          <p
            data-testid="active-invoices-empty"
            className="py-6 text-center text-sm text-muted-foreground"
          >
            No open invoices right now. Check back soon.
          </p>
        ) : (
          active.map((invoice) => (
            <div
              key={invoice.id}
              data-testid={`active-invoice-${invoice.id}`}
              className="rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/marketplace/${invoice.id}`}
                    className="font-medium hover:underline"
                  >
                    {invoice.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatPercent(invoice.yield_percentage)} annualised · matures{" "}
                    {formatDate(invoice.maturity_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    <Money xlm={invoice.face_value} />
                  </p>
                  <CountdownTimer
                    deadline={invoice.maturity_date}
                    published={true}
                  />
                </div>
              </div>

              <div className="mt-3">
                <FundingProgressBar
                  raised={invoice.raised}
                  target={invoice.face_value}
                  investorCount={invoice.investor_count}
                />
                <p
                  data-testid={`active-invoice-progress-${invoice.id}`}
                  className="mt-1 text-xs text-muted-foreground"
                >
                  {fundingProgressPercent(invoice).toFixed(1)}% funded
                </p>
              </div>

              <Button asChild className="mt-3 w-full">
                <Link
                  href={`/marketplace/${invoice.id}`}
                  data-testid={`invest-cta-${invoice.id}`}
                >
                  Invest
                </Link>
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
