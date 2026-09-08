import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteConfig } from "@/config/site";
import { getCategoryBySlug } from "@/server/taxonomy";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { loadIndex, parsePage, type SearchParams } from "../../_lib/index-data";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: SearchParams };

async function findCategory(slug: string) {
  const category = await getCategoryBySlug(slug);
  // Forum-only categories have no place in the publication.
  if (!category || category.scope === "forum") return null;
  return category;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await findCategory(slug).catch(() => null);
  if (!category) return { title: "Category not found", robots: { index: false, follow: false } };
  const page = parsePage((await searchParams).page);
  const path = page > 1 ? `/blog/category/${category.slug}?page=${page}` : `/blog/category/${category.slug}`;
  const title = page > 1 ? `${category.name} · Page ${page}` : `${category.name} · Blog`;
  const description = category.description || `Articles on ${category.name.toLowerCase()} from ${siteConfig.name}.`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", url: path, title: `${title} — ${siteConfig.name}`, description, siteName: siteConfig.name, locale: siteConfig.locale },
    twitter: { card: "summary", title: `${title} — ${siteConfig.name}`, description },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) notFound();
  const page = parsePage((await searchParams).page);
  const data = await loadIndex({ page, categorySlug: category.slug });
  if (page > 1 && data.status === "ok" && !data.lead && !data.posts.length) notFound();

  return (
    <BlogIndex
      eyebrow="Category"
      title={category.name}
      titleSize="lg"
      lede={category.description || "Filed under: things worth reading."}
      recordLabel={`Filed under ${category.name}`}
      categories={data.categories}
      currentCategory={category.slug}
      lead={data.lead}
      posts={data.posts}
      page={page}
      hasNext={data.hasNext}
      basePath={`/blog/category/${category.slug}`}
      status={data.status}
      emptyTitle="The next case note is probably being written."
      emptyBody={`Nothing has been filed under ${category.name} yet.`}
    />
  );
}
