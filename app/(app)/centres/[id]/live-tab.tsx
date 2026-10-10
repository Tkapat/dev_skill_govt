"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays, Radio } from "lucide-react";
import { api } from "@/lib/api";
import { fmtIST, fmtNum, formatTimeOnly, timeAgo } from "@/lib/format";
import { ITEM_LABEL, LIVE_STATE } from "@/lib/constants";
import { useCountUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { ChartCard } from "@/components/shared/ChartCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LiveStateChip, SeverityDot } from "@/components/shared/StatusChip";
import { SignedImage } from "@/components/shared/SignedImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CentreLiveFeed, LiveStatus } from "@/types";

const SERIES_COLOR = ["var(--primary)", "var(--info)", "var(--warning)"];
const MAX_SERIES = 3;

const stateLabel = (s: string) => (s in LIVE_STATE ? LIVE_STATE[s as keyof typeof LIVE_STATE].label : s);
const itemLabel = (cls: string) => ITEM_LABEL[cls] ?? cls.replace(/(^|\s)\S/g, (c) => c.toUpperCase());

function UsageBar({ pct }: { pct: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1 w-14 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
      </span>
      <span className="tabular text-xs text-muted-foreground">{pct}%</span>
    </span>
  );
}

function RightNowCard({ cam }: { cam: LiveStatus }) {
  const peopleRef = useCountUp(cam.people ?? 0);
  const entries = Object.entries(cam.items ?? {});

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Right now</CardTitle>
        <LiveStateChip state={cam.state} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <span className="flex items-baseline gap-1.5">
            <span
              ref={peopleRef as React.RefObject<HTMLSpanElement>}
              className="tabular text-[36px] font-semibold leading-9"
            />
            <span className="text-xs text-muted-foreground">people in the room</span>
          </span>
          {cam.claimed != null && (
            <p className="tabular mt-1 text-xs text-muted-foreground">
              Claimed {fmtNum(cam.claimed)} / Camera saw {fmtNum(cam.people ?? 0)}
            </p>
          )}
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {cam.session ? cam.session.label : "No active session"}
          </p>
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No equipment detected in this frame.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Class</th>
                  <th className="pb-2 text-right font-medium">Present</th>
                  <th className="pb-2 text-right font-medium">In use</th>
                  <th className="pb-2 text-right font-medium">Idle</th>
                  <th className="pb-2 text-right font-medium">Off</th>
                  <th className="pb-2 pl-3 font-medium">Usage</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([cls, v]) => {
                  const pct = v.present > 0 ? Math.round((v.in_use / v.present) * 100) : 0;
                  return (
                    <tr key={cls} className="border-b border-border/60 last:border-0">
                      <td className="py-2">
                        <span className="font-medium">{itemLabel(cls)}</span>
                        <span className="ml-1.5 font-mono text-xs text-muted-foreground">{cls}</span>
                      </td>
                      <td className="py-2 text-right tabular">{v.present}</td>
                      <td className="py-2 text-right tabular">{v.in_use}</td>
                      <td className="py-2 text-right tabular text-muted-foreground">{v.idle}</td>
                      <td className="py-2 text-right tabular text-muted-foreground">{v.off}</td>
                      <td className="py-2 pl-3">
                        <UsageBar pct={pct} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function LiveTab({ cid, onOpenToday }: { cid: string; onOpenToday: () => void }) {
  const q = useQuery({
    queryKey: ["centre-live", cid],
    queryFn: () => api<CentreLiveFeed>(`/centres/${cid}/live`),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    staleTime: 5000,
  });

  const cams = q.data?.items ?? [];
  const [camId, setCamId] = React.useState<string | null>(null);
  const cam = cams.find((c) => c.camera_id === camId) ?? cams[0] ?? null;

  const points = React.useMemo(() => q.data?.timeline ?? [], [q.data]);
  const available = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of points) for (const [cls, v] of Object.entries(p.items ?? {})) if (v.present > 0) set.add(cls);
    return [...set];
  }, [points]);

  const [series, setSeries] = React.useState<string[]>([]);
  const toggleClass = (cls: string) =>
    setSeries((prev) =>
      prev.includes(cls)
        ? prev.filter((c) => c !== cls)
        : prev.length >= MAX_SERIES
          ? [...prev.slice(1), cls]
          : [...prev, cls]
    );

  const chartData = React.useMemo(
    () =>
      points.map((p) => {
        const row: Record<string, string | number | null> = {
          label: formatTimeOnly(p.ts),
          people: p.people ?? 0,
        };
        for (const c of series) row[c] = p.items?.[c]?.in_use ?? null;
        return row;
      }),
    [points, series]
  );

  const peak = points.reduce((m, p) => Math.max(m, p.people ?? 0), 0);
  const avg = points.length ? points.reduce((s, p) => s + (p.people ?? 0), 0) / points.length : 0;
  const flags = (q.data?.flags ?? []).slice(0, 3);

  if (q.error && !q.data) return <ErrorState onRetry={() => q.refetch()} />;
  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="aspect-video lg:col-span-2" />
          <Skeleton className="h-64 lg:col-span-1" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (cams.length === 0 || !cam) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={Radio}
          title="No cameras are reporting for this centre."
          hint="The live view appears as soon as an approved camera pushes its first frame during a session."
        />
      </div>
    );
  }

  const live = cam.state === "live";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {cams.length > 1 && (
            <div className="flex flex-wrap gap-1 rounded-lg border p-1" role="group" aria-label="Switch camera">
              {cams.map((c) => (
                <button
                  key={c.camera_id}
                  type="button"
                  onClick={() => setCamId(c.camera_id)}
                  aria-pressed={c.camera_id === cam.camera_id}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                    c.camera_id === cam.camera_id
                      ? "bg-accent-soft text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full", c.state === "live" ? "bg-success live-dot" : "bg-muted-foreground")}
                    aria-hidden
                  />
                  {c.camera_name}
                </button>
              ))}
            </div>
          )}

          <div className="relative aspect-video overflow-hidden rounded-lg border bg-surface-2">
            <SignedImage
              url={cam.thumb_url}
              alt={`${cam.camera_name} latest frame`}
              className={cn("h-full w-full rounded-none", !live && "opacity-60")}
            />
            <span className="absolute left-2 top-2 z-10">
              <LiveStateChip state={cam.state} className="bg-background/85" />
            </span>
            <span
              className="tabular absolute right-2 top-2 z-10 rounded-full border bg-background/85 px-2 py-0.5 text-xs text-muted-foreground"
              title={fmtIST(cam.ts)}
            >
              {timeAgo(cam.ts)}
            </span>
            {!live && (
              <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <span className="rounded-full border bg-background/90 px-3 py-0.5 text-xs font-medium shadow-sm">
                  {stateLabel(cam.state)}
                </span>
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {cam.camera_name} · refreshes every 5 s · cameras count people anonymously
          </p>
        </div>

        <RightNowCard cam={cam} />
      </div>

      <ChartCard
        title="Today so far"
        loading={q.isLoading}
        empty={points.length === 0}
        emptyTitle="No camera updates today"
        emptyHint="The people-over-time chart appears once the camera pushes its first frame of the day."
        summary={
          points.length
            ? `${points.length} update(s) since ${formatTimeOnly(points[0].ts)} · peak ${peak} people · average ${avg.toFixed(1)} people${cam.claimed != null ? ` · claimed ${fmtNum(cam.claimed)}` : ""}.`
            : undefined
        }
        control={
          available.length > 0 ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Equipment in-use series">
              {available.map((cls) => {
                const idx = series.indexOf(cls);
                const active = idx >= 0;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => toggleClass(cls)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-accent-soft text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {active && (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: SERIES_COLOR[idx % SERIES_COLOR.length] }}
                        aria-hidden
                      />
                    )}
                    {itemLabel(cls)} in use
                  </button>
                );
              })}
            </div>
          ) : undefined
        }
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <ReTooltip
                cursor={{ stroke: "var(--border)" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--popover-foreground)",
                  boxShadow: "var(--shadow-pop)",
                }}
              />
              <Area
                type="monotone"
                dataKey="people"
                stroke="var(--foreground)"
                strokeWidth={2}
                fill="var(--foreground)"
                fillOpacity={0.08}
                isAnimationActive={false}
                connectNulls
                name="People"
              />
              {series.map((cls, i) => (
                <Line
                  key={cls}
                  type="monotone"
                  dataKey={cls}
                  stroke={SERIES_COLOR[i % SERIES_COLOR.length]}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                  name={`${itemLabel(cls)} in use`}
                />
              ))}
              {cam.claimed != null && (
                <ReferenceLine
                  y={cam.claimed}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  label={{ value: `Claimed ${cam.claimed}`, position: "insideTopRight", fontSize: 11, fill: "var(--muted-foreground)" }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
        <span className="text-sm font-medium">Latest flags</span>
        {flags.length === 0 ? (
          <span className="text-xs text-muted-foreground">No flags raised today.</span>
        ) : (
          <span className="flex flex-wrap items-center gap-3">
            {flags.map((f) => (
              <Link
                key={f.id}
                href={`/flags/${f.id}`}
                className="inline-flex items-center gap-1.5 text-xs hover:underline"
              >
                <SeverityDot severity={f.severity} withLabel={false} />
                <span className="font-mono">{f.type}</span>
                <span className="max-w-56 truncate text-muted-foreground">{f.reason}</span>
                <span className="tabular text-muted-foreground">{timeAgo(f.created_at)}</span>
              </Link>
            ))}
          </span>
        )}
        <Button variant="secondary" size="sm" className="ml-auto" onClick={onOpenToday}>
          <CalendarDays className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Open today in calendar
        </Button>
      </div>
    </div>
  );
}
