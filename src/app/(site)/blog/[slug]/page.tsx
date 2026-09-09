import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { absoluteUrl, siteConfig } from "@/config/site";
import { formatDate, pluralise } from "@/lib/utils";
import { listApprovedComments } from "@/server/comments";
import { getPostBySlug, getRelatedPosts } from "@/server/posts";
import { ArticleJsonLd } from "@/components/blog/ArticleJsonLd";
import { Attachments } from "@/components/blog/Attachments";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import { ShareBar } from "@/components/blog/ShareBar";
import { absoluteImageUrl, articlePath, readingLabel, resolveHeroImage } from "@/components/blog/format";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { countComments } from "@/components/comments/CommentList";
import { Chip, DemoBadge, Notice } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug).catch(() => null);
  if (!post) return { title: "Article not found", robots: { index: false, follow: false } };

  const path = articlePath(post.slug);
  const description = post.excerpt || post.deck || siteConfig.description;
  const hero = resolveHeroImage(post);
  const image = hero
    ? [{ url: absoluteImageUrl(hero.src), alt: hero.alt || post.title, ...(hero.width && hero.height ? { width: hero.width, height: hero.height } : {}) }]
    : undefined;

  return {
    title: post.title,
    description,
    authors: [{ name: post.authorName, url: absoluteUrl("/about") }],
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title: post.title,
      description,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [absoluteUrl("/about")],
      section: post.category?.name,
      tags: post.tags.map((t) => t.name),
      images: image,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: post.title, description, images: image?.map((i) => i.url) },
  };
}

const DAY = 86_400_000;

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const [related, comments] = await Promise.all([getRelatedPosts(post, 3).catch(() => []), listApprovedComments(post.id).catch(() => [])]);
  const hero = resolveHeroImage(post);
  const url = absoluteUrl(articlePath(post.slug));
  const commentCount = countComments(comments);
  const revised = post.publishedAt && post.updatedAt.getTime() - post.publishedAt.getTime() > DAY ? post.updatedAt : null;

  return (
    <>
      <ArticleJsonLd post={post} />
      <article aria-labelledby="article-title">
        {/* Masthead */}
        <header className="frame-lines relative">
          <div className="container-editorial pt-10 pb-14 md:pt-16 md:pb-20">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Link href="/blog" className="link-underline eyebrow-muted transition-colors hover:text-ink">
                The publication
              </Link>
              {post.category ? (
                <>
                  <span aria-hidden="true" className="text-ash">
                    /
                  </span>
                  <Link href={`/blog/category/${post.category.slug}`} className="link-underline eyebrow transition-colors hover:text-ink">
                    {post.category.name}
                  </Link>
                </>
              ) : null}
              {post.isDemo ? <DemoBadge className="ml-1" /> : null}
            </nav>

            <h1 id="article-title" className="display-lg mt-8 max-w-5xl">
              {post.title}
            </h1>
            {post.deck ? <p className="lede mt-8 max-w-3xl text-graphite">{post.deck}</p> : null}

            <div className="rule mt-12" role="presentation" />

            <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-3">
              <div>
                <dt className="eyebrow-muted">Written by</dt>
                <dd className="mt-2 font-display text-xl text-ink">{post.authorName}</dd>
                {post.authorRole ? <dd className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ash">{post.authorRole}</dd> : null}
              </div>
              <div>
                <dt className="eyebrow-muted">Filed</dt>
                <dd className="mt-2 font-display text-xl text-ink">
                  {post.publishedAt ? <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time> : "Undated"}
                </dd>
                {revised ? (
                  <dd className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ash">
                    Revised <time dateTime={revised.toISOString()}>{formatDate(revised)}</time>
                  </dd>
                ) : null}
              </div>
              <div>
                <dt className="eyebrow-muted">Reading time</dt>
                <dd className="mt-2 font-display text-xl text-ink">{readingLabel(post.readingMinutes)}</dd>
                <dd className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ash">
                  <a href="#comments" className="link-underline transition-colors hover:text-lapis">
                    {commentCount ? pluralise(commentCount, "comment") : "No comments yet"}
                  </a>
                </dd>
              </div>
            </dl>

            {post.isDemo ? (
              <Notice className="mt-10 max-w-3xl">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-seal">Demo content · </span>
                {siteConfig.disclaimer.demoContent}
              </Notice>
            ) : null}
          </div>
        </header>

        {/* Hero image, full bleed */}
        {hero ? (
          <figure className="relative">
            <div className="relative aspect-[16/9] max-h-[78vh] w-full overflow-hidden bg-vellum md:aspect-[21/9]">
              <Image src={hero.src} alt={hero.alt} fill priority unoptimized={hero.unoptimized} sizes="100vw" className="object-cover" />
            </div>
            {hero.caption || hero.alt ? (
              <figcaption className="container-editorial py-4 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ash">{hero.caption ?? hero.alt}</figcaption>
            ) : null}
          </figure>
        ) : null}

        {/* The body, on paper */}
        <section className="relative">
          <div className="container-prose relative py-16 md:py-24">
            <div className="prose-editorial" dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />

            <footer className="mt-20">
              {post.tags.length ? (
                <div className="border-t pt-8">
                  <p className="eyebrow eyebrow-mark">Tags</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {post.tags.map((t) => (
                      <li key={t.id}>
                        <Chip href={`/blog/tag/${t.slug}`}>{t.name}</Chip>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <Attachments documents={post.documents} />

              <div className="mt-16 border-t pt-8">
                <ShareBar url={url} title={post.title} />
              </div>

              <div className="mt-14 space-y-3 border-t pt-8 text-xs leading-relaxed text-ash">
                {post.isDemo ? <p>{siteConfig.disclaimer.demoContent}</p> : null}
                <p>{siteConfig.disclaimer.general}</p>
              </div>
            </footer>
          </div>
        </section>
      </article>

      <RelatedPosts posts={related} />
      <CommentsSection comments={comments} postId={post.id} postSlug={post.slug} />
    </>
  );
}
