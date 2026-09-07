/**
 * Database schema (Drizzle ORM, PostgreSQL dialect).
 *
 * The same schema runs on:
 *   - a real PostgreSQL database (DATABASE_URL set) — production
 *   - PGlite, an embedded Postgres stored in ./.data/pglite — local development with zero setup
 */
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/* Admin users & sessions                                              */
/* ------------------------------------------------------------------ */

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const adminSessions = pgTable(
  "admin_sessions",
  {
    /** sha256 of the random session token (the raw token only lives in the cookie). */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("admin_sessions_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------------ */
/* Taxonomy                                                            */
/* ------------------------------------------------------------------ */

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  /** "blog" | "forum" | "both" */
  scope: text("scope").notNull().default("both"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

/* ------------------------------------------------------------------ */
/* Uploaded documents (images, PDFs)                                   */
/* ------------------------------------------------------------------ */

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** "image" | "pdf" | "file" */
  kind: text("kind").notNull(),
  /** Storage driver that holds the file: "local" | "vercel-blob" | "s3" */
  storageDriver: text("storage_driver").notNull(),
  /** Driver-specific key (path within the bucket / uploads directory). */
  storageKey: text("storage_key").notNull(),
  /** Public URL used to display or download the file. */
  url: text("url").notNull(),
  /** Sanitised original filename shown to users. */
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  title: text("title"),
  description: text("description"),
  altText: text("alt_text"),
  uploadedBy: uuid("uploaded_by").references(() => adminUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Blog                                                                */
/* ------------------------------------------------------------------ */

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    /** Subtitle / deck shown under the title. */
    deck: text("deck"),
    excerpt: text("excerpt").notNull().default(""),
    /** Markdown source — the editable content. */
    bodyMd: text("body_md").notNull().default(""),
    /** Sanitised HTML rendered from bodyMd at save time. */
    bodyHtml: text("body_html").notNull().default(""),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull(),
    authorRole: text("author_role"),
    /** "draft" | "published" */
    status: text("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    featured: boolean("featured").notNull().default(false),
    /** Demo content is labelled as such in the UI. */
    isDemo: boolean("is_demo").notNull().default(false),
    heroImageId: uuid("hero_image_id").references(() => documents.id, { onDelete: "set null" }),
    /** Optional external/static hero image (used when no uploaded document). */
    heroImageUrl: text("hero_image_url"),
    heroImageAlt: text("hero_image_alt"),
    readingMinutes: integer("reading_minutes").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("posts_status_published_idx").on(t.status, t.publishedAt),
    index("posts_category_idx").on(t.categoryId),
  ],
);

export const postTags = pgTable(
  "post_tags",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })],
);

/** PDFs / documents attached to a post. */
export const postDocuments = pgTable(
  "post_documents",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    label: text("label"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.postId, t.documentId] })],
);

/* ------------------------------------------------------------------ */
/* Comments (guest, moderated)                                         */
/* ------------------------------------------------------------------ */

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    authorName: text("author_name").notNull(),
    /** Never rendered publicly. */
    authorEmail: text("author_email"),
    body: text("body").notNull(),
    /** "pending" | "approved" | "hidden" | "spam" */
    status: text("status").notNull().default("pending"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    reportCount: integer("report_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("comments_post_status_idx").on(t.postId, t.status), index("comments_parent_idx").on(t.parentId)],
);

/* ------------------------------------------------------------------ */
/* Forum                                                               */
/* ------------------------------------------------------------------ */

export const forumThreads = pgTable(
  "forum_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email"),
    /** "pending" | "approved" | "hidden" | "spam" */
    status: text("status").notNull().default("pending"),
    pinned: boolean("pinned").notNull().default(false),
    locked: boolean("locked").notNull().default(false),
    ipHash: text("ip_hash"),
    replyCount: integer("reply_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    reportCount: integer("report_count").notNull().default(0),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("forum_threads_status_activity_idx").on(t.status, t.lastActivityAt),
    index("forum_threads_category_idx").on(t.categoryId),
  ],
);

export const forumThreadTags = pgTable(
  "forum_thread_tags",
  {
    threadId: uuid("thread_id")
      .notNull()
      .references(() => forumThreads.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.threadId, t.tagId] })],
);

export const forumReplies = pgTable(
  "forum_replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => forumThreads.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email"),
    body: text("body").notNull(),
    status: text("status").notNull().default("pending"),
    ipHash: text("ip_hash"),
    reportCount: integer("report_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("forum_replies_thread_status_idx").on(t.threadId, t.status)],
);

/* ------------------------------------------------------------------ */
/* Reports (community flagging)                                        */
/* ------------------------------------------------------------------ */

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** "comment" | "thread" | "reply" */
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason"),
    ipHash: text("ip_hash"),
    resolved: boolean("resolved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reports_target_idx").on(t.targetType, t.targetId)],
);

/* ------------------------------------------------------------------ */
/* Article submissions                                                 */
/* ------------------------------------------------------------------ */

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  affiliation: text("affiliation"),
  title: text("title").notNull(),
  /** "article" | "case-note" | "commentary" | "other" */
  kind: text("kind").notNull().default("article"),
  abstract: text("abstract").notNull(),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
  /** "new" | "reviewing" | "accepted" | "declined" */
  status: text("status").notNull().default("new"),
  adminNotes: text("admin_notes"),
  ipHash: text("ip_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Rate limiting (works on serverless where memory is not shared)       */
/* ------------------------------------------------------------------ */

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Relations (for db.query.* helpers)                                  */
/* ------------------------------------------------------------------ */

export const postsRelations = relations(posts, ({ one, many }) => ({
  category: one(categories, { fields: [posts.categoryId], references: [categories.id] }),
  heroImage: one(documents, { fields: [posts.heroImageId], references: [documents.id] }),
  postTags: many(postTags),
  postDocuments: many(postDocuments),
  comments: many(comments),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
  tag: one(tags, { fields: [postTags.tagId], references: [tags.id] }),
}));

export const postDocumentsRelations = relations(postDocuments, ({ one }) => ({
  post: one(posts, { fields: [postDocuments.postId], references: [posts.id] }),
  document: one(documents, { fields: [postDocuments.documentId], references: [documents.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
}));

export const forumThreadsRelations = relations(forumThreads, ({ one, many }) => ({
  category: one(categories, { fields: [forumThreads.categoryId], references: [categories.id] }),
  threadTags: many(forumThreadTags),
  replies: many(forumReplies),
}));

export const forumThreadTagsRelations = relations(forumThreadTags, ({ one }) => ({
  thread: one(forumThreads, { fields: [forumThreadTags.threadId], references: [forumThreads.id] }),
  tag: one(tags, { fields: [forumThreadTags.tagId], references: [tags.id] }),
}));

export const forumRepliesRelations = relations(forumReplies, ({ one }) => ({
  thread: one(forumThreads, { fields: [forumReplies.threadId], references: [forumThreads.id] }),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  document: one(documents, { fields: [submissions.documentId], references: [documents.id] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  posts: many(posts),
  threads: many(forumThreads),
}));

/* Handy row types */
export type AdminUser = typeof adminUsers.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type ForumThread = typeof forumThreads.$inferSelect;
export type ForumReply = typeof forumReplies.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Report = typeof reports.$inferSelect;

/** Fixed vocabularies used across the app. */
export const POST_STATUSES = ["draft", "published"] as const;
export const UGC_STATUSES = ["pending", "approved", "hidden", "spam"] as const;
export const SUBMISSION_STATUSES = ["new", "reviewing", "accepted", "declined"] as const;
export const SUBMISSION_KINDS = ["article", "case-note", "commentary", "other"] as const;

// Silence unused import warning in some editors (sql is handy for raw defaults).
void sql;
