/**
 * Fixed-window rate limiter backed by the database (works on serverless where memory is per-instance),
 * with an in-memory fast path for the common case.
 */
import { sql } from "drizzle-orm";
import { getDb, schema } from "@/db/client";

type Options = { limit: number; windowMs: number };

const memory = new Map<string, { count: number; windowStart: number }>();

export async function rateLimit(key: string, { limit, windowMs }: Options): Promise<{ ok: boolean; remaining: number }> {
  const now = Date.now();
  const mem = memory.get(key);
  if (mem && now - mem.windowStart < windowMs && mem.count >= limit) {
    return { ok: false, remaining: 0 };
  }

  const db = await getDb();
  const windowStart = new Date(now);
  const cutoff = new Date(now - windowMs);
  const rows = await db
    .insert(schema.rateLimits)
    .values({ key, count: 1, windowStart })
    .onConflictDoUpdate({
      target: schema.rateLimits.key,
      set: {
        count: sql`CASE WHEN ${schema.rateLimits.windowStart} < ${cutoff} THEN 1 ELSE ${schema.rateLimits.count} + 1 END`,
        windowStart: sql`CASE WHEN ${schema.rateLimits.windowStart} < ${cutoff} THEN ${windowStart} ELSE ${schema.rateLimits.windowStart} END`,
      },
    })
    .returning({ count: schema.rateLimits.count, windowStart: schema.rateLimits.windowStart });

  const count = rows[0]?.count ?? 1;
  const start = rows[0]?.windowStart?.getTime() ?? now;
  memory.set(key, { count, windowStart: start });
  if (memory.size > 5000) memory.clear();
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}

/** Common presets. */
export const RATE_LIMITS = {
  comment: { limit: 5, windowMs: 10 * 60_000 },
  thread: { limit: 3, windowMs: 30 * 60_000 },
  reply: { limit: 8, windowMs: 10 * 60_000 },
  report: { limit: 10, windowMs: 60 * 60_000 },
  submission: { limit: 3, windowMs: 60 * 60_000 },
  login: { limit: 5, windowMs: 15 * 60_000 },
} as const;
