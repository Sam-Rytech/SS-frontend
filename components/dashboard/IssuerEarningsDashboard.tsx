"use client";

import { useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchIssuerEarnings, withdrawIssuerEarnings, type IssuerInvoiceEarning } from "@/lib/api";
import { Money, ExchangeRateDisclaimer } from "@/components/currency";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TxHash } from "@/components/ui/tx-hash";

const PAYOUT_BADGE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  paid: "secondary",
  pending: "outline",
  processing: "default",
};

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function SummaryCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export function IssuerEarningsDashboard() {
  usePageTitle("Earnings");
  const { jwt } = useAuth();
  const queryClient = useQueryClient();
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["issuer-earnings", jwt],
      queryFn: ({ pageParam }) => fetchIssuerEarnings(pageParam as string | undefined, jwt ?? undefined),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => (last.has_more ? last.next_cursor ?? undefined : undefined),
      enabled: !!jwt,
    });

  const withdrawMutation = useMutation({
    mutationFn: (invoiceId: string) => withdrawIssuerEarnings(invoiceId, jwt ?? undefined),
    onMutate: (id) => setWithdrawingId(id),
    onSuccess: (result) => {
      setWithdrawingId(null);
      toast.success(result.transaction_hash ? `Withdrawal submitted — tx ${result.transaction_hash.slice(0, 10)}…` : "Withdrawal submitted");
      queryClient.invalidateQueries({ queryKey: ["issuer-earnings", jwt] });
    },
    onError: (err: any) => {
      setWithdrawingId(null);
      toast.error(err?.message ?? "Withdrawal failed");
    },
  });

  const summary = data?.pages[0]?.summary;
  const allInvoices: IssuerInvoiceEarning[] = data?.pages.flatMap((p) => p.invoices) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="earnings-loading">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}><CardContent className="pt-6 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-8 w-24" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return <div className="py-12 text-center text-destructive">Failed to load earnings.</div>;
  }

  return (
    <div className="space-y-6">
      <ExchangeRateDisclaimer />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Gross Proceeds" value={<Money xlm={summary?.gross_proceeds ?? 0} />} />
        <SummaryCard label="Platform Fee" value={<Money xlm={summary?.platform_fee ?? 0} />} />
        <SummaryCard label="Net Payout" value={<Money xlm={summary?.net_payout ?? 0} />} />
      </div>

      <Card>
        <CardHeader><CardTitle>Invoice Earnings</CardTitle></CardHeader>
        <CardContent>
          {allInvoices.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground" data-testid="earnings-empty">No funded invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" data-testid="earnings-table">
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Invoice</th>
                    <th className="p-3 font-medium">Funded Date</th>
                    <th className="p-3 font-medium">Gross</th>
                    <th className="p-3 font-medium">Fee</th>
                    <th className="p-3 font-medium">Net</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allInvoices.map((inv) => (
                    <tr key={inv.invoice_id} className="hover:bg-muted/30">
                      <td className="p-3 font-medium">{inv.invoice_title}</td>
                      <td className="p-3 text-muted-foreground">{formatDate(inv.funded_date)}</td>
                      <td className="p-3"><Money xlm={inv.gross_proceeds} /></td>
                      <td className="p-3 text-destructive">-<Money xlm={inv.platform_fee} /></td>
                      <td className="p-3 font-semibold"><Money xlm={inv.net_payout} /></td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={PAYOUT_BADGE[inv.payout_status] ?? "outline"}>{inv.payout_status}</Badge>
                          {inv.transaction_hash && (
                            <TxHash
                              hash={inv.transaction_hash}
                              showLabel
                              className="text-xs"
                              testId={`tx-link-${inv.invoice_id}`}
                            />
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        {inv.payout_status === "pending" && (
                          <Button size="sm" variant="outline"
                            disabled={withdrawMutation.isPending && withdrawingId === inv.invoice_id}
                            onClick={() => withdrawMutation.mutate(inv.invoice_id)}
                            data-testid={`withdraw-btn-${inv.invoice_id}`}>
                            {withdrawMutation.isPending && withdrawingId === inv.invoice_id
                              ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Withdrawing…</>
                              : "Withdraw"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {hasNextPage && (
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? "Loading…" : "Load More"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
