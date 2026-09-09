/** Loads .env / .env.local for standalone scripts (Next.js does this itself for the app). */
import fs from "node:fs";
import path from "node:path";

export function loadEnv() {
  for (const file of [".env", ".env.local"]) {
    const p = path.join(process.cwd(), file);
    if (fs.existsSync(p)) {
      try {
        process.loadEnvFile(p);
      } catch {
        /* ignore */
      }
    }
  }
}
