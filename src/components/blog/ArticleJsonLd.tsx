import { absoluteUrl, siteConfig } from "@/config/site";
import type { PostWithMeta } from "@/server/posts";
import { absoluteImageUrl, articlePath, resolveHeroImage } from "./format";

/** schema.org Article structured data for an article page. */
export function ArticleJsonLd({ post }: { post: PostWithMeta }) {
  const url = absoluteUrl(articlePath(post.slug));
  const hero = resolveHeroImage(post);
  const isSiteAuthor = post.authorName.trim() === siteConfig.author.name;
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: post.title,
    description: post.excerpt || post.deck || undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: (post.updatedAt ?? post.publishedAt)?.toISOString(),
    author: {
      "@type": "Person",
      ...(isSiteAuthor ? { "@id": absoluteUrl("/#person"), url: absoluteUrl("/about") } : {}),
      name: post.authorName,
      jobTitle: post.authorRole ?? undefined,
    },
    publisher: { "@type": "Person", "@id": absoluteUrl("/#person"), name: siteConfig.author.name, url: siteConfig.url },
    image: hero ? [absoluteImageUrl(hero.src)] : undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    articleSection: post.category?.name ?? undefined,
    keywords: post.tags.length ? post.tags.map((t) => t.name).join(", ") : undefined,
    timeRequired: `PT${Math.max(1, post.readingMinutes)}M`,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
