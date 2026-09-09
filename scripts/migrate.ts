/**
 * Applies SQL migrations in ./drizzle to the configured database.
 * Usage: npm run db:migrate
 */
import { loadEnv } from "./env";
loadEnv();

async function main() {
  const { getDb, databaseDriver, migrationsFolder } = await import("../src/db/client");
  const driver = databaseDriver();
  const db = await getDb();
  if (driver === "pg") {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder });
  }
  // PGlite migrates automatically on connect.
  console.log(`✔ Database migrated (${driver === "pg" ? "PostgreSQL" : "PGlite local database"})`);
  process.exit(0);
}

main().catch((err) => {
  console.error("✖ Migration failed:", err);
  process.exit(1);
});
