"use client";

/**
 * Featured invoices carousel for the marketplace homepage (#452).
 *
 * Shows the highest-yield *live* invoices so a first-time visitor sees the
 * best available opportunity without scrolling. Yield comes from the invoice
 * payload rather than a separate endpoint; invoices with no published yield
 * are dropped rather than sorted as 0%, which would otherwise pin them to the
 * bottom of an otherwise meaningful ranking.
 */

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CountdownTimer, isExpired } from "./countdown-timer";
import { TrendingUp, Clock, Users } from "lucide-react";
import type { Invoice } from "@/lib/api";
import { Money } from "@/components/currency";

interface FeaturedInvoicesCarouselProps {
  invoices: Invoice[];
  isLoading?: boolean;
  /** Max cards to render. */
  limit?: number;
}

export function FeaturedInvoicesCarousel({
  invoices,
  isLoading = false,
  limit = 6,
}: FeaturedInvoicesCarouselProps) {
  const featured = useMemo(() => {
    return invoices
      .filter((inv) => {
        if (inv.status !== "open") return false;
        if (isExpired(inv.due_date)) return false;
        return typeof inv.yield_percentage === "number";
      })
      .sort((a, b) => (b.yield_percentage ?? 0) - (a.yield_percentage ?? 0))
      .slice(0, limit);
  }, [invoices, limit]);

  if (isLoading) {
    return (
      <section aria-label="Featured invoices" data-testid="featured-invoices-loading">
        <div className="mb-3 h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (featured.length === 0) return null;

  return (
    <section aria-label="Featured invoices" data-testid="featured-invoices">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="size-5 text-primary" aria-hidden="true" />
        <h2 className="text-xl font-bold">Featured — highest yield live now</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((invoice) => {
          const raisedPct =
            invoice.amount > 0
              ? Math.min(100, Math.round((invoice.raised / invoice.amount) * 100))
              : 0;
          return (
            <Card
              key={invoice.id}
              className="flex flex-col border-primary/30 transition-shadow hover:shadow-md"
              data-testid={`featured-invoice-${invoice.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-1 font-semibold">{invoice.title}</h3>
                  <Badge
                    variant="default"
                    className="shrink-0"
                    data-testid={`featured-yield-${invoice.id}`}
                  >
                    {invoice.yield_percentage}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-semibold">
                    <Money xlm={invoice.amount} xlmText={`${invoice.amount.toLocaleString()} XLM`} />
                  </span>
                  <CountdownTimer deadline={invoice.due_date} published />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{raisedPct}% funded</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3" aria-hidden="true" />
                      {invoice.investor_count}
                    </span>
                  </div>
                  <Progress value={raisedPct} className="h-1.5" />
                </div>

                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" aria-hidden="true" />
                    closes {new Date(invoice.due_date).toLocaleDateString()}
                  </span>
                  <Button asChild size="sm">
                    <Link href={`/marketplace/${invoice.id}`}>View</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
