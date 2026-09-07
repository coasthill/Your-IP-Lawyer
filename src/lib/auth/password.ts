/**
 * Password hashing with Node's built-in scrypt (OWASP-recommended parameters).
 * Format: scrypt$N$r$p$<salt-hex>$<hash-hex>
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}
const N = 2 ** 15; // cost
const r = 8;
const p = 1;
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r, p, maxmem: 128 * N * r * 2 });
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [algo, nStr, rStr, pStr, saltHex, hashHex] = stored.split("$");
    if (algo !== "scrypt") return false;
    const n = Number(nStr);
    const rr = Number(rStr);
    const pp = Number(pStr);
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = await scrypt(password.normalize("NFKC"), salt, expected.length, {
      N: n,
      r: rr,
      p: pp,
      maxmem: 128 * n * rr * 2,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Minimum password policy for admin accounts. */
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 12) problems.push("at least 12 characters");
  if (!/[a-zA-Z]/.test(password)) problems.push("a letter");
  if (!/[0-9]/.test(password)) problems.push("a number");
  return problems;
}
