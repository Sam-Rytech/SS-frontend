"use client";

import { format } from "date-fns";
import { Trash2, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWatchlist } from "@/hooks/useWatchlist";
import { fetchInvoices, type Invoice } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { cn } from "@/lib/utils";
import { Money } from "@/components/currency";

export default function WatchlistPage() {
  const { address, isConnected } = useStellarWallet();
  const { items, isLoading: watchlistLoading, toggle, isBookmarked, count } = useWatchlist();

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ["watchlist-invoices", items.join(",")],
    queryFn: async () => {
      if (items.length === 0) return [];
      const results = await Promise.all(
        items.map(async (id) => {
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/invoices/${id}`);
            if (res.ok) return res.json();
            return null;
          } catch {
            return null;
          }
        })
      );
      return results.filter((inv): inv is Invoice => inv !== null);
    },
    enabled: items.length > 0,
  });

  if (!isConnected) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-2">Watchlist</h1>
          <p className="text-muted-foreground mb-6">
            Connect your wallet to view and manage your bookmarked invoices
          </p>
        </div>
      </main>
    );
  }

  const isLoading = watchlistLoading || invoicesLoading;
  const invoices = invoicesData ?? [];

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Watchlist</h1>
          <p className="text-muted-foreground mt-1">Your bookmarked invoices</p>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <WatchlistSkeleton key={i} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Watchlist</h1>
        <p className="text-muted-foreground mt-1">Your bookmarked invoices ({count})</p>
      </div>

      {invoices.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <p className="text-muted-foreground mb-4">No bookmarked invoices yet</p>
            <Button asChild>
              <Link href="/marketplace">Browse Marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <WatchlistItem
              key={invoice.id}
              invoice={invoice}
              onRemove={() => toggle(invoice.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function WatchlistItem({
  invoice,
  onRemove,
}: {
  invoice: Invoice;
  onRemove: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href={`/marketplace/${invoice.id}`}
              className="font-semibold hover:underline"
            >
              {invoice.title}
            </Link>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span><Money xlm={invoice.amount} xlmText={`${invoice.amount.toLocaleString()} XLM`} /></span>
              <span>{invoice.investor_count} investors</span>
              <span>Due: {format(new Date(invoice.due_date), "MMM d, yyyy")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link href={`/marketplace/${invoice.id}`}>
                <ExternalLink className="h-4 w-4 mr-1" />
                View
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WatchlistSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Skeleton className="h-5 w-48 mb-2" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}