import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { hashPassword, passwordProblems } from "@/lib/auth/password";
import { isValidEmail } from "@/lib/security/sanitize";

/** Creates (or updates the password of) an admin account. Used by `npm run admin:create` and the dashboard. */
export async function upsertAdminUser(input: { email: string; name: string; password: string }): Promise<{ ok: true; created: boolean } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim() || "Admin";
  if (!isValidEmail(email)) return { ok: false, error: "Invalid email address." };
  const problems = passwordProblems(input.password);
  if (problems.length) return { ok: false, error: `Password needs ${problems.join(", ")}.` };
  const db = await getDb();
  const passwordHash = await hashPassword(input.password);
  const existing = await db.select({ id: schema.adminUsers.id }).from(schema.adminUsers).where(eq(schema.adminUsers.email, email)).limit(1);
  if (existing[0]) {
    await db.update(schema.adminUsers).set({ passwordHash, name }).where(eq(schema.adminUsers.id, existing[0].id));
    return { ok: true, created: false };
  }
  await db.insert(schema.adminUsers).values({ email, name, passwordHash });
  return { ok: true, created: true };
}

export async function countAdminUsers(): Promise<number> {
  const db = await getDb();
  const rows = await db.select({ n: sql<number>`count(*)` }).from(schema.adminUsers);
  return Number(rows[0]?.n ?? 0);
}

export async function listAdminUsers() {
  const db = await getDb();
  return db.select({ id: schema.adminUsers.id, email: schema.adminUsers.email, name: schema.adminUsers.name, createdAt: schema.adminUsers.createdAt, lastLoginAt: schema.adminUsers.lastLoginAt }).from(schema.adminUsers);
}

export async function deleteAdminUser(id: string) {
  const db = await getDb();
  await db.delete(schema.adminUsers).where(eq(schema.adminUsers.id, id));
}
