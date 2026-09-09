/**
 * Admin sessions: random token in an httpOnly cookie, sha256(token) stored in the database.
 */
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { eq, lt } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import type { AdminUser } from "@/db/schema";

export const SESSION_COOKIE = "yil_admin";
const SESSION_DAYS = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(schema.adminSessions).values({ id: hashToken(token), userId, expiresAt });
  // opportunistic cleanup of expired sessions
  await db.delete(schema.adminSessions).where(lt(schema.adminSessions.expiresAt, new Date()));
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.adminSessions).where(eq(schema.adminSessions.id, hashToken(token)));
  }
  store.delete(SESSION_COOKIE);
}

/** Returns the logged-in admin, or null. Safe to call from server components, actions and route handlers. */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const rows = await db
    .select({ user: schema.adminUsers, expiresAt: schema.adminSessions.expiresAt })
    .from(schema.adminSessions)
    .innerJoin(schema.adminUsers, eq(schema.adminSessions.userId, schema.adminUsers.id))
    .where(eq(schema.adminSessions.id, hashToken(token)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(schema.adminSessions).where(eq(schema.adminSessions.id, hashToken(token)));
    return null;
  }
  return row.user;
}
