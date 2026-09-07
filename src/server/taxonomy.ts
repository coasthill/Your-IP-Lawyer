import { asc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import type { Category, Tag } from "@/db/schema";
import { slugify } from "@/lib/utils";

/** Default categories (seeded; admins can add more). */
export const DEFAULT_CATEGORIES: Array<{ name: string; slug: string; scope: "blog" | "forum" | "both"; description: string }> = [
  { name: "Trade Marks", slug: "trade-marks", scope: "both", description: "Registration, infringement, passing off, dilution and brand identity." },
  { name: "Patents", slug: "patents", scope: "both", description: "Inventions, claims, revocation, infringement and the limits of equivalence." },
  { name: "Copyright", slug: "copyright", scope: "both", description: "Original expression, authorship, the idea–expression divide and fair dealing." },
  { name: "Designs", slug: "designs", scope: "both", description: "Registered designs and the visual identity of products." },
  { name: "Geographical Indications", slug: "geographical-indications", scope: "both", description: "When place becomes part of identity." },
  { name: "IP Litigation", slug: "ip-litigation", scope: "both", description: "Interim relief, procedure, evidence and strategy before Indian courts." },
  { name: "Arbitration", slug: "arbitration", scope: "both", description: "Arbitrability of IP disputes and arbitration practice." },
  { name: "Dispute Resolution", slug: "dispute-resolution", scope: "both", description: "Mediation, settlement and everything between a demand letter and a decree." },
  { name: "Career", slug: "career", scope: "both", description: "Law school, internships, chambers, firms and the practice of becoming a lawyer." },
  { name: "Law School", slug: "law-school", scope: "forum", description: "Questions from students and recent graduates." },
  { name: "General", slug: "general", scope: "both", description: "Everything else worth arguing about." },
];

export async function listCategories(scope?: "blog" | "forum"): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.categories).orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name));
  return scope ? rows.filter((c) => c.scope === "both" || c.scope === scope) : rows;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const db = await getDb();
  const rows = await db.select().from(schema.categories).where(eq(schema.categories.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function ensureCategory(name: string, scope: "blog" | "forum" | "both" = "both"): Promise<Category> {
  const db = await getDb();
  const slug = slugify(name);
  const existing = await getCategoryBySlug(slug);
  if (existing) return existing;
  const [row] = await db.insert(schema.categories).values({ name: name.trim(), slug, scope, sortOrder: 100 }).returning();
  return row;
}

export async function ensureDefaultCategories(): Promise<void> {
  const db = await getDb();
  const existing = await db.select({ slug: schema.categories.slug }).from(schema.categories);
  const have = new Set(existing.map((c) => c.slug));
  const missing = DEFAULT_CATEGORIES.filter((c) => !have.has(c.slug));
  if (missing.length) {
    await db.insert(schema.categories).values(missing.map((c, i) => ({ ...c, sortOrder: DEFAULT_CATEGORIES.indexOf(c) + i * 0 })));
  }
}

export async function updateCategory(id: string, data: Partial<Pick<Category, "name" | "description" | "scope" | "sortOrder">>) {
  const db = await getDb();
  await db.update(schema.categories).set(data).where(eq(schema.categories.id, id));
}

export async function deleteCategory(id: string) {
  const db = await getDb();
  await db.delete(schema.categories).where(eq(schema.categories.id, id));
}

/** Parses "a, b, c" into tag rows, creating missing ones. */
export async function ensureTags(input: string | string[]): Promise<Tag[]> {
  const names = (Array.isArray(input) ? input : input.split(","))
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 40)
    .slice(0, 8);
  if (!names.length) return [];
  const db = await getDb();
  const slugs = names.map(slugify);
  const existing = await db.select().from(schema.tags).where(inArray(schema.tags.slug, slugs));
  const have = new Map(existing.map((t) => [t.slug, t]));
  const toCreate = names.filter((n) => !have.has(slugify(n))).map((n) => ({ name: n, slug: slugify(n) }));
  const unique = Array.from(new Map(toCreate.map((t) => [t.slug, t])).values());
  if (unique.length) {
    const created = await db.insert(schema.tags).values(unique).onConflictDoNothing().returning();
    for (const t of created) have.set(t.slug, t);
    // Tags that already existed but raced onConflictDoNothing
    const stillMissing = unique.filter((t) => !have.has(t.slug)).map((t) => t.slug);
    if (stillMissing.length) {
      const rows = await db.select().from(schema.tags).where(inArray(schema.tags.slug, stillMissing));
      for (const t of rows) have.set(t.slug, t);
    }
  }
  return slugs.map((s) => have.get(s)).filter((t): t is Tag => Boolean(t));
}

export async function listTags(): Promise<Tag[]> {
  const db = await getDb();
  return db.select().from(schema.tags).orderBy(asc(schema.tags.name));
}
