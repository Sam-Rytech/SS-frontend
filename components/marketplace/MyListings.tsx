"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cancelListing,
  fetchMyListings,
  totalPendingProceeds,
  updateListingPrice,
  validateListingPrice,
  DEFAULT_PRICE_CEILING,
  DEFAULT_PRICE_FLOOR,
  type MyListing,
} from "@/lib/myListings";

export const MY_LISTINGS_QUERY_KEY = ["secondary-market", "my-listings"] as const;

type Tab = "active" | "sold";

function EditPriceModal({
  listing,
  open,
  onOpenChange,
}: {
  listing: MyListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [raw, setRaw] = useState("");

  const price = Number(raw);
  // Floor comes from the current ask (can't drop below 50% without
  // re-listing) unless the backend supplies tighter bounds; ceiling guards
  // fat-finger listings.
  const floor = listing ? Math.max(DEFAULT_PRICE_FLOOR, listing.ask_price * 0.5) : DEFAULT_PRICE_FLOOR;
  const ceiling = DEFAULT_PRICE_CEILING;
  const error = raw === "" ? null : validateListingPrice(price, floor, ceiling);

  const mutation = useMutation({
    mutationFn: () =>
      updateListingPrice({ listingId: listing!.id, askPrice: price }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: MY_LISTINGS_QUERY_KEY });
      toast.success(
        "Listing price updated",
        result.transaction_hash ? { description: result.transaction_hash } : undefined
      );
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update price");
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next && listing) setRaw(String(listing.ask_price));
        onOpenChange(next);
      }}
    >
      <DialogContent data-testid="edit-price-modal">
        <DialogHeader>
          <DialogTitle>Edit ask price</DialogTitle>
          <DialogDescription>
            {listing
              ? `Update the ask price for "${listing.invoice_name}". Must be between ${floor.toLocaleString()} and ${ceiling.toLocaleString()} XLM.`
              : "Update the ask price."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="edit-price-input">New ask price (XLM)</Label>
          <Input
            id="edit-price-input"
            data-testid="edit-price-input"
            type="number"
            min={0}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
          {error && (
            <p className="text-sm text-destructive" data-testid="edit-price-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            data-testid="edit-price-submit"
            disabled={raw === "" || error !== null || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : "Save price"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelListingModal({
  listing,
  open,
  onOpenChange,
}: {
  listing: MyListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => cancelListing(listing!.id),
    onSuccess: (result) => {
      // Drop it from the cached active table immediately; the refetch would
      // catch up on its own, but waiting makes the confirm feel inert.
      queryClient.setQueriesData(
        { queryKey: MY_LISTINGS_QUERY_KEY },
        (old: { listings: MyListing[] } | undefined) =>
          old
            ? {
                ...old,
                listings: old.listings.filter((l) => l.id !== listing!.id),
              }
            : old
      );
      void queryClient.invalidateQueries({ queryKey: MY_LISTINGS_QUERY_KEY });
      toast.success(
        "Listing cancelled",
        result.transaction_hash ? { description: result.transaction_hash } : undefined
      );
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to cancel listing");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="cancel-listing-modal">
        <DialogHeader>
          <DialogTitle>Cancel listing?</DialogTitle>
          <DialogDescription>
            {listing
              ? `This removes "${listing.invoice_name}" (${listing.quantity} fractions at ${listing.ask_price.toLocaleString()} XLM) from the secondary market. This action cannot be undone.`
              : "This removes the listing from the secondary market."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep listing
          </Button>
          <Button
            variant="destructive"
            data-testid="cancel-listing-confirm"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Cancelling…" : "Confirm cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Investor's own secondary-market listings (issue #428).
 *
 * Active table with edit-price / cancel actions, a sold archive tab, and a
 * summary card with total pending proceeds.
 */
export function MyListings() {
  const [tab, setTab] = useState<Tab>("active");
  const [editing, setEditing] = useState<MyListing | null>(null);
  const [cancelling, setCancelling] = useState<MyListing | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: MY_LISTINGS_QUERY_KEY,
    queryFn: ({ signal }) => fetchMyListings(signal),
  });

  const listings = useMemo(() => data?.listings ?? [], [data]);
  const active = useMemo(
    () => listings.filter((l) => l.status === "active"),
    [listings]
  );
  const sold = useMemo(
    () => listings.filter((l) => l.status === "sold"),
    [listings]
  );
  const pending = useMemo(() => totalPendingProceeds(listings), [listings]);

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="my-listings-loading" aria-busy="true">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3 text-center" data-testid="my-listings-error">
        <p className="text-sm text-destructive">Failed to load your listings.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="my-listings-page">
      <Card data-testid="listings-summary-card">
        <CardHeader>
          <CardTitle className="text-base">Pending proceeds</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold" data-testid="pending-proceeds">
            {pending.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            XLM
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {active.length} active listing{active.length === 1 ? "" : "s"} ·{" "}
            {sold.length} sold
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-6 border-b">
        <button
          type="button"
          data-testid="tab-active-listings"
          onClick={() => setTab("active")}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
            tab === "active"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Active ({active.length})
        </button>
        <button
          type="button"
          data-testid="tab-sold-archive"
          onClick={() => setTab("sold")}
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
            tab === "sold"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Sold ({sold.length})
        </button>
      </div>

      {tab === "active" ? (
        active.length === 0 ? (
          <p
            className="rounded-lg border border-dashed p-12 text-center text-muted-foreground"
            data-testid="my-listings-empty"
          >
            No active listings. List fractions from your portfolio to sell them
            here.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border bg-card">
            <table
              className="w-full text-left text-sm"
              data-testid="active-listings-table"
            >
              <thead className="border-b bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Invoice</th>
                  <th className="p-3 font-medium">Quantity</th>
                  <th className="p-3 font-medium">Ask price</th>
                  <th className="p-3 font-medium">Listed date</th>
                  <th className="p-3 font-medium">Views</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {active.map((listing) => (
                  <tr
                    key={listing.id}
                    data-testid={`listing-row-${listing.id}`}
                    className="hover:bg-muted/30"
                  >
                    <td className="p-3 font-medium">{listing.invoice_name}</td>
                    <td className="p-3">{listing.quantity}</td>
                    <td className="p-3 font-mono">
                      {listing.ask_price.toLocaleString()} XLM
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(listing.listed_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">{listing.views.toLocaleString()}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`edit-price-button-${listing.id}`}
                          onClick={() => setEditing(listing)}
                        >
                          Edit price
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`cancel-listing-button-${listing.id}`}
                          onClick={() => setCancelling(listing)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : sold.length === 0 ? (
        <p
          className="rounded-lg border border-dashed p-12 text-center text-muted-foreground"
          data-testid="sold-archive-empty"
        >
          No sold listings yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table
            className="w-full text-left text-sm"
            data-testid="sold-listings-table"
          >
            <thead className="border-b bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Invoice</th>
                <th className="p-3 font-medium">Quantity</th>
                <th className="p-3 font-medium">Sale price</th>
                <th className="p-3 font-medium">Sale date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sold.map((listing) => (
                <tr
                  key={listing.id}
                  data-testid={`sold-row-${listing.id}`}
                  className="hover:bg-muted/30"
                >
                  <td className="p-3 font-medium">{listing.invoice_name}</td>
                  <td className="p-3">{listing.quantity}</td>
                  <td className="p-3 font-mono" data-testid={`sold-price-${listing.id}`}>
                    {(listing.sale_price ?? listing.ask_price).toLocaleString()} XLM
                  </td>
                  <td className="p-3 text-muted-foreground" data-testid={`sold-date-${listing.id}`}>
                    {listing.sold_at
                      ? new Date(listing.sold_at).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditPriceModal
        listing={editing}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
      <CancelListingModal
        listing={cancelling}
        open={cancelling !== null}
        onOpenChange={(open) => {
          if (!open) setCancelling(null);
        }}
      />
    </div>
  );
}
