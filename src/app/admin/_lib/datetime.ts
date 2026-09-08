/**
 * Indian Standard Time helpers for the dashboard. The editor's publish-date input is interpreted
 * as IST regardless of the browser's own time zone, so the owner sees the same clock everywhere.
 */

const IST = "Asia/Kolkata";

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Formats a Date for a `datetime-local` input, in IST ("2026-06-14T09:30"). */
export function toISTInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const parts = partsFmt.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Parses a `datetime-local` value as IST. Returns null for empty or malformed input. */
export function fromISTInputValue(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? "00"}+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "14 Jun 2026, 09:30" in IST. */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return dateTimeFmt.format(d);
}

/** True when the date is still ahead of us (a scheduled publish date). Kept out of components so renders stay pure. */
export function isInFuture(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? new Date(date) : date;
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
}
