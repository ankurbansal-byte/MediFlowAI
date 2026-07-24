/**
 * Formats a date string into a short format: "MMM D" (e.g., "Oct 24").
 * If the date is invalid or missing, returns the specified fallback string.
 */
export const formatShortDate = (recordedAt?: string, fallback = "Unknown date") => {
  if (!recordedAt) {
    return fallback;
  }

  const date = new Date(recordedAt);
  return Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
};

/**
 * Formats a date string into a detailed clinical long format: "MMM D, YYYY, H:MM AM/PM" (e.g., "Oct 24, 2023, 10:30 AM").
 * If the date is invalid or missing, returns the specified fallback string.
 */
export const formatLongDate = (recordedAt?: string, fallback = "Not recorded") => {
  if (!recordedAt) {
    return fallback;
  }

  const date = new Date(recordedAt);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

/**
 * Formats a date string into a clean date and time string: "D MMM YYYY · h:mm AM/PM" (e.g., "23 Jul 2026 · 7:32 PM").
 */
export const formatRecordDateTime = (recordedAt?: string, fallback = "—") => {
  if (!recordedAt) {
    return fallback;
  }

  const date = new Date(recordedAt);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const dateStr = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);

  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date);

  return `${dateStr} · ${timeStr}`;
};

/**
 * Maps glucose context internal strings to patient-friendly display labels.
 */
export const formatGlucoseContext = (context?: string): string => {
  if (!context) return "";
  switch (context.toLowerCase()) {
    case "fasting":
      return "Fasting";
    case "pre_meal":
      return "Pre-meal";
    case "post_meal":
      return "Post-meal";
    case "random":
      return "Random";
    default:
      return "";
  }
};

/**
 * Formats a date or string into a timezone-agnostic local date string "YYYY-MM-DD".
 */
export const getLocalDateString = (dateOrStr?: string | Date) => {
  if (!dateOrStr) return "";
  const d = new Date(dateOrStr);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
