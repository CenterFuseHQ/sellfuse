export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("REQUEST_TOO_LARGE");
    this.name = "RequestBodyTooLargeError";
  }
}

export class InvalidJsonBodyError extends Error {
  constructor() {
    super("INVALID_JSON");
    this.name = "InvalidJsonBodyError";
  }
}

export const HTTP_BODY_LIMITS = Object.freeze({
  authentication: 16 * 1024,
  standard: 1024 * 1024,
  analysis: 36 * 1024 * 1024,
});

export const RATE_LIMIT_BUCKETS = Object.freeze({
  maximumKeys: 10_000,
  authentication: { attempts: 10, windowMs: 60_000 },
  analysis: { attempts: 5, windowMs: 60_000 },
  // API preparations can fan out to six calls (initial plus one repair across
  // identification, valuation, and listing). Several sellers share one API
  // source address at the gateway, so that budget needs separate headroom.
  gatewayInference: { attempts: 100, windowMs: 60_000 },
});

export async function readJsonBody(
  source: AsyncIterable<Uint8Array | string>,
  maximumBytes: number,
): Promise<unknown | undefined> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0)
    throw new RangeError("maximumBytes must be a positive safe integer");

  const chunks: Buffer[] = [];
  let size = 0;

  const iterator = source[Symbol.asyncIterator]();
  for (;;) {
    const next = await iterator.next();
    if (next.done) break;
    const buffer = Buffer.isBuffer(next.value) ? next.value : Buffer.from(next.value);
    size += buffer.byteLength;
    if (size > maximumBytes) {
      // Leave an oversized live request unread so the HTTP server can send 413
      // and close the connection instead of waiting for an attacker to finish it.
      chunks.length = 0;
      throw new RequestBodyTooLargeError();
    }
    chunks.push(buffer);
  }

  if (!size) return undefined;

  try {
    return JSON.parse(Buffer.concat(chunks, size).toString("utf8")) as unknown;
  } catch {
    throw new InvalidJsonBodyError();
  }
}

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly maximumAttempts: number,
    private readonly windowMs: number,
    private readonly maximumKeys = RATE_LIMIT_BUCKETS.maximumKeys,
    private readonly now: () => number = Date.now,
  ) {
    if (
      !Number.isSafeInteger(maximumAttempts) ||
      maximumAttempts <= 0 ||
      !Number.isSafeInteger(windowMs) ||
      windowMs <= 0 ||
      !Number.isSafeInteger(maximumKeys) ||
      maximumKeys <= 0
    )
      throw new RangeError("Rate limit settings must be positive safe integers");
  }

  allow(key: string): boolean {
    if (!key) return false;
    const now = this.now();
    const current = this.buckets.get(key);

    if (current && current.resetAt > now) {
      if (current.count >= this.maximumAttempts) return false;
      current.count += 1;
      return true;
    }
    if (current) this.buckets.delete(key);

    if (this.buckets.size >= this.maximumKeys) {
      for (const [candidate, bucket] of this.buckets) {
        if (bucket.resetAt <= now) this.buckets.delete(candidate);
      }
      if (this.buckets.size >= this.maximumKeys) return false;
    }

    this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
    return true;
  }
}
