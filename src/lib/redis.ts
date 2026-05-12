import "server-only";

import { Redis } from "@upstash/redis";

let client: Redis | null = null;

/** Redis (Upstash) opsional — fallback null jika env tidak lengkap. */
export function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!client) {
    client = new Redis({ url, token });
  }
  return client;
}
