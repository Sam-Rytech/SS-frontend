import * as Freighter from "@stellar/freighter-api";

export type Network = "mainnet" | "testnet";

/* ─── Multi-wallet support (issue #379) ─────────────────────────────────────
 * StellarSettle supports two browser wallets. Freighter ships its own npm
 * API client; Albedo only injects a `window.albedo` global from its browser
 * extension, so it is declared here and feature-detected at runtime.
 */

export type WalletKind = "freighter" | "albedo";

export const SUPPORTED_WALLETS: readonly WalletKind[] = ["freighter", "albedo"] as const;

export const WALLET_LABELS: Record<WalletKind, string> = {
  freighter: "Freighter",
  albedo: "Albedo",
};

/** Where to send a user who does not have the extension installed yet. */
export const WALLET_INSTALL_URLS: Record<WalletKind, string> = {
  freighter: "https://www.freighter.app/",
  albedo: "https://albedo.to/",
};

const WALLET_STORAGE_KEY = "stellarsettle.wallet";

/** Shape of the `window.albedo` global injected by the Albedo extension. */
interface AlbedoApi {
  enable(): Promise<{ address?: string; network?: unknown } | number | string>;
  address?: string;
  network(): Promise<unknown>;
  logout?: () => Promise<unknown> | unknown;
  signTransaction?: (...args: unknown[]) => Promise<unknown>;
}

export interface WalletConnection {
  address: string;
  network: Network;
  wallet: WalletKind;
}

declare global {
  interface Window {
    albedo?: AlbedoApi;
    /** Set by the Freighter extension once it has injected its API. */
    freighter?: unknown;
  }
}

/* ─── Network normalisation ──────────────────────────────────────────────── */

/** Freighter reports the Soroban passphrase ("PUBLIC") for mainnet. */
export function normalizeFreighterNetwork(passphrase: string | undefined): Network {
  return passphrase === "PUBLIC" ? "mainnet" : "testnet";
}

/**
 * Albedo is inconsistent about the shape of `albedo.network()` across
 * versions: it has returned a bare string ("TESTNET"), a single-key object
 * (`{ TESTNET: {} }`) and the full descriptor object. All three are handled
 * so a version bump cannot silently mislabel the network.
 */
export function normalizeAlbedoNetwork(value: unknown): Network {
  if (typeof value === "string") {
    return value === "PUBLIC" ? "mainnet" : "testnet";
  }

  if (value && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    // `{ TESTNET: {} }` — exactly one key naming the active network.
    if (keys.length === 1) {
      return keys[0] === "PUBLIC" ? "mainnet" : "testnet";
    }
    // Full descriptor — find which network is populated.
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (key === "PUBLIC" || key === "TESTNET" || key === "FUTURENET") {
        if (entry && typeof entry === "object" && Object.keys(entry as object).length > 0) {
          return key === "PUBLIC" ? "mainnet" : "testnet";
        }
      }
    }
  }

  return "testnet";
}

/* ─── Feature detection ──────────────────────────────────────────────────── */

export function isAlbedoAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.albedo);
}

/** How long to wait for a Freighter answer before assuming it is absent. */
const FREIGHTER_PROBE_TIMEOUT_MS = 1500;

/**
 * `Freighter.isConnected()` never rejects when the extension is missing — it
 * sits and waits for a content-script response that will not come. Racing it
 * against a short timeout keeps the connect modal responsive for users who
 * have not installed Freighter at all.
 */
export async function isFreighterAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  // The extension sets this global; when present no probe is needed at all.
  if (window.freighter) return true;

  const probe = Freighter.isConnected().catch(() => false);
  const timeout = new Promise<boolean>((resolve) =>
    setTimeout(() => resolve(false), FREIGHTER_PROBE_TIMEOUT_MS)
  );

  return (await Promise.race([probe, timeout])) === true;
}

export async function isWalletAvailable(wallet: WalletKind): Promise<boolean> {
  return wallet === "albedo" ? isAlbedoAvailable() : isFreighterAvailable();
}

/* ─── Connect helpers ────────────────────────────────────────────────────── */

export async function connectFreighter(): Promise<WalletConnection | null> {
  try {
    const connected = await Freighter.isConnected();
    const address = connected ? await Freighter.getPublicKey() : await Freighter.requestAccess();
    if (!address) return null;
    const network = normalizeFreighterNetwork(await Freighter.getNetwork());
    return { address, network, wallet: "freighter" };
  } catch {
    return null;
  }
}

export async function connectAlbedo(): Promise<WalletConnection | null> {
  const albedo = typeof window === "undefined" ? undefined : window.albedo;
  if (!albedo) return null;

  try {
    const result = await albedo.enable();
    // Albedo signals user rejection with a numeric error code instead of throwing.
    if (!result || typeof result === "number" || typeof result === "string") return null;

    const address = result.address ?? albedo.address;
    if (!address) return null;

    const network = result.network
      ? normalizeAlbedoNetwork(result.network)
      : await albedo.network().then(normalizeAlbedoNetwork).catch(() => "testnet" as Network);

    return { address, network, wallet: "albedo" };
  } catch {
    return null;
  }
}

export async function connectWithWallet(wallet: WalletKind): Promise<WalletConnection | null> {
  return wallet === "albedo" ? connectAlbedo() : connectFreighter();
}

/* ─── Session persistence ────────────────────────────────────────────────── */

export interface StoredWalletSession {
  wallet: WalletKind;
  address: string;
  network: Network;
}

export function readStoredWalletSession(): StoredWalletSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WALLET_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredWalletSession>;
    if (!parsed?.address || !parsed.wallet) return null;
    if (!SUPPORTED_WALLETS.includes(parsed.wallet)) return null;
    return {
      wallet: parsed.wallet,
      address: parsed.address,
      network: parsed.network === "mainnet" ? "mainnet" : "testnet",
    };
  } catch {
    return null;
  }
}

export function writeStoredWalletSession(session: StoredWalletSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Private-mode browsers can refuse writes; the in-memory session still works.
  }
}

export function clearStoredWalletSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WALLET_STORAGE_KEY);
  } catch {
    // Ignore — see writeStoredWalletSession.
  }
}

/* ─── Backwards-compatible Freighter-only API ────────────────────────────── */

export async function connectWallet(): Promise<{ address: string; network: Network } | null> {
  const result = await connectFreighter();
  return result ? { address: result.address, network: result.network } : null;
}

export async function getNetwork(): Promise<Network | null> {
  try {
    const connected = await Freighter.isConnected();
    if (!connected) return null;
    return normalizeFreighterNetwork(await Freighter.getNetwork());
  } catch {
    return null;
  }
}

export async function getAddress(): Promise<string | null> {
  try {
    const connected = await Freighter.isConnected();
    if (!connected) return null;
    return await Freighter.getPublicKey();
  } catch {
    return null;
  }
}

/** Asks the connected extension to forget the session, if it supports it. */
export async function revokeProviderSession(wallet: WalletKind | null): Promise<void> {
  if (wallet !== "albedo" || typeof window === "undefined") return;
  try {
    await window.albedo?.logout?.();
  } catch {
    // Albedo is web-only; a failure here must not block a local disconnect.
  }
}

export function truncateAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Builds a StellarExpert block-explorer link for a submitted transaction
 * hash (issue #310), pointed at the correct network so the link resolves.
 */
export function getExplorerUrl(txHash: string, network: Network): string {
  const networkSegment = network === "mainnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${networkSegment}/tx/${txHash}`;
}
