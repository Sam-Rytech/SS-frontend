/**
 * My secondary-market listings (issue #428).
 *
 * Types, validation and API helpers for the investor's own resale listings.
 * Pure helpers live here so pricing rules can be tested without React.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export type MyListingStatus = "active" | "sold" | "cancelled";

export interface MyListing {
  id: string;
  invoice_id: string;
  invoice_name: string;
  quantity: number;
  ask_price: number;
  listed_at: string;
  views: number;
  status: MyListingStatus;
  /** Final sale price (sold listings only). */
  sale_price?: number | null;
  /** When the sale completed (sold listings only). */
  sold_at?: string | null;
}

/** Floor / ceiling guardrails for an ask price edit. */
export function validateListingPrice(
  price: number,
  floor: number,
  ceiling: number
): string | null {
  if (!Number.isFinite(price) || price <= 0) {
    return "Enter a price greater than 0.";
  }
  if (Number.isFinite(floor) && price < floor) {
    return `Price must be at least ${floor.toLocaleString()} XLM (floor).`;
  }
  if (Number.isFinite(ceiling) && ceiling > 0 && price > ceiling) {
    return `Price must be at most ${ceiling.toLocaleString()} XLM (ceiling).`;
  }
  return null;
}

/** Default guardrails when the backend does not supply any. */
export const DEFAULT_PRICE_FLOOR = 1;
export const DEFAULT_PRICE_CEILING = 1_000_000;

/** Sum of ask_price × quantity over active listings. */
export function totalPendingProceeds(listings: MyListing[]): number {
  return listings
    .filter((l) => l.status === "active")
    .reduce((sum, l) => sum + l.ask_price * l.quantity, 0);
}

async function handleResponse<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) throw new Error(fallback);
  return res.json() as Promise<T>;
}

export async function fetchMyListings(signal?: AbortSignal): Promise<{ listings: MyListing[] }> {
  const res = await fetch(`${API_BASE}/secondary-market/my-listings`, { signal });
  return handleResponse(res, "Failed to fetch my listings");
}

export interface UpdateListingPriceInput {
  listingId: string;
  askPrice: number;
}

export async function updateListingPrice({
  listingId,
  askPrice,
}: UpdateListingPriceInput): Promise<{ success: boolean; transaction_hash?: string }> {
  const res = await fetch(
    `${API_BASE}/secondary-market/listings/${encodeURIComponent(listingId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ask_price: askPrice }),
    }
  );
  return handleResponse(res, "Failed to update listing price");
}

export async function cancelListing(
  listingId: string
): Promise<{ success: boolean; transaction_hash?: string }> {
  const res = await fetch(
    `${API_BASE}/secondary-market/listings/${encodeURIComponent(listingId)}`,
    { method: "DELETE" }
  );
  return handleResponse(res, "Failed to cancel listing");
}
