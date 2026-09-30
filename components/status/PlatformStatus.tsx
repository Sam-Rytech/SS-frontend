"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { usePlatformStatus } from "@/hooks/usePlatformStatus";
import {
  KNOWN_SERVICES,
  subscribeToIncidentUpdates,
  type ServiceHealth,
  type StatusService,
} from "@/lib/platformStatus";

const STATUS_VARIANT: Record<ServiceHealth, "default" | "secondary" | "destructive"> = {
  operational: "default",
  degraded: "secondary",
  down: "destructive",
};

const STATUS_LABEL: Record<ServiceHealth, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
};

function ServiceCard({ service }: { service: StatusService }) {
  return (
    <Card data-testid={`status-card-${service.id}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{service.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Badge
          variant={STATUS_VARIANT[service.status]}
          data-testid={`status-badge-${service.id}`}
        >
          {STATUS_LABEL[service.status]}
        </Badge>
        <p className="text-sm text-muted-foreground">
          Uptime (30d):{" "}
          <span
            className="font-semibold text-foreground"
            data-testid={`uptime-${service.id}`}
          >
            {service.uptime_30d.toFixed(2)}%
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

function SubscribeForm() {
  const [email, setEmail] = useState("");
  const mutation = useMutation({
    mutationFn: () => subscribeToIncidentUpdates(email.trim()),
    onSuccess: () => {
      toast.success("Subscribed to incident updates");
      setEmail("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Subscription failed");
    },
  });

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Subscribe to incident updates</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          data-testid="status-subscribe-form"
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && !mutation.isPending) mutation.mutate();
          }}
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="status-email">Email</Label>
            <Input
              id="status-email"
              data-testid="status-email-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            data-testid="status-subscribe-button"
            disabled={!valid || mutation.isPending}
          >
            {mutation.isPending ? "Subscribing…" : "Subscribe"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Public platform status page content (issue #425).
 *
 * Health grid, 30-day uptime, incident log and email subscribe. Data
 * refreshes every 60 seconds; previous data stays rendered during the
 * refresh so there is no layout shift.
 */
export function PlatformStatus() {
  const { data, isLoading, isError, refetch, isFetching } = usePlatformStatus();

  // Fixed minimum height for the grid region so the 60s background refresh
  // never collapses the layout while revalidating.
  if (isLoading && !data) {
    return (
      <div className="space-y-6" data-testid="platform-status-loading" aria-busy="true">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 min-h-[160px]">
          {KNOWN_SERVICES.map((s) => (
            <Skeleton key={s.id} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="space-y-3 text-center" data-testid="platform-status-error">
        <p className="text-sm text-destructive">Failed to load platform status.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const services: StatusService[] =
    data?.services ??
    KNOWN_SERVICES.map((s) => ({
      ...s,
      status: "operational" as const,
      uptime_30d: 100,
    }));
  const incidents = data?.incidents ?? [];

  return (
    <div className="space-y-6" data-testid="platform-status-page">
      {isFetching && (
        <p className="text-xs text-muted-foreground" data-testid="status-refreshing">
          Refreshing status…
        </p>
      )}

      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 min-h-[160px]"
        data-testid="status-grid"
      >
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incident log</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <p
              className="py-6 text-center text-sm text-muted-foreground"
              data-testid="incident-log-empty"
            >
              No incidents in the last 30 days.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full text-left text-sm"
                data-testid="incident-log"
              >
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Affected services</th>
                    <th className="p-3 font-medium">Started</th>
                    <th className="p-3 font-medium">Resolved</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {incidents.map((incident) => (
                    <tr
                      key={incident.id}
                      data-testid={`incident-row-${incident.id}`}
                      className="hover:bg-muted/30"
                    >
                      <td className="p-3 font-medium">{incident.title}</td>
                      <td className="p-3 text-muted-foreground">
                        {incident.affected_services.join(", ")}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(incident.started_at).toLocaleString()}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {incident.resolved_at
                          ? new Date(incident.resolved_at).toLocaleString()
                          : "Ongoing"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <SubscribeForm />
    </div>
  );
}
