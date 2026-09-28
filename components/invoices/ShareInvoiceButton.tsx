"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildInvoiceShareUrl,
  buildTwitterShareUrl,
} from "@/lib/invoiceShare";

/** How long the 'Copied!' confirmation stays up before the icon returns. */
const COPIED_FEEDBACK_MS = 2000;

interface ShareInvoiceButtonProps {
  /** When provided, the copied / tweeted URL is built with UTM params. */
  invoiceId?: string;
  /** Used as the pre-filled tweet text. */
  title?: string;
}

/**
 * Share controls for an invoice (issue #421).
 *
 * - Copy-link button copies the shareable URL (with UTM params when
 *   `invoiceId` is known, otherwise the current page URL for backwards
 *   compatibility).
 * - X/Twitter button opens a pre-filled tweet intent in a new tab.
 *
 * Client-only: reads `window.location` and the Clipboard API, neither of
 * which exists during SSR, so renders nothing until mounted.
 */
export function ShareInvoiceButton({ invoiceId, title }: ShareInvoiceButtonProps = {}) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  const resolveShareUrl = (): string => {
    if (typeof window === "undefined") return "";
    // Legacy path (no invoiceId): copy the page URL verbatim so existing
    // embeds keep working. New usages pass invoiceId and get UTM tracking.
    if (!invoiceId) return window.location.href;
    return buildInvoiceShareUrl(invoiceId, window.location.origin);
  };

  const showCopiedFeedback = () => {
    setCopied(true);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  };

  const handleShare = async () => {
    const url = resolveShareUrl();

    if (!navigator.clipboard?.writeText) {
      window.prompt("Copy this invoice link:", url);
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      showCopiedFeedback();
    } catch {
      // A rejected clipboard write (denied permission, non-focused document)
      // leaves the user with no link at all, so fall back to the prompt.
      window.prompt("Copy this invoice link:", url);
    }
  };

  const shareUrl = resolveShareUrl();
  const twitterHref = buildTwitterShareUrl(shareUrl, title);

  return (
    <span
      className="inline-flex items-center gap-1"
      data-testid="share-invoice-controls"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        aria-label="Share invoice"
        data-testid="share-copy-button"
        className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
      >
        {copied ? (
          "Copied!"
        ) : (
          <Share2 aria-hidden="true" data-testid="share-icon" />
        )}
      </Button>
      <Button
        variant="outline"
        size="sm"
        asChild
        className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
      >
        <a
          href={twitterHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X (Twitter)"
          data-testid="share-twitter-button"
        >
          <Twitter aria-hidden="true" data-testid="share-twitter-icon" />
        </a>
      </Button>
    </span>
  );
}
