"use client";

/**
 * Public creator profile (#319).
 *
 * Shows a seller's public track record — profile header with wallet, join
 * date and verification badge, aggregate funding stats, and a paginated list
 * of issued invoices linking to the invoice detail page. Accessible without
 * wallet connection or authentication.
 */

import { useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchCreatorProfile } from "@/lib/api";
import { Money } from "@/components/currency";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { BadgeCheck, ShieldAlert } from "lucide-react";

function shortenWallet(wallet: string): string {
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

export function CreatorProfile({ wallet }: { wallet: string }) {
  usePageTitle("Creator Profile");
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["creator-profile", wallet],
    queryFn: ({ pageParam }) => fetchCreatorProfile(wallet, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
    staleTime: 60 * 1000,
  });

  const profile = data?.pages[0];
  const invoices = useMemo(
    () => data?.pages.flatMap((page) => page.invoices) ?? [],
    [data]
  );

  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  const observer = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new IntersectionObserver(handleIntersect, { rootMargin: "200px" });
  }, [handleIntersect]);

  const sentinelRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (observer) {
        if (sentinelRef.current) observer.unobserve(sentinelRef.current);
        if (node) observer.observe(node);
      }
      (sentinelRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [observer]
  );

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="creator-profile-loading">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !profile || !profile.wallet) {
    return (
      <Card data-testid="creator-profile-error">
        <CardContent className="pt-6 text-center text-muted-foreground">
          Creator profile not found for this wallet address.
        </CardContent>
      </Card>
    );
  }

  const displayName = profile.display_name ?? profile.displayName ?? null;
  const joinedAt = profile.joined_at || profile.joinedAt || "";

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold" data-testid="creator-profile-name">
                {displayName ?? shortenWallet(profile.wallet)}
              </h1>
              {profile.kyc_verified ? (
                <Badge variant="secondary" data-testid="creator-verified-badge">
                  <BadgeCheck className="mr-1 size-3.5" /> Verified
                </Badge>
              ) : (
                <Badge variant="outline" data-testid="creator-unverified-badge">
                  <ShieldAlert className="mr-1 size-3.5" /> Unverified
                </Badge>
              )}
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p className="font-mono" data-testid="creator-wallet">
                {shortenWallet(profile.wallet)}
              </p>
              {joinedAt && (
                <p data-testid="creator-joined">
                  Joined {new Date(joinedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card data-testid="creator-stat-invoices">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total invoices issued</p>
            <p className="text-2xl font-bold">{profile.stats.total_invoices}</p>
          </CardContent>
        </Card>
        <Card data-testid="creator-stat-funded">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total funded</p>
            <p className="text-2xl font-bold"><Money xlm={profile.stats.total_funded} /></p>
          </CardContent>
        </Card>
        <Card data-testid="creator-stat-settlement">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Settlement success rate</p>
            <p className="text-2xl font-bold">{profile.stats.settlement_success_rate}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-4 text-lg font-bold">Issued invoices</h2>
          {invoices.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground" data-testid="creator-invoices-empty">
              No invoices issued yet.
            </p>
          ) : (
            <ul className="divide-y" data-testid="creator-invoice-list">
              {invoices.map((invoice) => (
                <li key={invoice.id} className="py-3">
                  <Link
                    href={`/marketplace/${invoice.id}`}
                    className="flex items-center justify-between gap-4 rounded-md p-2 hover:bg-muted/30"
                    data-testid={`creator-invoice-${invoice.id}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{invoice.title}</p>
                      <p className="text-sm text-muted-foreground">
                        <Money xlm={invoice.amount} /> ·{" "}
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <InvoiceStatusBadge status={invoice.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {hasNextPage && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                data-testid="creator-invoices-load-more"
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}

          {/* Infinite scroll sentinel (#319): loads the next page as the list
              scrolls into view. */}
          <div ref={sentinelRefCallback} data-testid="creator-invoices-sentinel" />
        </CardContent>
      </Card>
    </div>
  );
}
