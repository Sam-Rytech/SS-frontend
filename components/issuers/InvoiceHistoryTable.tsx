"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent } from "@/lib/format";
import { Money } from "@/components/currency";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { formatDate, type IssuerInvoice } from "@/lib/issuers";

interface InvoiceHistoryTableProps {
  invoices: IssuerInvoice[];
  isLoading?: boolean;
}

function HistorySkeleton() {
  return (
    <div className="space-y-3" data-testid="invoice-history-loading">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

/**
 * Full invoice history for an issuer, newest maturity first. Settled rows carry
 * their repayment outcome so the track record is auditable row by row.
 */
export function InvoiceHistoryTable({ invoices, isLoading = false }: InvoiceHistoryTableProps) {
  const sorted = [...invoices].sort(
    (a, b) => new Date(b.maturity_date).getTime() - new Date(a.maturity_date).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Invoice history</h2>
        <p className="text-sm text-muted-foreground">
          Every invoice this issuer has published.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <HistorySkeleton />
        ) : sorted.length === 0 ? (
          <p data-testid="invoice-history-empty" className="py-6 text-center text-sm text-muted-foreground">
            This issuer has not published any invoices yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="invoice-history-table">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Title
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Face value
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Yield
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Status
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Maturity
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Settlement
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((invoice) => (
                  <tr
                    key={invoice.id}
                    data-testid={`history-row-${invoice.id}`}
                    className="border-b last:border-0"
                  >
                    <td className="py-3 pr-4 font-medium">{invoice.title}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      <Money xlm={invoice.face_value} />
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {formatPercent(invoice.yield_percentage)}
                    </td>
                    <td className="py-3 pr-4">
                      <InvoiceStatusBadge status={invoice.status} />
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      {formatDate(invoice.maturity_date)}
                    </td>
                    <td className="py-3">
                      {invoice.settlement?.outcome ? (
                        <span
                          data-testid={`settlement-outcome-${invoice.id}`}
                          className={
                            invoice.settlement.outcome === "on_time"
                              ? "text-xs font-medium text-green-700"
                              : "text-xs font-medium text-muted-foreground"
                          }
                        >
                          {invoice.settlement.outcome === "on_time"
                            ? "On time"
                            : invoice.settlement.outcome === "late"
                              ? "Late"
                              : "Defaulted"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
