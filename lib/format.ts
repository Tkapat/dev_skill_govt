const IST = "Asia/Kolkata";

function safeDate(d: string | Date | null | undefined): Date | null {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

export const fmtIST = (d: string | Date | null | undefined): string => {
  const dt = safeDate(d);
  if (!dt) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(dt);
};

export const fmtDate = (d: string | Date | null | undefined): string => {
  const dt = safeDate(d);
  if (!dt) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(dt);
};

export function timeAgo(d: string | Date | null | undefined): string {
  const dt = safeDate(d);
  if (!dt) return "—";
  const s = Math.round((dt.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [604800, "day"],
  ];
  for (const [lim, unit] of steps)
    if (Math.abs(s) < lim) {
      const div = unit === "second" ? 1 : unit === "minute" ? 60 : unit === "hour" ? 3600 : 86400;
      return rtf.format(Math.round(s / div), unit);
    }
  return fmtDate(dt);
}

/** UI rule: show relative time, exact fmtIST() in a Tooltip on hover. */
export const tooltipTime = (d: string | Date | null | undefined): string => {
  const dt = safeDate(d);
  if (!dt) return "— (IST)";
  return `${fmtIST(dt)} (IST)`;
};

export const fmtNum = (n: number) => n.toLocaleString("en-IN");
export const fmtPct = (n: number) => `${Math.round(n)} %`;

/* aliases kept for existing imports */
export const formatDate = fmtIST;
export const formatDateOnly = fmtDate;
export const relativeTime = timeAgo;
export const toTooltip = tooltipTime;

export function formatTimeOnly(d: string | Date | null | undefined): string {
  const dt = safeDate(d);
  if (!dt) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(dt);
}