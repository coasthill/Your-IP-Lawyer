/**
 * Lightweight, dependency-free spam heuristics for guest content.
 * Nothing here is a silver bullet — combine with rate limiting, Turnstile and the moderation queue.
 */
import { createHash } from "node:crypto";

const BLOCKED_WORDS = [
  "viagra",
  "casino",
  "porn",
  "xxx",
  "crypto giveaway",
  "free money",
  "work from home",
  "escort",
  "loan approval",
];

const PROFANITY = ["fuck", "shit", "bitch", "asshole", "bastard", "cunt", "motherfucker"];

export type SpamVerdict = {
  /** 0 = clean, >= 1 = hold for moderation, >= 3 = reject as spam */
  score: number;
  reasons: string[];
};

export function urlCount(text: string): number {
  return (text.match(/https?:\/\/|www\./gi) || []).length;
}

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return PROFANITY.some((w) => new RegExp(`\\b${w}\\b`, "i").test(lower));
}

export function spamScore(text: string, opts: { name?: string; email?: string | null } = {}): SpamVerdict {
  const reasons: string[] = [];
  let score = 0;
  const lower = text.toLowerCase();

  const links = urlCount(text);
  if (links >= 1) {
    score += 1;
    reasons.push("contains links");
  }
  if (links >= 3) {
    score += 2;
    reasons.push("many links");
  }
  for (const w of BLOCKED_WORDS) {
    if (lower.includes(w)) {
      score += 2;
      reasons.push(`blocked phrase: ${w}`);
      break;
    }
  }
  if (containsProfanity(text)) {
    score += 1;
    reasons.push("profanity");
  }
  const letters = text.replace(/[^a-zA-Z]/g, "");
  const upper = letters.replace(/[^A-Z]/g, "");
  if (letters.length > 30 && upper.length / letters.length > 0.7) {
    score += 1;
    reasons.push("mostly capital letters");
  }
  if (/(.)\1{9,}/.test(text)) {
    score += 1;
    reasons.push("repeated characters");
  }
  if (text.trim().length < 3) {
    score += 3;
    reasons.push("empty");
  }
  if (opts.name && urlCount(opts.name) > 0) {
    score += 2;
    reasons.push("link in name");
  }
  if (opts.email && /\.(ru|top|xyz|click)$/i.test(opts.email)) {
    score += 1;
    reasons.push("suspicious email domain");
  }
  return { score, reasons };
}

/** Stable fingerprint used to reject duplicate submissions from the same visitor. */
export function contentFingerprint(text: string, ipHash: string): string {
  const normalised = text.toLowerCase().replace(/\s+/g, " ").trim();
  return createHash("sha256").update(`${ipHash}:${normalised}`).digest("hex").slice(0, 32);
}

/**
 * Moderation policy.
 *   MODERATION_MODE=auto   → clean content is published immediately; anything suspicious is held (default)
 *   MODERATION_MODE=manual → everything is held for approval
 */
export function decideStatus(verdict: SpamVerdict): "approved" | "pending" | "spam" {
  if (verdict.score >= 3) return "spam";
  const mode = (process.env.MODERATION_MODE || "auto").toLowerCase();
  if (mode === "manual") return "pending";
  return verdict.score >= 1 ? "pending" : "approved";
}
