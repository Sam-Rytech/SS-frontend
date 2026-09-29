"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { FundingProgressBar } from "@/components/invoices/FundingProgressBar";
import { useSuitabilityTier } from "@/hooks/useSuitabilityTier";
import { REQUIRED_TIER, TIER_LABELS, canInvestInGrade } from "@/lib/suitability";
import { formatPercent } from "@/lib/format";
import type { Invoice } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Money } from "@/components/currency";

/** Percentage of face value already funded, clamped to 0-100. */
export function fundedPercent(invoice: Invoice): number {
  if (!invoice.amount || invoice.amount <= 0) return 0;
  return Math.min(Math.max((invoice.raised / invoice.amount) * 100, 0), 100);
}

/**
 * Maturity check against an explicit clock. `isExpired` reads `Date.now()`
 * directly, which would make this table untestable.
 */
function hasMatured(invoice: Invoice, now: Date): boolean {
  return new Date(invoice.due_date).getTime() <= now.getTime();
}

const statusBadgeVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  open: "default",
  funded: "secondary",
  settled: "outline",
  rejected: "destructive",
};

interface Row {
  label: string;
  testId: string;
  render: (invoice: Invoice) => React.ReactNode;
}

const ROWS: Row[] = [
  {
    label: "Annualised yield",
    testId: "row-yield",
    render: (invoice) => formatPercent(invoice.yield_percentage),
  },
  {
    label: "Maturity date",
    testId: "row-maturity",
    render: (invoice) => new Date(invoice.due_date).toLocaleDateString(),
  },
  {
    label: "Face value",
    testId: "row-face-value",
    render: (invoice) => (
      <Money xlm={invoice.amount} xlmText={`${invoice.amount.toLocaleString()} XLM`} />
    ),
  },
  {
    label: "Issuer",
    testId: "row-issuer",
    render: (invoice) => (
      <Link
        href={`/issuers/${encodeURIComponent(invoice.seller)}`}
        className="font-medium hover:underline"
      >
        <span className="font-mono text-xs">{invoice.seller}</span>
      </Link>
    ),
  },
  {
    label: "Issuer score",
    testId: "row-issuer-score",
    render: (invoice) =>
      invoice.issuer_score === undefined || invoice.issuer_score === null ? (
        <span className="text-muted-foreground">No track record</span>
      ) : (
        <span className="font-semibold tabular-nums">{invoice.issuer_score}</span>
      ),
  },
  {
    label: "Status",
    testId: "row-status",
    render: (invoice) => (
      <Badge variant={statusBadgeVariant[invoice.status] ?? "secondary"}>
        {invoice.status}
      </Badge>
    ),
  },
  {
    label: "Risk grade",
    testId: "row-risk",
    render: (invoice) => invoice.risk_rating?.tier ?? "N/A",
  },
  {
    label: "Investors",
    testId: "row-investors",
    render: (invoice) => invoice.investor_count,
  },
  {
    label: "Funding progress",
    testId: "row-funding",
    // FundingProgressBar already renders the percentage, the raised/target
    // split and the investor count, so it is not restated here.
    render: (invoice) => (
      <FundingProgressBar
        raised={invoice.raised}
        target={invoice.amount}
        investorCount={invoice.investor_count}
      />
    ),
  },
];

interface InvoiceComparisonTableProps {
  invoices: Invoice[];
  /** Injected so investability is deterministic under test. */
  now?: Date;
}

/**
 * Side-by-side comparison of the selected invoices across the metrics an
 * investor actually chooses between. Shared by the comparison modal and the
 * dedicated /marketplace/compare page so both stay in step.
 */
export function InvoiceComparisonTable({ invoices, now }: InvoiceComparisonTableProps) {
  const { tier } = useSuitabilityTier();
  const referenceDate = now ?? new Date();

  if (invoices.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-separate border-spacing-0 text-sm"
        data-testid="compare-table"
      >
        <caption className="sr-only">
          Side-by-side comparison of {invoices.length} selected invoices
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-44 border-b p-3 text-left align-bottom">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Metric
              </span>
            </th>
            {invoices.map((invoice) => (
              <th
                key={invoice.id}
                scope="col"
                data-testid={`compare-column-${invoice.id}`}
                className="min-w-[12rem] border-b p-3 text-left align-bottom"
              >
                <Link
                  href={`/marketplace/${invoice.id}`}
                  className="font-semibold hover:underline"
                >
                  {invoice.title}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.testId} data-testid={row.testId}>
              <th
                scope="row"
                className="border-b p-3 text-left align-top font-medium text-muted-foreground"
              >
                {row.label}
              </th>
              {invoices.map((invoice) => (
                <td
                  key={`${row.testId}-${invoice.id}`}
                  data-testid={`${row.testId}-${invoice.id}`}
                  className={cn("border-b p-3 align-top tabular-nums")}
                >
                  {row.render(invoice)}
                </td>
              ))}
            </tr>
          ))}
          <tr data-testid="row-cta">
            <th
              scope="row"
              className="p-3 text-left align-top font-medium text-muted-foreground"
            >
              Action
            </th>
            {invoices.map((invoice) => {
              const grade = invoice.risk_rating?.tier;
              const investable =
                invoice.status === "open" &&
                !hasMatured(invoice, referenceDate) &&
                canInvestInGrade(tier, grade);

              if (!investable) {
                return (
                  <td key={`cta-${invoice.id}`} className="p-3 align-top">
                    <span
                      data-testid={`compare-closed-${invoice.id}`}
                      className="text-xs text-muted-foreground"
                    >
                      {grade && !canInvestInGrade(tier, grade)
                        ? `Requires ${TIER_LABELS[REQUIRED_TIER[grade]]} risk profile`
                        : "Not open for investment"}
                    </span>
                  </td>
                );
              }

              return (
                <td key={`cta-${invoice.id}`} className="p-3 align-top">
                  <Button asChild className="w-full" size="sm">
                    <Link
                      href={`/marketplace/${invoice.id}`}
                      data-testid={`compare-invest-${invoice.id}`}
                    >
                      Invest
                    </Link>
                  </Button>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
