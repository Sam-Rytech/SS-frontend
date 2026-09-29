/**
 * Multi-currency display (#437)
 *
 * Every monetary value on the platform is denominated (and settles) in XLM.
 * Investors can choose to *view* those values in USD instead. This module
 * holds the pure pieces of that feature so they can be unit-tested without
 * React:
 *
 *  - the persisted display preference (USD / XLM),
 *  - fetching the XLM → USD rate from Horizon,
 *  - converting and formatting amounts, and
 *  - the disclaimer text shown next to converted values.
 *
 * How the rate is sourced: Horizon has no "fiat price" endpoint, so we read
 * the live Stellar DEX order book for XLM/USDC (Circle's USDC issuer on
 * pubnet) and take the mid-price between the best bid and the best ask.
 * USDC is a 1:1 USD-backed stablecoin, so USDC per XLM is used as the USD
 * rate. Pubnet is used even when the app runs against testnet, because
 * testnet order books carry no real market price.
 */

export type Currency = "XLM" | "USD";

/** Order shown in the toggle. */
export const CURRENCIES: readonly Currency[] = ["USD", "XLM"] as const;

/** Currency shown until the user picks one. */
export const DEFAULT_CURRENCY: Currency = "XLM";

// Storage keys are unchanged from the previous `useCurrency` hook so any
// preference a user already saved keeps working after this change.
export const CURRENCY_STORAGE_KEY = "stellaresettle_currency";
export const RATE_STORAGE_KEY = "stellaresettle_xlm_usd_rate";

/** The rate is refreshed every 5 minutes (#437 scope). */
export const RATE_REFRESH_INTERVAL_MS = 5 * 60_000;

/**
 * A rate is flagged as stale once two refresh cycles have been missed, i.e.
 * the latest refresh failed and we are still showing an older value.
 */
export const RATE_STALE_AFTER_MS = 2 * RATE_REFRESH_INTERVAL_MS;

/** Circle's USDC issuer on Stellar pubnet. */
export const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

/** Horizon instance used for pricing (pubnet by default, see module doc). */
export const PRICE_HORIZON_URL =
  process.env.NEXT_PUBLIC_PRICE_HORIZON_URL || "https://horizon.stellar.org";

export interface ExchangeRate {
  /** USD value of 1 XLM. */
  rate: number;
  /** Epoch ms when the rate was fetched. */
  fetchedAt: number;
}

export function isCurrency(value: unknown): value is Currency {
  return value === "XLM" || value === "USD";
}

function isValidRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

// ─── Persistence ───────────────────────────────────────────────────────────
// localStorage can be missing (SSR) or throw (privacy mode, quota), so every
// access is guarded and failures fall back to "nothing stored".

export function readStoredCurrency(): Currency | null {
  try {
    if (typeof window === "undefined") return null;
    const value = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    // Ignore anything that is not a known currency (tampered or old values).
    return isCurrency(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredCurrency(currency: Currency): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  } catch {
    // Preference simply won't persist; the in-memory choice still applies.
  }
}

export function readStoredRate(): ExchangeRate | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(RATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ExchangeRate>;
    if (!isValidRate(parsed?.rate) || typeof parsed.fetchedAt !== "number") return null;
    return { rate: parsed.rate, fetchedAt: parsed.fetchedAt };
  } catch {
    return null;
  }
}

export function writeStoredRate(rate: ExchangeRate): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(rate));
  } catch {
    // Cache is best-effort only.
  }
}

// ─── Horizon rate ──────────────────────────────────────────────────────────

/** Horizon order book for selling XLM (base) against USDC (counter). */
export function xlmUsdcOrderBookUrl(horizonUrl: string = PRICE_HORIZON_URL): string {
  const params = new URLSearchParams({
    selling_asset_type: "native",
    buying_asset_type: "credit_alphanum4",
    buying_asset_code: "USDC",
    buying_asset_issuer: USDC_ISSUER,
    limit: "1",
  });
  return `${horizonUrl.replace(/\/+$/, "")}/order_book?${params.toString()}`;
}

/**
 * Extract the XLM price in USDC from a Horizon order-book response.
 *
 * Horizon quotes both sides as "counter per base", i.e. USDC per XLM. The
 * mid-price of the best bid and best ask is used; if one side is empty the
 * other side's best price is used. Throws when no usable price exists so the
 * caller keeps its previous rate instead of showing a bogus one.
 */
export function parseOrderBookMidPrice(body: unknown): number {
  const book = body as { bids?: { price?: string }[]; asks?: { price?: string }[] } | null;
  const bid = Number(book?.bids?.[0]?.price);
  const ask = Number(book?.asks?.[0]?.price);
  const hasBid = isValidRate(bid);
  const hasAsk = isValidRate(ask);

  if (hasBid && hasAsk) return (bid + ask) / 2;
  if (hasBid) return bid;
  if (hasAsk) return ask;
  throw new Error("Horizon order book has no XLM/USDC price");
}

/** Fetch the current XLM → USD rate from Horizon. Throws on any failure. */
export async function fetchXlmUsdRate(
  horizonUrl: string = PRICE_HORIZON_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<number> {
  const res = await fetchImpl(xlmUsdcOrderBookUrl(horizonUrl), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Horizon order book request failed (${res.status})`);
  }
  return parseOrderBookMidPrice(await res.json());
}

// ─── Conversion & formatting ───────────────────────────────────────────────

export function convertXlmToUsd(xlmAmount: number, rate: number): number {
  return xlmAmount * rate;
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$1,234.56" / "-$12.00". */
export function formatUsd(amount: number): string {
  return usdFormatter.format(Number.isFinite(amount) ? amount : 0);
}

/** Rate with enough precision for a sub-dollar asset: "$0.2221". */
export function formatRate(rate: number): string {
  return `$${rate.toFixed(4)}`;
}

/** True when the rate should be flagged as out of date. */
export function isRateStale(rate: ExchangeRate | null, now: number = Date.now()): boolean {
  return rate !== null && now - rate.fetchedAt > RATE_STALE_AFTER_MS;
}

/**
 * Disclaimer shown next to converted values. It states that the USD figure
 * is an estimate, which rate and source were used, when it was fetched, and
 * that settlement still happens in XLM.
 */
export function describeExchangeRate(rate: ExchangeRate, now: number = Date.now()): string {
  const time = new Date(rate.fetchedAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const stale = isRateStale(rate, now) ? " This rate may be out of date." : "";
  return (
    `USD values are estimates converted at 1 XLM ≈ ${formatRate(rate.rate)} ` +
    `(Stellar DEX XLM/USDC mid-price via Horizon, updated ${time}). ` +
    `All transactions settle in XLM.${stale}`
  );
}
