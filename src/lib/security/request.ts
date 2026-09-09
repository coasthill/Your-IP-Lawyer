/**
 * Request metadata helpers: client IP (hashed for privacy), user agent, origin check.
 */
import { createHash } from "node:crypto";
import { headers } from "next/headers";

function secretSalt() {
  return process.env.SESSION_SECRET || "youriplawyer-dev-salt";
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") || h.get("cf-connecting-ip") || "0.0.0.0";
}

/** One-way hash of the IP so we can rate-limit and de-duplicate without storing raw addresses. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${secretSalt()}:${ip}`).digest("hex").slice(0, 32);
}

export async function getRequestMeta() {
  const h = await headers();
  const ip = await getClientIp();
  return {
    ip,
    ipHash: hashIp(ip),
    userAgent: (h.get("user-agent") || "").slice(0, 255),
  };
}

/** Basic CSRF defence for route handlers: the Origin must match the Host (Server Actions do this automatically). */
export async function assertSameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
