type StoreHours = {
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
};

const KIGALI_OFFSET_MINUTES = 2 * 60;

function parseClock(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function kigaliMinutesNow(now = new Date()) {
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return (utcMinutes + KIGALI_OFFSET_MINUTES) % (24 * 60);
}

export function isStoreOpenInKigali(store: StoreHours, now = new Date()) {
  // Admin can immediately stop orders regardless of the configured schedule.
  if (!store.isOpen) return false;

  const opensAt = parseClock(store.opensAt);
  const closesAt = parseClock(store.closesAt);
  if (opensAt === null || closesAt === null) return false;
  if (opensAt === closesAt) return true;

  const current = kigaliMinutesNow(now);
  if (opensAt < closesAt) return current >= opensAt && current < closesAt;

  // An interval such as 18:00–02:00 crosses midnight.
  return current >= opensAt || current < closesAt;
}
