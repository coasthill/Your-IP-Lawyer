"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db/client";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { getRequestMeta } from "@/lib/security/request";
import { isValidEmail } from "@/lib/security/sanitize";
import type { FormState } from "@/components/admin/form-state";
import { field, safeAdminPath } from "../_lib/form";

/** A real scrypt hash of a random string: verifying against it keeps timing similar when the email is unknown. */
const DECOY_HASH =
  "scrypt$32768$8$1$3c1d0f7e9a2b4c6d8e0f1a2b3c4d5e6f$" +
  "b3f1b0f4a1e2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a";

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = field(formData, "email", 200).toLowerCase();
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";
  const next = safeAdminPath(field(formData, "next", 500));
  const values = { email, next };

  if (!isValidEmail(email) || !password) {
    return { status: "error", message: "Enter the email address and password of an admin account.", values };
  }

  const meta = await getRequestMeta();
  const limit = await rateLimit(`login:${meta.ipHash}`, RATE_LIMITS.login);
  if (!limit.ok) {
    return { status: "error", message: "Too many attempts from this connection. The bench will hear you again in fifteen minutes.", values };
  }

  const db = await getDb();
  const [user] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email)).limit(1);
  const ok = await verifyPassword(password, user?.passwordHash ?? DECOY_HASH);
  if (!user || !ok) {
    return { status: "error", message: "Objection. That email and password do not match any admin account.", values };
  }

  await createSession(user.id);
  await db.update(schema.adminUsers).set({ lastLoginAt: new Date() }).where(eq(schema.adminUsers.id, user.id));
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
