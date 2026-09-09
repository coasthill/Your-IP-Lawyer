import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteConfig } from "@/config/site";
import { listTags } from "@/server/taxonomy";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { loadIndex, parsePage, type SearchParams } from "../../_lib/index-data";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: SearchParams };

async function findTag(slug: string) {
  const tags = await listTags();
  return tags.find((t) => t.slug === slug) ?? null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tag = await findTag(slug).catch(() => null);
  if (!tag) return { title: "Tag not found", robots: { index: false, follow: false } };
  const page = parsePage((await searchParams).page);
  const path = page > 1 ? `/blog/tag/${tag.slug}?page=${page}` : `/blog/tag/${tag.slug}`;
  const title = page > 1 ? `Tagged ${tag.name} · Page ${page}` : `Tagged ${tag.name} · Blog`;
  const description = `Articles tagged “${tag.name}” from ${siteConfig.name}.`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", url: path, title: `${title} — ${siteConfig.name}`, description, siteName: siteConfig.name, locale: siteConfig.locale },
    twitter: { card: "summary", title: `${title} — ${siteConfig.name}`, description },
  };
}

export default async function TagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const tag = await findTag(slug);
  if (!tag) notFound();
  const page = parsePage((await searchParams).page);
  const data = await loadIndex({ page, tagSlug: tag.slug });
  if (page > 1 && data.status === "ok" && !data.lead && !data.posts.length) notFound();

  return (
    <BlogIndex
      eyebrow="Tag"
      title={tag.name}
      titleSize="lg"
      lede={`Everything filed under “${tag.name}”.`}
      recordLabel={`Tagged ${tag.name}`}
      categories={data.categories}
      lead={data.lead}
      posts={data.posts}
      page={page}
      hasNext={data.hasNext}
      basePath={`/blog/tag/${tag.slug}`}
      status={data.status}
      emptyTitle="The next case note is probably being written."
      emptyBody={`Nothing has been tagged “${tag.name}” yet.`}
    />
  );
}
