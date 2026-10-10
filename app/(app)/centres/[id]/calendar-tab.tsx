"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight, Flag as FlagIcon, Inbox, Minus } from "lucide-react";
import { api } from "@/lib/api";
import { fmtIST, fmtNum, formatTimeOnly, timeAgo } from "@/lib/format";
import {
  fmtDayLong,
  heatBg,
  heatLevel,
  isYmd,
  monthGrid,
  monthLabel,
  monthRange,
  parseYmd,
  shiftDay,
  shiftMonth,
  todayIST,
} from "@/lib/calendar";
import { DAY_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { DayStatusChip, DAY_STATUS_ICON, FlagStatusChip, FlagTypeChip, SeverityDot } from "@/components/shared/StatusChip";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { SignedImage } from "@/components/shared/SignedImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CalendarDay, CalendarDayDetail, CalendarSession } from "@/types";

const LEGEND: string[] = ["ok", "attention", "critical", "no_data", "holiday", "upcoming"];

const TONE_TEXT: Record<string, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  uncertain: "text-uncertain",
  muted: "text-muted-foreground",
};

const statusText = (status: string) =>
  TONE_TEXT[DAY_STATUS[status as keyof typeof DAY_STATUS]?.tone ?? "muted"] ?? "text-muted-foreground";

const SESSION_BADGE: Record<string, "success" | "warning" | "neutral" | "info"> = {
  active: "success",
  closed: "neutral",
  missed: "warning",
  scheduled: "info",
};

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-surface p-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="tabular mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function DeltaChip({ day }: { day: CalendarDay }) {
  if (day.claimed == null || day.observed == null) return null;
  const d = day.claimed - day.observed;
  return (
    <span
      className={cn(
        "tabular inline-flex h-4 items-center rounded-full border px-1 text-[10px] font-medium",
        d > 0
          ? "border-warning/30 bg-warning/10 text-warning"
          : d === 0
            ? "border-success/30 bg-success/10 text-success"
            : "border-info/30 bg-info/10 text-info"
      )}
    >
      {d > 0 ? `+${d}` : d}
    </span>
  );
}

function dayAriaLabel(dateStr: string, day?: CalendarDay) {
  const base = fmtDayLong(dateStr);
  if (!day) return `${base}. No data.`;
  const parts = [
    base,
    DAY_STATUS[day.status]?.label ?? day.status,
    `${day.updates} update${day.updates === 1 ? "" : "s"}`,
  ];
  if (day.people_avg != null) parts.push(`people average ${day.people_avg}`);
  if (day.claimed != null && day.observed != null)
    parts.push(`claimed ${day.claimed}, camera observed ${day.observed}`);
  if (day.flags) parts.push(`${day.flags.open} open flag${day.flags.open === 1 ? "" : "s"}`);
  return parts.join(", ") + ".";
}

function DayCell({
  dateStr,
  day,
  maxUpdates,
  isToday,
  selected,
  onSelect,
}: {
  dateStr: string;
  day?: CalendarDay;
  maxUpdates: number;
  isToday: boolean;
  selected: boolean;
  onSelect: (d: string) => void;
}) {
  const { d } = parseYmd(dateStr);
  const status = day?.status ?? "no_data";
  const Icon = DAY_STATUS_ICON[status as keyof typeof DAY_STATUS_ICON] ?? Minus;
  const level = heatLevel(day?.updates ?? 0, maxUpdates);

  return (
    <button
      type="button"
      onClick={() => onSelect(dateStr)}
      aria-label={dayAriaLabel(dateStr, day)}
      aria-pressed={selected}
      className={cn(
        "flex min-h-20 flex-col gap-1 rounded-lg border p-1.5 text-left transition-colors",
        "hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary" : "border-border",
        isToday && "ring-2 ring-ring"
      )}
      style={heatBg(level) ? { background: heatBg(level) } : undefined}
    >
      <span className="flex items-start justify-between gap-1">
        <span className="font-mono text-xs tabular">{String(d).padStart(2, "0")}</span>
        <Icon className={cn("h-3.5 w-3.5 shrink-0", statusText(status))} aria-hidden />
      </span>
      <span className="tabular text-[10px] text-muted-foreground">{day?.updates ?? 0} upd</span>
      <span className="mt-auto space-y-1">
        <span className="block h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <span
            className="block h-full rounded-full bg-primary"
            style={{ width: `${maxUpdates > 0 ? Math.round(((day?.updates ?? 0) / maxUpdates) * 100) : 0}%` }}
          />
        </span>
        <span className="flex items-center justify-between gap-1">
          <span className="tabular text-[10px] text-muted-foreground">
            {day?.people_avg != null ? `${day.people_avg} avg` : "—"}
          </span>
          {day && <DeltaChip day={day} />}
        </span>
      </span>
    </button>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {Array.from({ length: 35 }).map((_, i) => (
        <Skeleton key={i} className="min-h-20 rounded-lg" />
      ))}
    </div>
  );
}

function SessionCard({ s }: { s: CalendarSession }) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{s.label ?? "Scheduled batch"}</span>
        <Badge variant={SESSION_BADGE[s.state] ?? "secondary"}>{s.state}</Badge>
      </div>
      <p className="tabular text-xs text-muted-foreground">
        {formatTimeOnly(s.start_ts)} – {formatTimeOnly(s.end_ts)} · {fmtIST(s.start_ts).split(",")[0]}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <span className="tabular">
          <span className="text-muted-foreground">Claimed </span>
          {s.claimed ?? "—"}
        </span>
        <span className="tabular">
          <span className="text-muted-foreground">Observed </span>
          {s.observed ?? "—"}
        </span>
        <span className="tabular">
          <span className="text-muted-foreground">Range </span>
          {s.ci_low != null ? `${s.ci_low}–${s.ci_high}` : "—"}
        </span>
        <span className="tabular">
          <span className="text-muted-foreground">Delta </span>
          <span className={cn((s.delta ?? 0) > 0 && "text-warning font-medium")}>{s.delta ?? "—"}</span>
        </span>
        <span className="tabular">
          <span className="text-muted-foreground">Snapshots </span>
          {s.snapshots}
        </span>
        <span className="tabular">
          <span className="text-muted-foreground">Trainer verified </span>
          {s.staff_verified == null ? "—" : s.staff_verified ? "Yes" : "No"}
        </span>
      </div>
    </div>
  );
}

function DayDrawer({
  cid,
  date,
  onDateChange,
  onClose,
}: {
  cid: string;
  date: string;
  onDateChange: (d: string) => void;
  onClose: () => void;
}) {
  const today = todayIST();
  const q = useQuery({
    queryKey: ["centre-day", cid, date],
    queryFn: () => api<CalendarDayDetail>(`/centres/${cid}/calendar/${date}`),
    enabled: isYmd(date),
    staleTime: 15_000,
    refetchInterval: date === today ? 30_000 : false,
    refetchIntervalInBackground: false,
  });

  const detail = q.data;
  const s = detail?.summary;
  const evidenceUrls = (detail?.evidence ?? []).map((e) => e.url);

  const timelineData = React.useMemo(
    () =>
      (detail?.timeline.points ?? []).map((p) => ({
        label: formatTimeOnly(p.ts),
        people: p.people ?? 0,
      })),
    [detail]
  );

  const emptyDay =
    !!detail &&
    detail.summary.updates === 0 &&
    detail.sessions.length === 0 &&
    detail.timeline.points.length === 0 &&
    detail.flags.length === 0 &&
    detail.evidence.length === 0;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="flex-row items-start justify-between space-y-0 pr-8">
          <div className="space-y-1.5">
            <SheetTitle className="text-base">{date ? fmtDayLong(date) : "Day"}</SheetTitle>
            {s && <DayStatusChip status={s.status} />}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDateChange(shiftDay(date, -1))}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDateChange(shiftDay(date, 1))}
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </SheetHeader>

        {q.error && !detail && (
          <div className="rounded-lg border bg-card">
            <ErrorState onRetry={() => q.refetch()} />
          </div>
        )}
        {q.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {detail && s && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <StatTile label="Updates" value={fmtNum(s.updates)} />
              <StatTile
                label="People max / avg"
                value={`${s.people_max ?? "—"} / ${s.people_avg ?? "—"}`}
              />
              <StatTile
                label="Claimed vs observed"
                value={
                  s.claimed == null && s.observed == null
                    ? "—"
                    : `${s.claimed ?? "—"} / ${s.observed ?? "—"}`
                }
              />
              <StatTile
                label="Flags (open / total)"
                value={s.flags ? `${s.flags.open} / ${s.flags.total}` : "0 / 0"}
              />
              <StatTile label="Camera uptime" value={s.uptime_pct != null ? `${s.uptime_pct}%` : "—"} />
              <StatTile label="Snapshots" value={fmtNum(s.snapshots)} />
            </div>

            {emptyDay ? (
              <div className="rounded-lg border bg-card">
                <EmptyState
                  icon={Inbox}
                  title="No camera data for this day."
                  hint="The centre has no snapshots, sessions or flags recorded for this date."
                />
              </div>
            ) : (
              <Tabs defaultValue="sessions">
                <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
                  {[
                    { id: "sessions", label: "Sessions" },
                    { id: "timeline", label: "Timeline" },
                    { id: "equipment", label: "Equipment" },
                    { id: "flags", label: "Flags" },
                    { id: "evidence", label: "Evidence" },
                  ].map((t) => (
                    <TabsTrigger
                      key={t.id}
                      value={t.id}
                      className="rounded-md border border-transparent data-[state=active]:border-border data-[state=active]:bg-surface"
                    >
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="sessions" className="mt-3">
                  {detail.sessions.length === 0 ? (
                    <EmptyState
                      icon={Inbox}
                      title="No sessions scheduled"
                      hint="Sessions appear here once the centre creates a batch schedule for this date."
                    />
                  ) : (
                    <div className="space-y-3">
                      {detail.sessions.map((sess) => (
                        <SessionCard key={sess.id} s={sess} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="timeline" className="mt-3">
                  {timelineData.length === 0 ? (
                    <EmptyState
                      icon={Inbox}
                      title="No timeline points"
                      hint="People-over-time appears once the camera pushes frames on this day."
                    />
                  ) : (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timelineData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
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
                            stroke="var(--primary)"
                            strokeWidth={2}
                            fill="var(--primary)"
                            fillOpacity={0.1}
                            isAnimationActive={false}
                            connectNulls
                            name="People"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="equipment" className="mt-3">
                  {detail.equipment.length === 0 ? (
                    <EmptyState
                      icon={Inbox}
                      title="No equipment observed"
                      hint="Per-class presence and usage appears here after the first snapshot of the day."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="pb-2 font-medium">Class</th>
                            <th className="pb-2 text-right font-medium">Sanctioned</th>
                            <th className="pb-2 text-right font-medium">Declared</th>
                            <th className="pb-2 text-right font-medium">Present avg / max</th>
                            <th className="pb-2 text-right font-medium">In use avg</th>
                            <th className="pb-2 text-right font-medium">In use %</th>
                            <th className="pb-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.equipment.map((e) => (
                            <tr key={e.class} className="border-b border-border/60 last:border-0">
                              <td className="py-2">
                                <span className="font-medium">{e.label}</span>
                                <span className="ml-1.5 font-mono text-xs text-muted-foreground">{e.class}</span>
                              </td>
                              <td className="py-2 text-right tabular">{e.sanctioned}</td>
                              <td className="py-2 text-right tabular">{e.declared}</td>
                              <td className="py-2 text-right tabular">
                                {e.present_avg} / {e.present_max}
                              </td>
                              <td className="py-2 text-right tabular">{e.in_use_avg}</td>
                              <td className="py-2 text-right tabular">{e.in_use_pct}%</td>
                              <td className="py-2">
                                {e.status === "ok" ? (
                                  <Badge variant="success">OK</Badge>
                                ) : (
                                  <Badge variant="violet">Repair approved</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="flags" className="mt-3">
                  {detail.flags.length === 0 ? (
                    <EmptyState
                      icon={FlagIcon}
                      title="No flags on this day"
                      hint="Camera disagreements, equipment shortfalls and ghost-session checks raise flags here."
                    />
                  ) : (
                    <div className="space-y-3">
                      {detail.flags.map((f) => (
                        <Link
                          key={f.id}
                          href={`/flags/${f.id}`}
                          className="block rounded-lg border p-3 transition-colors hover:border-border-strong"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <SeverityDot severity={f.severity} />
                            <FlagTypeChip type={f.type} />
                            <FlagStatusChip status={f.status} />
                            <span className="tabular ml-auto text-xs text-muted-foreground">
                              {timeAgo(f.created_at)}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm">{f.reason}</p>
                          {f.evidence_urls.length > 0 && (
                            <div className="mt-2 flex gap-2">
                              {f.evidence_urls.slice(0, 4).map((u) => (
                                <SignedImage
                                  key={u}
                                  url={u}
                                  alt="Flag evidence"
                                  gallery={f.evidence_urls}
                                  className="h-16 w-24"
                                />
                              ))}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="evidence" className="mt-3">
                  {detail.evidence.length === 0 ? (
                    <EmptyState
                      icon={Inbox}
                      title="No evidence captured"
                      hint="Routine frames and flag captures are stored here with the time they were taken."
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {detail.evidence.map((e) => (
                        <figure key={e.id} className="overflow-hidden rounded-lg border bg-card">
                          <SignedImage
                            url={e.url}
                            alt={`${e.kind} evidence`}
                            gallery={evidenceUrls}
                            className="aspect-video w-full"
                          />
                          <figcaption className="space-y-0.5 p-2">
                            <p className="text-xs font-medium capitalize">{e.kind}</p>
                            <p className="text-[11px] text-muted-foreground">{fmtIST(e.ts)}</p>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function CalendarTab({
  cid,
  date,
  onDateChange,
}: {
  cid: string;
  date: string | null;
  onDateChange: (d: string | null) => void;
}) {
  const today = todayIST();
  const [ym, setYm] = React.useState<{ y: number; m: number }>(() => {
    const { y, m } = parseYmd(date && isYmd(date) ? date : today);
    return { y, m };
  });
  const [view, setView] = React.useState<"month" | "year">("month");

  React.useEffect(() => {
    if (!date || !isYmd(date)) return;
    const { y, m } = parseYmd(date);
    setYm((cur) => (cur.y === y && cur.m === m ? cur : { y, m }));
  }, [date]);

  const { from, to } = monthRange(ym.y, ym.m);
  const q = useQuery({
    queryKey: ["centre-calendar", cid, from, to],
    queryFn: () => api<{ items: CalendarDay[] }>(`/centres/${cid}/calendar?from=${from}&to=${to}`),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const days = React.useMemo(() => q.data?.items ?? [], [q.data]);
  const byDate = React.useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const maxUpdates = days.reduce((m, d) => Math.max(m, d.updates), 0);
  const weeks = React.useMemo(() => monthGrid(ym.y, ym.m), [ym.y, ym.m]);
  const prev = shiftMonth(ym.y, ym.m, -1);
  const next = shiftMonth(ym.y, ym.m, 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setYm(prev)}
            aria-label={`Previous month, ${monthLabel(prev.y, prev.m)}`}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <h3 className="w-40 text-center text-sm font-semibold">{monthLabel(ym.y, ym.m)}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setYm(next)}
            aria-label={`Next month, ${monthLabel(next.y, next.m)}`}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const t = parseYmd(today);
            setYm({ y: t.y, m: t.m });
          }}
        >
          Today
        </Button>

        <div className="flex rounded-lg border" role="group" aria-label="Calendar view">
          <Button
            variant={view === "month" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 rounded-r-none px-3"
            onClick={() => setView("month")}
            aria-pressed={view === "month"}
          >
            Month
          </Button>
          <Button
            variant={view === "year" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 rounded-l-none px-3"
            disabled
            aria-pressed={view === "year"}
            title="Year view coming soon"
          >
            Year
          </Button>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {LEGEND.map((st) => {
            const meta = DAY_STATUS[st as keyof typeof DAY_STATUS];
            const Icon = DAY_STATUS_ICON[st as keyof typeof DAY_STATUS_ICON];
            return (
              <span key={st} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Icon className={cn("h-3.5 w-3.5", statusText(st))} aria-hidden />
                {meta.label}
              </span>
            );
          })}
        </div>
      </div>

      {q.error && !q.data ? (
        <div className="rounded-lg border bg-card">
          <ErrorState onRetry={() => q.refetch()} />
        </div>
      ) : q.isLoading ? (
        <GridSkeleton />
      ) : (
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-1.5 pb-1.5">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {weeks.flat().map((cell, i) =>
                cell === "" ? (
                  <span key={`pad-${i}`} aria-hidden />
                ) : (
                  <DayCell
                    key={cell}
                    dateStr={cell}
                    day={byDate.get(cell)}
                    maxUpdates={maxUpdates}
                    isToday={cell === today}
                    selected={cell === date}
                    onSelect={onDateChange}
                  />
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Heat intensity follows updates in the month. Select a day to inspect sessions, timeline,
        equipment, flags and evidence. · Range {from} to {to}
      </p>

      {date && isYmd(date) && (
        <DayDrawer cid={cid} date={date} onDateChange={onDateChange} onClose={() => onDateChange(null)} />
      )}
    </div>
  );
}
