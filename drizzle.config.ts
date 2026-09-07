import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit configuration.
 *  - `npm run db:generate` writes SQL migrations into ./drizzle from src/db/schema.ts
 *  - `npm run db:migrate`  applies them (see scripts/migrate.ts — works for Postgres and PGlite)
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  ...(process.env.DATABASE_URL
    ? { dbCredentials: { url: process.env.DATABASE_URL } }
    : { driver: "pglite", dbCredentials: { url: "./.data/pglite" } }),
});
