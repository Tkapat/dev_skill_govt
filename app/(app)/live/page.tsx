"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Camera, LayoutGrid, Radio, Search, Table2, X } from "lucide-react";
import { api } from "@/lib/api";
import { fmtIST, fmtNum, timeAgo } from "@/lib/format";
import { ITEM_LABEL, LIVE_STATE } from "@/lib/constants";
import { useCountUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useDebounced } from "@/hooks/useDebounced";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LiveStateChip, LIVE_STATE_ICON } from "@/components/shared/StatusChip";
import { SignedImage } from "@/components/shared/SignedImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { LiveFeed, LiveState, LiveStatus } from "@/types";

const STATES: LiveState[] = ["live", "idle", "offline", "tampered", "provisional"];
const COUNT_LABEL: Record<LiveState, string> = {
  live: "Live",
  idle: "Idle",
  offline: "Offline",
  tampered: "Tampered",
  provisional: "Setup pending",
};
const MAX_ITEM_CHIPS = 4;

const stateLabel = (s: string) => (s in LIVE_STATE ? LIVE_STATE[s as LiveState].label : s);

const itemLabel = (cls: string) => ITEM_LABEL[cls] ?? cls.replace(/(^|\s)\S/g, (c) => c.toUpperCase());

function LiveRoomCard({ room }: { room: LiveStatus }) {
  const peopleRef = useCountUp(room.people ?? 0);
  const live = room.state === "live";
  const items = Object.entries(room.items ?? {}).filter(([, v]) => v.present > 0);
  const visible = items.slice(0, MAX_ITEM_CHIPS);
  const extra = items.length - visible.length;
  const badQuality = !room.quality?.ok && (room.quality?.reasons?.length ?? 0) > 0;

  return (
    <Card className="card-hover relative h-full overflow-hidden">
      <div className="relative aspect-video bg-surface-2">
        <SignedImage
          url={room.thumb_url}
          alt={`${room.camera_name} thumbnail`}
          className={cn("h-full w-full rounded-none", !live && "opacity-60")}
        />
        <span className="absolute left-2 top-2 z-10">
          <LiveStateChip state={room.state} />
        </span>
        {!live && (
          <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <span className="rounded-full border bg-background/90 px-3 py-0.5 text-xs font-medium shadow-sm">
              {stateLabel(room.state)}
            </span>
          </span>
        )}
      </div>

      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate font-medium">{room.camera_name}</span>
          <span className="shrink-0 text-muted-foreground">{room.district}</span>
        </div>

        <span className="flex items-baseline gap-1.5">
          <span
            ref={peopleRef as React.RefObject<HTMLSpanElement>}
            className="tabular text-[28px] font-semibold leading-8"
          />
          <span className="text-xs text-muted-foreground">people</span>
        </span>

        {room.claimed != null && (
          <p className="tabular text-xs text-muted-foreground">
            Claimed {fmtNum(room.claimed)} / Camera saw {fmtNum(room.people ?? 0)}
          </p>
        )}

        {items.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visible.map(([cls, v]) => (
              <span
                key={cls}
                className="inline-flex h-6 items-center gap-1 rounded-full border border-border bg-surface px-2 text-xs"
              >
                <span className="font-medium">{itemLabel(cls)}</span>
                <span className="tabular text-muted-foreground">
                  {v.present}
                  {v.in_use > 0 ? ` (${v.in_use} in use)` : ""}
                </span>
              </span>
            ))}
            {extra > 0 && (
              <span className="tabular inline-flex h-6 items-center rounded-full border border-dashed border-border bg-surface px-2 text-xs text-muted-foreground">
                +{extra}
              </span>
            )}
          </div>
        )}

        {badQuality && (
          <p className="flex items-start gap-1.5 text-xs text-warning">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{room.quality.reasons.join(" · ")}</span>
          </p>
        )}

        <div className="space-y-0.5 border-t pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{room.centre_name}</span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{room.centre_code}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {room.session ? room.session.label : "No active session"}
          </p>
        </div>
      </CardContent>

      <Link
        href={`/centres/${room.centre_id}?tab=live`}
        className="absolute inset-0 z-20"
        aria-label={`Open ${room.centre_name}`}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="tabular absolute right-2 top-2 rounded-full border bg-background/85 px-2 py-0.5 text-xs text-muted-foreground">
                {timeAgo(room.ts)}
              </span>
            </TooltipTrigger>
            <TooltipContent>{fmtIST(room.ts)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Link>
    </Card>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border bg-card">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LivePage() {
  const router = useRouter();
  const [view, setView] = React.useState<"grid" | "table">("grid");
  const [district, setDistrict] = React.useState("");
  const [q, setQ] = React.useState("");
  const [state, setState] = React.useState<LiveState | null>(null);
  const debouncedDistrict = useDebounced(district, 200);
  const debouncedQ = useDebounced(q, 200);

  const params = React.useMemo(() => {
    const p = new URLSearchParams({ limit: "60" });
    const d = debouncedDistrict.trim();
    const s = debouncedQ.trim();
    if (d) p.set("district", d);
    if (s) p.set("q", s);
    if (state) p.set("state", state);
    return p.toString();
  }, [debouncedDistrict, debouncedQ, state]);

  const liveQ = useQuery({
    queryKey: ["live", "wall", params],
    queryFn: () => api<LiveFeed>(`/live?${params}`),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    staleTime: 5000,
  });

  const counts = liveQ.data?.counts;
  const rows = React.useMemo(
    () => (liveQ.data?.items ?? []).filter((r) => !state || r.state === state),
    [liveQ.data, state]
  );

  const filtersActive = !!debouncedDistrict.trim() || !!debouncedQ.trim() || !!state;

  const clearFilters = () => {
    setDistrict("");
    setQ("");
    setState(null);
  };

  const columns: DataTableColumn<LiveStatus>[] = [
    {
      key: "centre",
      header: "Centre",
      render: (r) => (
        <span>
          <span className="font-medium">{r.centre_name}</span>
          <span className="ml-1.5 font-mono text-xs text-muted-foreground">{r.centre_code}</span>
        </span>
      ),
    },
    { key: "camera", header: "Camera", render: (r) => r.camera_name },
    { key: "state", header: "State", render: (r) => <LiveStateChip state={r.state} /> },
    {
      key: "session",
      header: "Session",
      render: (r) => <span className="text-muted-foreground">{r.session?.label ?? "—"}</span>,
    },
    { key: "people", header: "People", numeric: true, render: (r) => fmtNum(r.people ?? 0) },
    {
      key: "claimed",
      header: "Claimed",
      numeric: true,
      render: (r) =>
        r.claimed == null ? <span className="text-muted-foreground">—</span> : fmtNum(r.claimed),
    },
    {
      key: "items",
      header: "Items in use",
      render: (r) => {
        const used = Object.entries(r.items ?? {})
          .filter(([, v]) => v.present > 0)
          .map(([cls, v]) => `${itemLabel(cls)} ${v.in_use}`)
          .join(" · ");
        return (
          <span className="block max-w-56 truncate text-muted-foreground">{used || "—"}</span>
        );
      },
    },
    {
      key: "age",
      header: "Age",
      render: (r) => <span className="tabular text-muted-foreground">{timeAgo(r.ts)}</span>,
    },
  ];

  const emptyState = filtersActive ? (
    <EmptyState
      icon={Search}
      title="No rooms match these filters"
      hint="Try clearing one of the filters above."
      action={
        <Button variant="secondary" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={Radio}
      title="No rooms are being monitored right now."
      hint="Rooms appear here when a centre starts its camera during a session."
    />
  );

  if (liveQ.error && !liveQ.data) {
    return (
      <div className="rounded-lg border bg-card">
        <ErrorState onRetry={() => liveQ.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live rooms"
        description="What is happening in every room right now?"
        action={
          <div className="flex rounded-lg border">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setView("grid")}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setView("table")}
              aria-label="Table view"
              aria-pressed={view === "table"}
            >
              <Table2 className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {STATES.map((s) => {
            const Icon = LIVE_STATE_ICON[s];
            const active = state === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setState(active ? null : s)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-accent-soft text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground"
                )}
              >
                {s === "live" && (
                  <span className="h-1.5 w-1.5 rounded-full bg-success live-dot" aria-hidden />
                )}
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {COUNT_LABEL[s]}
                <span className="tabular font-semibold">{fmtNum(counts?.[s] ?? 0)}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="live-district" className="text-xs text-muted-foreground">
              District
            </Label>
            <Input
              id="live-district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="District…"
              className="w-44"
              aria-label="Filter by district"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="live-q" className="text-xs text-muted-foreground">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="live-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Centre name or code…"
                className="w-56 pl-9"
                aria-label="Search rooms"
              />
            </div>
          </div>

          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Clear filters
            </Button>
          )}

          <span className="ml-auto tabular text-sm text-muted-foreground">
            {rows.length} of {liveQ.data?.items.length ?? 0} rooms
          </span>
        </div>
      </PageHeader>

      {liveQ.isLoading ? (
        <CardGridSkeleton />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent>{emptyState}</CardContent>
        </Card>
      ) : view === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((room) => (
            <LiveRoomCard key={room.camera_id} room={room} />
          ))}
        </div>
      ) : (
        <DataTable
          caption="Live rooms"
          columns={columns}
          rows={rows}
          getRowId={(r) => r.camera_id}
          onRowClick={(r) => router.push(`/centres/${r.centre_id}?tab=live`)}
          skeletonRows={8}
          empty={emptyState}
        />
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Camera className="h-3.5 w-3.5" aria-hidden />
        Cameras count people anonymously. Trainee faces are never identified.
        <span className="ml-auto">Refreshes every 5 s</span>
      </p>
    </div>
  );
}
