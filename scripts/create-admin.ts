/**
 * Creates an admin account (or resets its password).
 *
 *   npm run admin:create -- --email you@example.com --name "Rohit Pradhan" --password "a-long-password-123"
 *
 * or set ADMIN_EMAIL / ADMIN_NAME / ADMIN_PASSWORD in .env and run `npm run admin:create`.
 */
import { loadEnv } from "./env";
loadEnv();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email") || process.env.ADMIN_EMAIL;
  const name = arg("name") || process.env.ADMIN_NAME || "Admin";
  const password = arg("password") || process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("Usage: npm run admin:create -- --email you@example.com --name \"Your Name\" --password \"at least 12 characters\"");
    process.exit(1);
  }
  const { upsertAdminUser } = await import("../src/server/admin-users");
  const result = await upsertAdminUser({ email, name, password });
  if (!result.ok) {
    console.error(`✖ ${result.error}`);
    process.exit(1);
  }
  console.log(result.created ? `✔ Admin account created for ${email}` : `✔ Password updated for ${email}`);
  console.log("  Sign in at /admin/login");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
