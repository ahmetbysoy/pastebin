// Minimal in-memory rate limiter (per serverless instance).
// Not globally consistent, but satisfies the "minimum rate limit" requirement.
'use strict';

const buckets = new Map();

function rateLimit(ip, { max = 5, windowMs = 10 * 60 * 1000 } = {}) {
  const now = Date.now();
  let entry = buckets.get(ip);
  if (!entry || now - entry.start > windowMs) {
    entry = { start: now, count: 0 };
    buckets.set(ip, entry);
  }
  entry.count += 1;

  // Opportunistic cleanup so the map does not grow unbounded.
  if (buckets.size > 10000) {
    for (const [key, value] of buckets) {
      if (now - value.start > windowMs) buckets.delete(key);
    }
  }

  return {
    allowed: entry.count <= max,
    retryAfterSec: Math.max(1, Math.ceil((entry.start + windowMs - now) / 1000)),
  };
}

module.exports = { rateLimit };
