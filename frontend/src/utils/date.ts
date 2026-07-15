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
