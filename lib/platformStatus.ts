/**
 * Platform status data (issue #425).
 *
 * Health of Horizon API, IPFS/Pinata, KYC provider and backend API, with
 * 30-day uptime history and an incident log. Pure helpers stay testable
 * without React.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export type ServiceHealth = "operational" | "degraded" | "down";

export interface StatusService {
  /** Stable key, e.g. "horizon", "ipfs", "kyc", "backend". */
  id: string;
  /** Display name, e.g. "Horizon API". */
  name: string;
  status: ServiceHealth;
  /** Uptime percentage over the last 30 days (0–100). */
  uptime_30d: number;
  /** ISO timestamp of the last check, if the backend supplies it. */
  last_checked_at?: string | null;
}

export interface StatusIncident {
  id: string;
  title: string;
  affected_services: string[];
  started_at: string;
  /** Null while the incident is ongoing. */
  resolved_at: string | null;
}

export interface PlatformStatusResponse {
  services: StatusService[];
  incidents: StatusIncident[];
}

/** Services shown on the status page when the backend is unreachable. */
export const KNOWN_SERVICES = [
  { id: "horizon", name: "Horizon API" },
  { id: "ipfs", name: "IPFS / Pinata" },
  { id: "kyc", name: "KYC Provider" },
  { id: "backend", name: "Backend API" },
] as const;

/**
 * Uptime percentage over a 30-day window of boolean checks
 * (true = up). Returns 100 when there is no history rather than NaN.
 */
export function calculateUptimePercentage(checks: boolean[]): number {
  if (checks.length === 0) return 100;
  const up = checks.filter(Boolean).length;
  return (up / checks.length) * 100;
}

export async function fetchPlatformStatus(
  signal?: AbortSignal
): Promise<PlatformStatusResponse> {
  const res = await fetch(`${API_BASE}/platform/status`, { signal });
  if (!res.ok) throw new Error("Failed to fetch platform status");
  return res.json() as Promise<PlatformStatusResponse>;
}

export async function subscribeToIncidentUpdates(
  email: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/platform/status/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("Failed to subscribe to incident updates");
  return res.json() as Promise<{ success: boolean }>;
}
