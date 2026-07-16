const KIGALI_OFFSET_MS = 2 * 60 * 60 * 1_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function kigaliDate(value: string | number | Date) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getTime() + KIGALI_OFFSET_MS);
}

export function formatKigaliDate(value: string | number | Date) {
  const date = kigaliDate(value);
  if (!date) return "—";
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function formatKigaliTime(value: string | number | Date) {
  const date = kigaliDate(value);
  if (!date) return "—";
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatKigaliDateTime(value: string | number | Date) {
  return `${formatKigaliDate(value)}, ${formatKigaliTime(value)}`;
}
