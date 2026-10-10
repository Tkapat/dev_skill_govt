"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Building2, Flag as FlagIcon, FileText, Camera, AlertTriangle, Inbox } from "lucide-react";
import { api } from "@/lib/api";
import { fmtDate, fmtIST, fmtNum, timeAgo } from "@/lib/format";
import { SEVERITY, type Severity } from "@/lib/constants";
import { useStaggerIn } from "@/lib/motion";
import { PageHeader } from "@/components/shared/PageHeader";
import { CurrentDateIST } from "@/components/shared/CurrentDateIST";
import { KpiCard, KpiRowSkeleton } from "@/components/shared/KpiCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { SeverityDot, CentreStatusChip } from "@/components/shared/StatusChip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Meter } from "@/components/ui/meter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Application, Camera as CameraT, Centre, Flag } from "@/types";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

const SEV_COLORS: Record<Severity, string> = {
  low: "var(--sev-low)",
  medium: "var(--sev-medium)",
  high: "var(--sev-high)",
  critical: "var(--sev-critical)",
};

function useHistory(key: string, value: number): number[] {
  const [store, setStore] = React.useState<Record<string, number[]>>({});
  const arr = store[key] ?? [];
  if (arr.length === 0 || arr[arr.length - 1] !== value) {
    // sanctioned render-phase state adjustment (docs: you might not need an effect)
    setStore((s) => {
      const next = [...(s[key] ?? []), value];
      if (next.length > 14) next.shift();
      return { ...s, [key]: next };
    });
  }
  return arr.length ? arr : [value];
}

function KpiRow({ values, hrefs, loading }: { values: { eyebrow: string; value: number }[]; hrefs: string[]; loading: boolean }) {
  const ref = useStaggerIn();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {values.map((k, i) => (
        <KpiWithHistory key={k.eyebrow} eyebrow={k.eyebrow} value={k.value} href={hrefs[i]} loading={loading} />
      ))}
    </div>
  );
}

function KpiWithHistory({ eyebrow, value, href, loading }: { eyebrow: string; value: number; href: string; loading: boolean }) {
  const history = useHistory(eyebrow, value);
  return <KpiCard eyebrow={eyebrow} value={value} href={href} sparkline={history} loading={loading} />;
}

function buildFlagBuckets(flags: Flag[]) {
  const days: { label: string; low: number; medium: number; high: number; critical: number; total: number }[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({ label: fmtDate(d).slice(0, 6), low: 0, medium: 0, high: 0, critical: 0, total: 0 });
  }
  const start = new Date(now);
  start.setDate(start.getDate() - 13);
  start.setHours(0, 0, 0, 0);

  for (const f of flags) {
    const t = new Date(f.created_at);
    if (t < start) continue;
    const idx = days.length - 1 - Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 86400000);
    if (idx < 0 || idx >= days.length) continue;
    const sev = (f.severity ?? "low") as Severity;
    days[idx][sev] += 1;
    days[idx].total += 1;
  }
  return days;
}

export default function OverviewPage() {
  const centresQ = useQuery({
    queryKey: ["centres", "all"],
    queryFn: () => api<Centre[]>("/centres?sort=risk"),
    refetchInterval: 15_000,
    staleTime: 15_000,
  });
  const openFlagsQ = useQuery({
    queryKey: ["flags", "open", "count"],
    queryFn: () => api<{ items: Flag[] }>("/flags?status=open&limit=100"),
    refetchInterval: 15_000,
    staleTime: 15_000,
  });
  const latestFlagsQ = useQuery({
    queryKey: ["flags", "latest"],
    queryFn: () => api<{ items: Flag[] }>("/flags?limit=10"),
    refetchInterval: 15_000,
    staleTime: 15_000,
  });
  const chartFlagsQ = useQuery({
    queryKey: ["flags", "chart14"],
    queryFn: () => api<{ items: Flag[] }>("/flags?limit=100"),
    refetchInterval: 15_000,
    staleTime: 15_000,
  });
  const offlineQ = useQuery({
    queryKey: ["cameras", "offline"],
    queryFn: () => api<{ items: CameraT[] }>("/cameras?status=offline&limit=100"),
    refetchInterval: 15_000,
    staleTime: 15_000,
  });
  const pendingQ = useQuery({
    queryKey: ["applications", "submitted"],
    queryFn: () => api<Application[]>("/applications?status=submitted"),
    refetchInterval: 15_000,
    staleTime: 15_000,
  });

  const isLoading =
    centresQ.isLoading || openFlagsQ.isLoading || latestFlagsQ.isLoading || offlineQ.isLoading || pendingQ.isLoading;
  const error = centresQ.error || openFlagsQ.error || latestFlagsQ.error || offlineQ.error || pendingQ.error;

  const centres = React.useMemo(() => centresQ.data ?? [], [centresQ.data]);
  const centreById = React.useMemo(() => new Map(centres.map((c) => [c.id, c])), [centres]);
  const openFlags = openFlagsQ.data?.items ?? [];
  const latestFlags = latestFlagsQ.data?.items ?? [];
  const chartFlags = React.useMemo(() => chartFlagsQ.data?.items ?? [], [chartFlagsQ.data]);

  const liveCentres = centres.filter((c) => c.status === "live").length;
  const openCount = openFlags.length;
  const highCritical = openFlags.filter((f) => f.severity === "high" || f.severity === "critical").length;
  const offlineCams = offlineQ.data?.items.length ?? 0;
  const pendingApps = pendingQ.data?.length ?? 0;

  const riskList = React.useMemo(
    () => [...centres].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0)).slice(0, 8),
    [centres]
  );
  const mapCentres = centres;
  const buckets = React.useMemo(() => buildFlagBuckets(chartFlags), [chartFlags]);

  const retry = () => {
    centresQ.refetch();
    openFlagsQ.refetch();
    latestFlagsQ.refetch();
    chartFlagsQ.refetch();
    offlineQ.refetch();
    pendingQ.refetch();
  };

  if (error) {
    return (
      <div className="rounded-lg border bg-card">
        <ErrorState onRetry={retry} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description={
          <>
            Monitoring dashboard · <CurrentDateIST /> · refreshes every 15 s
          </>
        }
      />

      {isLoading ? (
        <KpiRowSkeleton />
      ) : (
        <KpiRow
          loading={false}
          hrefs={["/centres?status=live", "/flags?status=open", "/flags?severity=high", "/cameras?status=offline", "/applications?status=submitted"]}
          values={[
            { eyebrow: "Live centres", value: liveCentres },
            { eyebrow: "Open flags", value: openCount },
            { eyebrow: "High / Critical", value: highCritical },
            { eyebrow: "Cameras offline", value: offlineCams },
            { eyebrow: "Pending applications", value: pendingApps },
          ]}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Map */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Centre locations</CardTitle>
              <span className="text-xs text-muted-foreground">Green &lt; 25 · Amber 25–60 · Red &gt; 60 risk</span>
            </CardHeader>
            <CardContent className="h-96 p-0">
              {isLoading ? <Skeleton className="h-full w-full" /> : <MapComponent centres={mapCentres} />}
            </CardContent>
          </Card>
        </div>

        {/* Latest flags */}
        <Card className="lg:row-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Latest flags</CardTitle>
            <Link href="/flags" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : latestFlags.length === 0 ? (
              <EmptyState
                icon={FlagIcon}
                title="No flags yet"
                hint="Flags appear here when the camera disagrees with claimed data."
              />
            ) : (
              <ul className="divide-y divide-border">
                {latestFlags.map((f) => {
                  const centre = centreById.get(f.centre_id);
                  return (
                    <li key={f.id}>
                      <Link href={`/flags/${f.id}`} className="flex items-start gap-3 py-3 hover:bg-surface-hover">
                        <SeverityDot severity={f.severity} withLabel={false} className="mt-1.5" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-xs font-medium">{f.type}</span>
                            <span className="truncate text-sm text-muted-foreground">
                              {centre ? centre.code : "—"}
                            </span>
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {SEVERITY[(f.severity as Severity) ?? "low"]?.label} · {f.state === "uncertain" ? "Uncertain" : "Flagged"}
                          </span>
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(f.created_at)}</span>
                          </TooltipTrigger>
                          <TooltipContent>{fmtIST(f.created_at)}</TooltipContent>
                        </Tooltip>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Highest risk centres */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Highest risk centres</CardTitle>
            <Link href="/centres" className="text-xs font-medium text-primary hover:underline">
              All centres
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : riskList.length === 0 ? (
              <EmptyState icon={Building2} title="No centres yet" hint="Approved centres appear here with their risk score." />
            ) : (
              riskList.map((c) => (
                <Link key={c.id} href={`/centres/${c.id}`} className="block space-y-1.5 rounded-lg p-2 -mx-2 hover:bg-surface-hover">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    <CentreStatusChip status={c.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                    <span className="text-xs text-muted-foreground">· {c.district}</span>
                  </div>
                  <Meter value={Math.round(c.risk_score ?? 0)} max={100} showValue={false} threshold={{ warning: 0.25, danger: 0.6 }} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Flags per day */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Flags per day (last 14 days, by severity)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : chartFlags.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No flags in the last 14 days"
                hint="Daily counts appear here once the detectors start raising flags."
              />
            ) : (
              <>
                <div className="mb-3 flex flex-wrap gap-3">
                  {(Object.keys(SEVERITY) as Severity[]).map((s) => (
                    <span key={s} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SEV_COLORS[s] }} aria-hidden />
                      {SEVERITY[s].label}
                    </span>
                  ))}
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={buckets} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                        axisLine={{ stroke: "var(--border)" }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <ReTooltip
                        cursor={{ fill: "var(--surface-hover)" }}
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "var(--popover-foreground)",
                          boxShadow: "var(--shadow-pop)",
                        }}
                      />
                      {(Object.keys(SEVERITY) as Severity[]).map((s) => (
                        <Bar key={s} dataKey={s} stackId="sev" fill={SEV_COLORS[s]} isAnimationActive={false} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                  {fmtNum(buckets.reduce((s, d) => s + d.total, 0))} flags in 14 days:{" "}
                  {(Object.keys(SEVERITY) as Severity[]).map((s) => `${buckets.reduce((sum, d) => sum + d[s], 0)} ${SEVERITY[s].label.toLowerCase()}`).join(", ")}.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Privacy line */}
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Camera className="h-3.5 w-3.5" aria-hidden />
        Cameras count people anonymously. Trainee faces are never identified.
        {pendingQ.data && <span className="ml-2"><FileText className="mr-1 inline h-3 w-3" aria-hidden />{pendingApps} pending application{pendingApps === 1 ? "" : "s"}</span>}
        {error && <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden />}
      </p>
    </div>
  );
}
