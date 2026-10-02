import type { Invoice } from "@/lib/api";

/** Tabs shown on the issuer dashboard, in display order. */
export const INVOICE_TABS = [
  "draft",
  "pending",
  "live",
  "funded",
  "settled",
] as const;

export type InvoiceTab = (typeof INVOICE_TABS)[number];

export const TAB_LABELS: Record<InvoiceTab, string> = {
  draft: "Draft",
  pending: "Pending Review",
  live: "Live",
  funded: "Funded",
  settled: "Settled",
};

/**
 * API statuses belonging to each tab.
 *
 * `live` covers the several names the API has used for an invoice that is open
 * for investment. `rejected` sits under `draft` because the action it needs —
 * edit and resubmit — is a draft action; leaving it out of every tab would hide
 * invoices that require the issuer's attention most.
 */
const TAB_STATUSES: Record<InvoiceTab, ReadonlyArray<string>> = {
  draft: ["draft", "rejected"],
  pending: ["pending"],
  live: ["open", "published", "active"],
  funded: ["funded"],
  settled: ["settled"],
};

/**
 * A status as the API may report it.
 *
 * Wider than `Invoice["status"]` on purpose: `TAB_STATUSES.live` accepts
 * `published` and `active` as aliases for `open`, so a payload carrying one of
 * those must still match rather than being silently dropped from every tab.
 */
type TabbableStatus = Invoice["status"] | "published" | "active";

/** True when `invoice` belongs under `tab`. */
export function matchesTab(
  invoice: { status: TabbableStatus },
  tab: InvoiceTab,
): boolean {
  return TAB_STATUSES[tab].includes(invoice.status);
}

/** Invoices belonging under `tab`, preserving input order. */
export function filterByTab<T extends { status: TabbableStatus }>(
  invoices: readonly T[],
  tab: InvoiceTab,
): T[] {
  return invoices.filter((invoice) => matchesTab(invoice, tab));
}

/** Count of invoices per tab, for the tab badges. */
export function countByTab<T extends { status: TabbableStatus }>(
  invoices: readonly T[],
): Record<InvoiceTab, number> {
  return INVOICE_TABS.reduce(
    (counts, tab) => {
      counts[tab] = filterByTab(invoices, tab).length;
      return counts;
    },
    {} as Record<InvoiceTab, number>,
  );
}

/** The tab a given raw status falls under, for driving `SellerInvoiceTabs`
 * from an external status-level filter (e.g. the dashboard's pipeline
 * breakdown, issue #313). */
export function tabForStatus(status: TabbableStatus): InvoiceTab {
  const tab = INVOICE_TABS.find((candidate) =>
    TAB_STATUSES[candidate].includes(status),
  );
  // Every `TabbableStatus` is covered by TAB_STATUSES above, so this is
  // unreachable outside of a status value added there without a tab mapping.
  if (!tab) {
    throw new Error(`No tab mapped for invoice status "${status}"`);
  }
  return tab;
}

/** True when the invoice can still be edited and resubmitted by its issuer. */
export function isEditable(invoice: Pick<Invoice, "status">): boolean {
  return invoice.status === "draft" || invoice.status === "rejected";
}

/** True when the invoice can be deleted. Only untouched drafts qualify. */
export function isDeletable(invoice: Pick<Invoice, "status">): boolean {
  return invoice.status === "draft";
}
