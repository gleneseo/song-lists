import { countLabel } from "./count-label";

const DAY_MS = 24 * 60 * 60 * 1000;

// Timestamps are stored without a time zone and read back as UTC, so format
// them in UTC too -- otherwise a date shifts back a day west of Greenwich.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

/** "Aug 6, 2026". */
function formatDate(date: Date): string {
  return dateFormat.format(date);
}

/** A coarse "how long ago" -- "today", "3 days ago", "5 months ago", "2 years ago". */
function formatTimeAgo(date: Date, now: Date): string {
  const days = Math.floor((now.getTime() - date.getTime()) / DAY_MS);

  if (days < 1) {
    return "today";
  }

  if (days < 30) {
    return `${countLabel(days, "day")} ago`;
  }

  if (days < 365) {
    return `${countLabel(Math.floor(days / 30), "month")} ago`;
  }

  return `${countLabel(Math.floor(days / 365), "year")} ago`;
}

export { formatDate, formatTimeAgo };
