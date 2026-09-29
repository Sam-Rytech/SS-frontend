"use client";

import { useState } from "react";
import Link from "next/link";
import { Wallet, Bookmark, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { WalletChip } from "@/components/wallet/WalletChip";
import { UsdcBalanceChip } from "@/components/wallet/UsdcBalanceChip";
import { ConnectWalletModal } from "@/components/wallet/ConnectWalletModal";
import { CurrencyToggle } from "./CurrencyToggle";
import { useWatchlist } from "@/hooks/useWatchlist";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { address, network, isConnected, isConnecting, disconnect, refreshNetwork } =
    useStellarWallet();
  const { count, isLoading } = useWatchlist();
  const [connectOpen, setConnectOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          StellarSettle
        </Link>

        <nav className="hidden md:flex items-center gap-4">
          <Link href="/marketplace" className="text-sm text-muted-foreground hover:text-foreground">
            Marketplace
          </Link>
          {isConnected && (
            <>
              <Link
                href="/activity"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <Activity className="h-4 w-4" />
                Activity
              </Link>
              <Link
                href="/watchlist"
                className="relative flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <Bookmark className="h-4 w-4" />
                Watchlist
                {(count > 0 || isLoading) && (
                  <Badge
                    variant="default"
                    className={cn(
                      "ml-1 h-5 min-w-5 text-xs",
                      isLoading ? "bg-muted animate-pulse" : "bg-primary"
                    )}
                  >
                    {isLoading ? "..." : count}
                  </Badge>
                )}
              </Link>
            </>
          )}
          {/* #437 — USD / XLM display toggle */}
          <CurrencyToggle />
          {isConnected ? (
            <div className="flex items-center gap-2">
              {/* USDC balance (#402) sits next to the connected address. */}
              <UsdcBalanceChip address={address!} network={network} />
              <WalletChip
                address={address!}
                network={network}
                onDisconnect={() => disconnect()}
                onNetworkChange={refreshNetwork}
              />
            </div>
          ) : (
            <Button
              onClick={() => setConnectOpen(true)}
              disabled={isConnecting}
              className="cursor-default"
              data-testid="connect-wallet-button"
            >
              <Wallet className="mr-2 h-4 w-4" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </nav>
      </div>

      <ConnectWalletModal open={connectOpen} onOpenChange={setConnectOpen} />
    </header>
  );
}
