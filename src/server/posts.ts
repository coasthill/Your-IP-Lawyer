import { and, desc, eq, inArray, ne, sql, lte } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import type { Category, Document, Post, Tag } from "@/db/schema";
import { markdownToPlain, readingTime, renderMarkdown } from "@/lib/markdown";
import { slugify } from "@/lib/utils";
import { ensureTags } from "./taxonomy";

export type PostWithMeta = Post & {
  category: Category | null;
  tags: Tag[];
  heroImage: Document | null;
  documents: Array<Document & { label: string | null }>;
};

export type PostCard = Pick<
  Post,
  "id" | "slug" | "title" | "deck" | "excerpt" | "authorName" | "publishedAt" | "readingMinutes" | "featured" | "isDemo" | "heroImageUrl" | "heroImageAlt"
> & { category: Category | null; heroImage: Document | null; tags: Tag[] };

async function hydrate(rows: Post[]): Promise<PostWithMeta[]> {
  if (!rows.length) return [];
  const db = await getDb();
  const ids = rows.map((r) => r.id);
  const catIds = Array.from(new Set(rows.map((r) => r.categoryId).filter((v): v is string => Boolean(v))));
  const heroIds = Array.from(new Set(rows.map((r) => r.heroImageId).filter((v): v is string => Boolean(v))));

  const [cats, heroes, tagRows, docRows] = await Promise.all([
    catIds.length ? db.select().from(schema.categories).where(inArray(schema.categories.id, catIds)) : Promise.resolve([]),
    heroIds.length ? db.select().from(schema.documents).where(inArray(schema.documents.id, heroIds)) : Promise.resolve([]),
    db
      .select({ postId: schema.postTags.postId, tag: schema.tags })
      .from(schema.postTags)
      .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
      .where(inArray(schema.postTags.postId, ids)),
    db
      .select({ postId: schema.postDocuments.postId, label: schema.postDocuments.label, sortOrder: schema.postDocuments.sortOrder, document: schema.documents })
      .from(schema.postDocuments)
      .innerJoin(schema.documents, eq(schema.postDocuments.documentId, schema.documents.id))
      .where(inArray(schema.postDocuments.postId, ids)),
  ]);

  const catMap = new Map(cats.map((c) => [c.id, c]));
  const heroMap = new Map(heroes.map((h) => [h.id, h]));
  const tagMap = new Map<string, Tag[]>();
  for (const r of tagRows) tagMap.set(r.postId, [...(tagMap.get(r.postId) ?? []), r.tag]);
  const docMap = new Map<string, Array<Document & { label: string | null }>>();
  for (const r of docRows.sort((a, b) => a.sortOrder - b.sortOrder)) {
    docMap.set(r.postId, [...(docMap.get(r.postId) ?? []), { ...r.document, label: r.label }]);
  }

  return rows.map((p) => ({
    ...p,
    category: p.categoryId ? (catMap.get(p.categoryId) ?? null) : null,
    heroImage: p.heroImageId ? (heroMap.get(p.heroImageId) ?? null) : null,
    tags: tagMap.get(p.id) ?? [],
    documents: docMap.get(p.id) ?? [],
  }));
}

const publishedWhere = () => and(eq(schema.posts.status, "published"), lte(schema.posts.publishedAt, new Date()));

export async function listPublishedPosts(opts: { categorySlug?: string; tagSlug?: string; limit?: number; offset?: number } = {}): Promise<PostWithMeta[]> {
  const db = await getDb();
  const conditions = [publishedWhere()];
  if (opts.categorySlug) {
    const cat = await db.select().from(schema.categories).where(eq(schema.categories.slug, opts.categorySlug)).limit(1);
    if (!cat[0]) return [];
    conditions.push(eq(schema.posts.categoryId, cat[0].id));
  }
  if (opts.tagSlug) {
    const tag = await db.select().from(schema.tags).where(eq(schema.tags.slug, opts.tagSlug)).limit(1);
    if (!tag[0]) return [];
    const ids = await db.select({ postId: schema.postTags.postId }).from(schema.postTags).where(eq(schema.postTags.tagId, tag[0].id));
    if (!ids.length) return [];
    conditions.push(inArray(schema.posts.id, ids.map((r) => r.postId)));
  }
  const rows = await db
    .select()
    .from(schema.posts)
    .where(and(...conditions))
    .orderBy(desc(schema.posts.featured), desc(schema.posts.publishedAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
  return hydrate(rows);
}

export async function countPublishedPosts(): Promise<number> {
  const db = await getDb();
  const rows = await db.select({ n: sql<number>`count(*)` }).from(schema.posts).where(publishedWhere());
  return Number(rows[0]?.n ?? 0);
}

export async function getFeaturedPost(): Promise<PostWithMeta | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.posts)
    .where(publishedWhere())
    .orderBy(desc(schema.posts.featured), desc(schema.posts.publishedAt))
    .limit(1);
  const [post] = await hydrate(rows);
  return post ?? null;
}

export async function getPostBySlug(slug: string, opts: { includeDrafts?: boolean } = {}): Promise<PostWithMeta | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.posts)
    .where(opts.includeDrafts ? eq(schema.posts.slug, slug) : and(eq(schema.posts.slug, slug), publishedWhere()))
    .limit(1);
  const [post] = await hydrate(rows);
  return post ?? null;
}

export async function getPostById(id: string): Promise<PostWithMeta | null> {
  const db = await getDb();
  const rows = await db.select().from(schema.posts).where(eq(schema.posts.id, id)).limit(1);
  const [post] = await hydrate(rows);
  return post ?? null;
}

export async function getRelatedPosts(post: Post, limit = 3): Promise<PostWithMeta[]> {
  const db = await getDb();
  const base = and(publishedWhere(), ne(schema.posts.id, post.id));
  let rows: Post[] = [];
  if (post.categoryId) {
    rows = await db
      .select()
      .from(schema.posts)
      .where(and(base, eq(schema.posts.categoryId, post.categoryId)))
      .orderBy(desc(schema.posts.publishedAt))
      .limit(limit);
  }
  if (rows.length < limit) {
    const more = await db
      .select()
      .from(schema.posts)
      .where(rows.length ? and(base, ne(schema.posts.categoryId, post.categoryId ?? "")) : base)
      .orderBy(desc(schema.posts.publishedAt))
      .limit(limit - rows.length);
    rows = [...rows, ...more.filter((m) => !rows.some((r) => r.id === m.id))];
  }
  return hydrate(rows);
}

/* ---------------------------- Admin ---------------------------- */

export async function listPostsForAdmin(): Promise<PostWithMeta[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.posts).orderBy(desc(schema.posts.updatedAt));
  return hydrate(rows);
}

export type PostInput = {
  id?: string;
  title: string;
  slug?: string;
  deck?: string | null;
  excerpt?: string;
  bodyMd: string;
  categoryId?: string | null;
  authorName: string;
  authorRole?: string | null;
  status: "draft" | "published";
  publishedAt?: Date | null;
  featured?: boolean;
  isDemo?: boolean;
  heroImageId?: string | null;
  heroImageUrl?: string | null;
  heroImageAlt?: string | null;
  tags?: string | string[];
  documentIds?: string[];
};

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const db = await getDb();
  let slug = slugify(base);
  let n = 2;
  for (;;) {
    const rows = await db.select({ id: schema.posts.id }).from(schema.posts).where(eq(schema.posts.slug, slug)).limit(1);
    if (!rows[0] || rows[0].id === excludeId) return slug;
    slug = `${slugify(base)}-${n++}`;
  }
}

export async function savePost(input: PostInput): Promise<Post> {
  const db = await getDb();
  const bodyHtml = await renderMarkdown(input.bodyMd);
  const excerpt = input.excerpt?.trim() || markdownToPlain(input.bodyMd, 240);
  const slug = await uniqueSlug(input.slug?.trim() || input.title, input.id);
  const values = {
    title: input.title.trim(),
    slug,
    deck: input.deck?.trim() || null,
    excerpt,
    bodyMd: input.bodyMd,
    bodyHtml,
    categoryId: input.categoryId || null,
    authorName: input.authorName.trim(),
    authorRole: input.authorRole?.trim() || null,
    status: input.status,
    publishedAt: input.status === "published" ? (input.publishedAt ?? new Date()) : (input.publishedAt ?? null),
    featured: Boolean(input.featured),
    isDemo: Boolean(input.isDemo),
    heroImageId: input.heroImageId || null,
    heroImageUrl: input.heroImageUrl?.trim() || null,
    heroImageAlt: input.heroImageAlt?.trim() || null,
    readingMinutes: readingTime(input.bodyMd),
    updatedAt: new Date(),
  };

  let post: Post;
  if (input.id) {
    const [row] = await db.update(schema.posts).set(values).where(eq(schema.posts.id, input.id)).returning();
    post = row;
  } else {
    const [row] = await db.insert(schema.posts).values(values).returning();
    post = row;
  }

  if (values.featured) {
    await db.update(schema.posts).set({ featured: false }).where(ne(schema.posts.id, post.id));
  }

  if (input.tags !== undefined) {
    const tagRows = await ensureTags(input.tags);
    await db.delete(schema.postTags).where(eq(schema.postTags.postId, post.id));
    if (tagRows.length) {
      await db.insert(schema.postTags).values(tagRows.map((t) => ({ postId: post.id, tagId: t.id }))).onConflictDoNothing();
    }
  }
  if (input.documentIds !== undefined) {
    await db.delete(schema.postDocuments).where(eq(schema.postDocuments.postId, post.id));
    const ids = input.documentIds.filter(Boolean);
    if (ids.length) {
      await db.insert(schema.postDocuments).values(ids.map((documentId, i) => ({ postId: post.id, documentId, sortOrder: i }))).onConflictDoNothing();
    }
  }
  return post;
}

export async function setPostStatus(id: string, status: "draft" | "published"): Promise<void> {
  const db = await getDb();
  const [current] = await db.select({ publishedAt: schema.posts.publishedAt }).from(schema.posts).where(eq(schema.posts.id, id)).limit(1);
  await db
    .update(schema.posts)
    .set({ status, publishedAt: status === "published" ? (current?.publishedAt ?? new Date()) : current?.publishedAt ?? null, updatedAt: new Date() })
    .where(eq(schema.posts.id, id));
}

export async function deletePost(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(schema.posts).where(eq(schema.posts.id, id));
}

export async function attachDocumentToPost(postId: string, documentId: string, label?: string | null): Promise<void> {
  const db = await getDb();
  await db.insert(schema.postDocuments).values({ postId, documentId, label: label ?? null }).onConflictDoNothing();
}

export async function detachDocumentFromPost(postId: string, documentId: string): Promise<void> {
  const db = await getDb();
  await db.delete(schema.postDocuments).where(and(eq(schema.postDocuments.postId, postId), eq(schema.postDocuments.documentId, documentId)));
}
