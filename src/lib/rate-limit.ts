import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/redis";

const buckets = new Map<string, number[]>();

function memoryLimit(
  key: string,
  max: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const prev = buckets.get(key) ?? [];
  const hits = prev.filter((t) => t > windowStart);
  if (hits.length >= max) {
    const oldest = Math.min(...hits);
    const retryAfterMs = windowMs - (now - oldest);
    buckets.set(key, hits);
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { ok: true };
}

let loginLimiter: Ratelimit | null = null;
let registerLimiter: Ratelimit | null = null;
let forgotLimiter: Ratelimit | null = null;

function getLoginLimiter() {
  const redis = getRedis();
  if (!redis) return null;
  if (!loginLimiter) {
    loginLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(12, "15 m"),
      prefix: "tf:rl:login",
    });
  }
  return loginLimiter;
}

function getRegisterLimiter() {
  const redis = getRedis();
  if (!redis) return null;
  if (!registerLimiter) {
    registerLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(8, "1 h"),
      prefix: "tf:rl:register",
    });
  }
  return registerLimiter;
}

function getForgotLimiter() {
  const redis = getRedis();
  if (!redis) return null;
  if (!forgotLimiter) {
    forgotLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(6, "1 h"),
      prefix: "tf:rl:forgot",
    });
  }
  return forgotLimiter;
}

export async function checkAuthRateLimitAsync(
  kind: "login" | "register" | "forgot",
  key: string,
  memoryFallback: { max: number; windowMs: number },
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const limiter =
    kind === "login"
      ? getLoginLimiter()
      : kind === "register"
        ? getRegisterLimiter()
        : getForgotLimiter();

  if (limiter) {
    const { success, reset } = await limiter.limit(key);
    if (!success) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((reset - Date.now()) / 1000),
      );
      return { ok: false, retryAfterSec };
    }
    return { ok: true };
  }

  return memoryLimit(`${kind}:${key}`, memoryFallback.max, memoryFallback.windowMs);
}

/** Rate limit sinkron (in-memory) — untuk hot path tanpa await; fallback jika Redis tidak ada. */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  return memoryLimit(key, max, windowMs);
}

export function getRequestLimiterKey(
  request: Request,
  userId: string | undefined,
  route: string,
): string {
  const fwd = request.headers.get("x-forwarded-for");
  const ip =
    fwd?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  return `${route}:${ip}:${userId ?? "anon"}`;
}
