const attempts = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit = 8, windowMs = 60_000) {
  const now = Date.now();
  if (attempts.size > 1_000) {
    for (const [storedKey, value] of attempts) {
      if (value.reset < now) attempts.delete(storedKey);
    }
  }
  const current = attempts.get(key);
  if (!current || current.reset < now) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count++;
  return true;
}
