const IST = "Asia/Kolkata";

export const fmtIST = (d: string | Date) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(d));

export const fmtDate = (d: string | Date) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(d));

export function timeAgo(d: string | Date) {
  const s = Math.round((new Date(d).getTime() - Date.now()) / 1000);
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
  return fmtDate(d);
}

export const fmtNum = (n: number) => n.toLocaleString("en-IN");

export const fmtPct = (n: number) => `${Math.round(n)} %`;

/** UI rule: show relative time, exact fmtIST() in a Tooltip on hover. */
export const tooltipTime = (d: string | Date) => `${fmtIST(d)} (IST)`;

/* aliases kept for existing imports */
export const formatDate = fmtIST;
export const formatDateOnly = fmtDate;
export const relativeTime = timeAgo;
export const toTooltip = tooltipTime;
export function formatTimeOnly(d: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(d));
}
