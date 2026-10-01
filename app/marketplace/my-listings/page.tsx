"use client";

import { MyListings } from "@/components/marketplace/MyListings";
import { usePageTitle } from "@/hooks/usePageTitle";

/** Alias so marketplace nav can link straight to the investor's listings. */
export default function MarketplaceMyListingsPage() {
  usePageTitle("My Listings");

  return (
    <main className="container mx-auto px-4 py-8 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">My Listings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your active secondary market listings.
        </p>
      </header>
      <MyListings />
    </main>
  );
}
