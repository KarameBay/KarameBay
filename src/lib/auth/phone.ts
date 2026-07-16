export function normalizeRwandaPhone(value: string) {
  const raw = value.trim();
  if (!/^[+\d\s()-]+$/.test(raw)) return null;
  const compact = raw.replace(/[\s()-]/g, "");
  const digits = compact.startsWith("+") ? compact.slice(1) : compact;

  let local: string;
  if (/^07\d{8}$/.test(digits)) local = digits.slice(1);
  else if (/^2507\d{8}$/.test(digits)) local = digits.slice(3);
  else return null;

  return `+250${local}`;
}
