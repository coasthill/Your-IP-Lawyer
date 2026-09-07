import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";
import { listPublishedPosts } from "@/server/posts";
import { listThreads } from "@/server/forum";
import { listCategories } from "@/server/taxonomy";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const statics: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/forum"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/submission-guidelines"), lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: absoluteUrl("/disclaimer"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
  try {
    const [posts, threads, categories] = await Promise.all([listPublishedPosts({ limit: 5000 }), listThreads({ limit: 5000 }), listCategories("blog")]);
    return [
      ...statics,
      ...categories.map((c) => ({ url: absoluteUrl(`/blog/category/${c.slug}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
      ...posts.map((p) => ({ url: absoluteUrl(`/blog/${p.slug}`), lastModified: p.updatedAt ?? p.publishedAt ?? now, changeFrequency: "monthly" as const, priority: 0.7 })),
      ...threads.map((t) => ({ url: absoluteUrl(`/forum/${t.slug}`), lastModified: t.lastActivityAt, changeFrequency: "weekly" as const, priority: 0.5 })),
    ];
  } catch {
    return statics;
  }
}
