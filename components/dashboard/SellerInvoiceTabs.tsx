"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { FundingProgressBar } from "@/components/invoices/FundingProgressBar";
import { DeleteDraftDialog } from "@/components/dashboard/DeleteDraftDialog";
import {
  useDeleteDraftInvoice,
  useSubmitDraftInvoice,
} from "@/hooks/useSellerInvoiceActions";
import {
  INVOICE_TABS,
  TAB_LABELS,
  countByTab,
  filterByTab,
  isDeletable,
  isEditable,
  tabForStatus,
  type InvoiceTab,
} from "@/lib/invoiceStatus";
import type { Invoice } from "@/lib/api";

function formatXlm(amount: number): string {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} XLM`;
}

const EMPTY_MESSAGES: Record<InvoiceTab, string> = {
  draft: "No drafts. Invoices you start but don't submit appear here.",
  pending: "Nothing awaiting review.",
  live: "No invoices are open for investment right now.",
  funded: "No invoices have reached their funding target yet.",
  settled: "No invoices have settled yet.",
};

/** Expected yield on a fully funded invoice, or null when the rate is unknown. */
function expectedYield(invoice: Invoice): number | null {
  if (invoice.yield_percentage === undefined) return null;
  return (invoice.raised * invoice.yield_percentage) / 100;
}

function PayoutSummary({ invoice }: { invoice: Invoice }) {
  const yieldAmount = expectedYield(invoice);
  const settled = invoice.status === "settled";

  return (
    <dl
      className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3"
      data-testid="payout-summary"
    >
      <div>
        <dt className="text-muted-foreground">Raised</dt>
        <dd className="font-medium">{formatXlm(invoice.raised)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Investors</dt>
        <dd className="font-medium">{invoice.investor_count}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">
          {settled ? "Yield paid" : "Expected yield"}
        </dt>
        <dd className="font-medium">
          {yieldAmount === null ? "—" : formatXlm(yieldAmount)}
        </dd>
      </div>
    </dl>
  );
}

interface InvoiceRowProps {
  invoice: Invoice;
  tab: InvoiceTab;
  onRequestDelete: (invoice: Invoice) => void;
  onSubmit: (invoice: Invoice) => void;
  isSubmitting: boolean;
}

function InvoiceRow({
  invoice,
  tab,
  onRequestDelete,
  onSubmit,
  isSubmitting,
}: InvoiceRowProps) {
  return (
    <Card data-testid={`seller-invoice-${invoice.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{invoice.title}</h3>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          Face value: {formatXlm(invoice.amount)}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {invoice.status === "rejected" && invoice.rejection_reason && (
          <div
            className="rounded-md border border-red-200 bg-red-50 p-4"
            data-testid="rejected-banner"
          >
            <p className="text-sm text-red-800">
              This invoice was not approved: {invoice.rejection_reason}
            </p>
          </div>
        )}

        {tab === "live" && (
          <FundingProgressBar
            raised={invoice.raised}
            target={invoice.amount}
            investorCount={invoice.investor_count}
          />
        )}

        {(tab === "funded" || tab === "settled") && (
          <PayoutSummary invoice={invoice} />
        )}

        {(isEditable(invoice) || isDeletable(invoice)) && (
          <div className="flex flex-wrap gap-2">
            {isEditable(invoice) && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/seller/invoices/${invoice.id}/edit`}>
                  {invoice.status === "rejected" ? "Edit and resubmit" : "Edit"}
                </Link>
              </Button>
            )}

            {isEditable(invoice) && (
              <Button
                size="sm"
                onClick={() => onSubmit(invoice)}
                disabled={isSubmitting}
                data-testid={`submit-invoice-${invoice.id}`}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit for review
              </Button>
            )}

            {isDeletable(invoice) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRequestDelete(invoice)}
                data-testid={`delete-invoice-${invoice.id}`}
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SellerInvoiceTabsProps {
  invoices: Invoice[];
  /**
   * An external, status-level filter (e.g. the dashboard's pipeline
   * breakdown, issue #313) narrower than a tab — `open` and `rejected` are
   * each one status among several a tab accepts. When set, the matching tab
   * is forced active and the list is narrowed to exactly this status;
   * `null` (the default) leaves tab selection and filtering as-is.
   */
  statusFilter?: Invoice["status"] | null;
}

/**
 * Issuer-facing invoice list, split by lifecycle state with the actions each
 * state allows.
 */
export function SellerInvoiceTabs({
  invoices,
  statusFilter = null,
}: SellerInvoiceTabsProps) {
  const [manualTab, setManualTab] = useState<InvoiceTab>("draft");
  const [pendingDelete, setPendingDelete] = useState<Invoice | null>(null);

  const submitMutation = useSubmitDraftInvoice();
  const deleteMutation = useDeleteDraftInvoice();

  const activeTab = statusFilter ? tabForStatus(statusFilter) : manualTab;
  const setActiveTab = (tab: InvoiceTab) => {
    // An explicit tab click always means "show me this tab", which only
    // makes sense once the external status filter stops overriding it — the
    // dashboard's own "All" pipeline button is what clears statusFilter.
    setManualTab(tab);
  };

  const counts = useMemo(() => countByTab(invoices), [invoices]);
  const visible = useMemo(() => {
    const byTab = filterByTab(invoices, activeTab);
    return statusFilter
      ? byTab.filter((invoice) => invoice.status === statusFilter)
      : byTab;
  }, [invoices, activeTab, statusFilter]);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteMutation.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
    });
  };

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Invoices by status"
        className="flex flex-wrap gap-2 border-b pb-2"
      >
        {INVOICE_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`seller-tab-${tab}`}
            aria-selected={activeTab === tab}
            aria-controls={`seller-tabpanel-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {TAB_LABELS[tab]}
            <span className="ml-1.5 text-xs opacity-80">({counts[tab]})</span>
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`seller-tabpanel-${activeTab}`}
        aria-labelledby={`seller-tab-${activeTab}`}
        className="space-y-4"
      >
        {visible.length === 0 ? (
          <div
            className="flex flex-col items-center gap-4 py-12 text-center"
            data-testid="seller-invoices-empty"
          >
            <p className="text-muted-foreground">{EMPTY_MESSAGES[activeTab]}</p>
            {activeTab === "draft" && (
              <Button asChild>
                <Link href="/seller/publish">Create Invoice</Link>
              </Button>
            )}
          </div>
        ) : (
          visible.map((invoice) => (
            <InvoiceRow
              key={invoice.id}
              invoice={invoice}
              tab={activeTab}
              onRequestDelete={setPendingDelete}
              onSubmit={(target) => submitMutation.mutate(target.id)}
              isSubmitting={
                submitMutation.isPending && submitMutation.variables === invoice.id
              }
            />
          ))
        )}
      </div>

      <DeleteDraftDialog
        open={pendingDelete !== null}
        invoiceTitle={pendingDelete?.title ?? ""}
        isDeleting={deleteMutation.isPending}
        errorMessage={
          deleteMutation.isError ? "Could not delete the draft. Try again." : null
        }
        onConfirm={confirmDelete}
        onCancel={() => {
          deleteMutation.reset();
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
