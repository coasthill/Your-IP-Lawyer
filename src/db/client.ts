/**
 * Database client.
 *
 *  - DATABASE_URL set  → PostgreSQL via node-postgres (production: Neon, Supabase, Railway, any Postgres)
 *  - DATABASE_URL unset → PGlite, an embedded Postgres stored in ./.data/pglite (zero-setup local dev)
 *
 * Both share the same schema and the same SQL migrations in ./drizzle.
 * The client is cached on globalThis so Next.js hot reloads do not open new connections.
 */
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

type Holder = {
  db?: Database;
  ready?: Promise<Database>;
  driver?: "pg" | "pglite";
};

const holder: Holder = ((globalThis as unknown as { __yil_db?: Holder }).__yil_db ??= {});

export const migrationsFolder = path.join(process.cwd(), "drizzle");

export function databaseDriver(): "pg" | "pglite" {
  return process.env.DATABASE_URL && process.env.DATABASE_URL.trim() ? "pg" : "pglite";
}

async function createDatabase(): Promise<Database> {
  const driver = databaseDriver();
  const autoMigrate = process.env.DB_AUTO_MIGRATE !== "false";

  if (driver === "pg") {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { Pool } = await import("pg");
    const ssl =
      process.env.DATABASE_SSL === "false"
        ? undefined
        : /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? "")
          ? undefined
          : { rejectUnauthorized: false };
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, ssl });
    const db = drizzle({ client: pool, schema });
    if (autoMigrate && process.env.DB_AUTO_MIGRATE === "true") {
      // Explicit opt-in only: in production run `npm run db:migrate` (the build script does this).
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      await migrate(db, { migrationsFolder });
    }
    holder.driver = "pg";
    return db as unknown as Database;
  }

  const { drizzle } = await import("drizzle-orm/pglite");
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = process.env.PGLITE_DATA_DIR?.trim() || path.join(process.cwd(), ".data", "pglite");
  const fs = await import("node:fs/promises");
  await fs.mkdir(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle({ client, schema });
  if (autoMigrate) {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db, { migrationsFolder });
  }
  holder.driver = "pglite";
  return db as unknown as Database;
}

/** Returns the (lazily created, migrated) database. */
export function getDb(): Promise<Database> {
  if (holder.db) return Promise.resolve(holder.db);
  if (!holder.ready) {
    holder.ready = createDatabase().then((db) => {
      holder.db = db;
      return db;
    });
    holder.ready.catch(() => {
      holder.ready = undefined;
    });
  }
  return holder.ready;
}

export { schema };
