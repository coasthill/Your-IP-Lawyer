import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteConfig } from "@/config/site";
import { pluralise } from "@/lib/utils";
import { countPublishedPosts } from "@/server/posts";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { loadIndex, parsePage, type SearchParams } from "./_lib/index-data";

export const dynamic = "force-dynamic";

const DESCRIPTION = `Commentary, case analysis and practical insight on intellectual property law in India, written by ${siteConfig.author.name}, ${siteConfig.author.title}, ${siteConfig.author.location}.`;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const page = parsePage((await searchParams).page);
  const path = page > 1 ? `/blog?page=${page}` : "/blog";
  const title = page > 1 ? `Blog · Page ${page}` : "Blog";
  return {
    title,
    description: DESCRIPTION,
    alternates: { canonical: path },
    openGraph: { type: "website", url: path, title: `${title} — ${siteConfig.name}`, description: DESCRIPTION, siteName: siteConfig.name, locale: siteConfig.locale },
    twitter: { card: "summary", title: `${title} — ${siteConfig.name}`, description: DESCRIPTION },
  };
}

export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const page = parsePage((await searchParams).page);
  const [data, total] = await Promise.all([loadIndex({ page, useFeatured: true }), countPublishedPosts().catch(() => null)]);
  if (page > 1 && data.status === "ok" && !data.lead && !data.posts.length) notFound();

  return (
    <BlogIndex
      eyebrow="The Publication"
      title="Blog"
      lede="Filed under: things worth reading."
      recordLabel={total === null ? siteConfig.name : `${pluralise(total, "article")} on record`}
      categories={data.categories}
      currentCategory={null}
      lead={data.lead}
      posts={data.posts}
      page={page}
      hasNext={data.hasNext}
      basePath="/blog"
      status={data.status}
    />
  );
}
