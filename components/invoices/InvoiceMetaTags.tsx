"use client";

import { useEffect } from "react";

interface InvoiceMetaTagsProps {
  title: string;
  status: string;
  amount: number;
  invoiceId: string;
  /** Share image for link previews; falls back to the app logo. */
  image?: string;
  /** Number of investors, appended to the description as social proof. */
  investorCount?: number;
}

/**
 * Dynamically injects Open Graph and Twitter Card meta tags into <head>
 * for social sharing previews (issue #421). This is the client-rendered
 * equivalent of Next.js `generateMetadata` — the tags are set on mount and
 * cleaned up on unmount. The canonical/share URL carries UTM params so
 * social referrals are attributable.
 */
export function InvoiceMetaTags({
  title,
  status,
  amount,
  invoiceId,
  image,
  investorCount,
}: InvoiceMetaTagsProps) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const baseUrl = window.location.origin;
    const url = `${baseUrl}/marketplace/${encodeURIComponent(invoiceId)}?utm_source=share&utm_medium=social&utm_campaign=invoice`;
    const socialProof =
      typeof investorCount === "number"
        ? ` · ${investorCount} investor${investorCount === 1 ? "" : "s"} already invested`
        : "";
    const description = `Invest in "${title}" — ${amount.toLocaleString()} XLM · Status: ${status}${socialProof}`;
    const imageUrl = image ?? `${baseUrl}/logo.png`;

    const tags: Array<{ name?: string; property?: string; content: string }> = [
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "StellarSettle" },
      { property: "og:image", content: imageUrl },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:url", content: url },
      { name: "twitter:image", content: imageUrl },
      { name: "description", content: description },
    ];

    const inserted: HTMLMetaElement[] = [];

    for (const tag of tags) {
      const selector = tag.property
        ? `meta[property="${tag.property}"]`
        : `meta[name="${tag.name}"]`;
      let el = document.querySelector<HTMLMetaElement>(selector);

      if (!el) {
        el = document.createElement("meta");
        if (tag.property) el.setAttribute("property", tag.property);
        if (tag.name) el.setAttribute("name", tag.name);
        document.head.appendChild(el);
        inserted.push(el);
      }

      el.setAttribute("content", tag.content);
    }

    // Set canonical URL
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
      inserted.push(canonical as unknown as HTMLMetaElement);
    }
    canonical.setAttribute("href", url);

    // Cleanup: remove only tags we created
    return () => {
      for (const el of inserted) {
        el.remove();
      }
    };
  }, [title, status, amount, invoiceId, image, investorCount]);

  return null;
}
