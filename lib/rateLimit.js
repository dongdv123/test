const buckets = new Map();

const getIpFromReq = (req) => {
  const xff = req.headers?.["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) {
    return xff.split(",")[0].trim();
  }
  return (
    req.headers?.["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "unknown"
  );
};

/**
 * Very lightweight in-memory rate limiter (per instance).
 * Not suitable for multi-instance without external store.
 */
export function checkRateLimit({ key, windowMs = 60_000, max = 60 }) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.start > windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= max;
}

export function getClientIp(req) {
  return getIpFromReq(req);
}


