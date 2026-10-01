/**
 * Shareable invoice URLs with UTM tracking (issue #421).
 *
 * Pure helpers so the URL construction — which the copy button, the
 * X/Twitter intent link and the OG tags must all agree on — can be tested
 * directly without a DOM.
 */

export const INVOICE_SHARE_UTM_PARAMS = {
  utm_source: "share",
  utm_medium: "social",
  utm_campaign: "invoice",
} as const;

/** Builds `/marketplace/<id>?utm_source=share&utm_medium=social&utm_campaign=invoice`. */
export function buildInvoiceSharePath(invoiceId: string): string {
  const params = new URLSearchParams(
    INVOICE_SHARE_UTM_PARAMS as Record<string, string>
  );
  return `/marketplace/${encodeURIComponent(invoiceId)}?${params.toString()}`;
}

/** Absolute share URL for an invoice, given the current origin. */
export function buildInvoiceShareUrl(invoiceId: string, origin: string): string {
  const cleanOrigin = origin.replace(/\/$/, "");
  return `${cleanOrigin}${buildInvoiceSharePath(invoiceId)}`;
}

/**
 * Pre-filled X/Twitter share intent link for an invoice.
 *
 * Uses the `twitter.com/intent/tweet` endpoint (which also serves x.com)
 * with the invoice title as tweet text and the tracked share URL.
 */
export function buildTwitterShareUrl(shareUrl: string, title?: string): string {
  const params = new URLSearchParams();
  params.set("url", shareUrl);
  params.set(
    "text",
    title
      ? `Check out "${title}" on StellarSettle — invest in tokenized invoices!`
      : "Check out this invoice on StellarSettle — invest in tokenized invoices!"
  );
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/** Social-proof label: "X investors have already invested". */
export function investorSocialProofLabel(count: number): string {
  if (count === 1) return "1 investor has already invested";
  return `${count.toLocaleString()} investors have already invested`;
}
