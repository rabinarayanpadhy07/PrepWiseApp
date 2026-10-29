// Amounts are stored by the backend in minor units (paise for INR).
export function formatMoney(amountMinor, currency) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
  }).format(amountMinor / 100);
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : "";
}

export function formatDateTime(value) {
  return value ? dateTimeFormatter.format(new Date(value)) : "";
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

/** 75 -> "1:15" */
export function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** 4500 -> "1 hr 15 min", 90 -> "1 min 30 sec" */
export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
  if (minutes) return seconds % 60 ? `${minutes} min ${seconds % 60} sec` : `${minutes} min`;
  return `${seconds} sec`;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
