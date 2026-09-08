import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { absoluteUrl, siteConfig } from "@/config/site";
import { renderPlainText } from "@/lib/security/sanitize";
import { displayName, formatDate, pluralise } from "@/lib/utils";
import { getThreadBySlug, incrementThreadViews, listApprovedReplies } from "@/server/forum";
import { ReplyForm } from "@/components/forum/ReplyForm";
import { ReplyList, countReplies } from "@/components/forum/ReplyList";
import { ReportButton } from "@/components/forum/ReportButton";
import { excerpt, forumHref, threadPath } from "@/components/forum/format";
import { Chip, Notice } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const thread = await getThreadBySlug(slug).catch(() => null);
  if (!thread) return { title: "Discussion not found", robots: { index: false, follow: false } };

  const path = threadPath(thread.slug);
  const description = excerpt(thread.body) || siteConfig.description;
  const title = `${thread.title} · The IP Forum`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title,
      description,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      publishedTime: thread.createdAt.toISOString(),
      modifiedTime: thread.lastActivityAt.toISOString(),
      section: thread.category?.name,
      tags: thread.tags.map((t) => t.name),
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function ThreadPage({ params }: Props) {
  const { slug } = await params;
  const thread = await getThreadBySlug(slug);
  if (!thread) notFound();

  /* Count the view once the page has been sent; a failure here must never cost a render. */
  after(async () => {
    try {
      await incrementThreadViews(thread.id);
    } catch {
      /* ignore */
    }
  });

  const replies = await listApprovedReplies(thread.id).catch(() => []);
  const replyCount = countReplies(replies);
  const author = displayName(thread.authorName);
  const bodyHtml = renderPlainText(thread.body);
  const path = threadPath(thread.slug);
  const views = thread.viewCount + 1;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": absoluteUrl(path),
    url: absoluteUrl(path),
    headline: thread.title,
    text: excerpt(thread.body, 500),
    datePublished: thread.createdAt.toISOString(),
    author: { "@type": "Person", name: author },
    articleSection: thread.category?.name,
    keywords: thread.tags.map((t) => t.name),
    interactionStatistic: [{ "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: replyCount }],
    isPartOf: { "@type": "WebPage", "@id": absoluteUrl("/forum"), name: "The IP Forum" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <article aria-labelledby="thread-title">
        {/* Masthead */}
        <header className="relative bg-ink">
          <div className="container-editorial pt-10 pb-14 md:pt-16 md:pb-20">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Link href="/forum" className="link-underline eyebrow-muted transition-colors hover:text-bone">
                The IP Forum
              </Link>
              {thread.category ? (
                <>
                  <span aria-hidden="true" className="text-ash">
                    /
                  </span>
                  <Link href={forumHref({ category: thread.category.slug })} className="link-underline eyebrow transition-colors hover:text-ivory">
                    {thread.category.name}
                  </Link>
                </>
              ) : null}
              {thread.pinned ? <span className="chip border-bronze-2/60 text-bronze-2">Pinned</span> : null}
              {thread.locked ? <span className="chip text-ash">Closed</span> : null}
            </nav>

            <h1 id="thread-title" className="display-md mt-8 max-w-4xl">
              {thread.title}
            </h1>

            <div className="rule mt-12" role="presentation" />

            <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="eyebrow-muted">Opened by</dt>
                <dd className="mt-2 font-display text-xl text-ivory">{author}</dd>
              </div>
              <div>
                <dt className="eyebrow-muted">Filed</dt>
                <dd className="mt-2 font-display text-xl text-ivory">
                  <time dateTime={thread.createdAt.toISOString()}>{formatDate(thread.createdAt)}</time>
                </dd>
              </div>
              <div>
                <dt className="eyebrow-muted">Views</dt>
                <dd className="mt-2 font-display text-xl text-ivory tabular-nums">{views.toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt className="eyebrow-muted">Replies</dt>
                <dd className="mt-2 font-display text-xl text-ivory">
                  <a href="#replies" className="link-underline">
                    {replyCount ? pluralise(replyCount, "reply", "replies") : "None yet"}
                  </a>
                </dd>
              </div>
            </dl>

            {thread.tags.length ? (
              <ul className="mt-10 flex flex-wrap gap-2" aria-label="Tags">
                {thread.tags.map((t) => (
                  <li key={t.id}>
                    <Chip>{t.name}</Chip>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </header>

        {/* The opening statement, on paper */}
        <section className="paper relative grain" aria-labelledby="opening-heading">
          <div className="container-prose relative z-[2] py-16 md:py-24">
            <div className="flex items-baseline justify-between gap-4 border-b border-current/20 pb-4">
              <p id="opening-heading" className="eyebrow">
                Opening statement
              </p>
              <p className="font-mono text-[0.62rem] tracking-[0.22em] text-current/60">01</p>
            </div>
            <div className="prose-ugc mt-8 text-[1.05rem] leading-[1.7] break-words" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            <footer className="mt-12 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-current/20 pt-6">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-current/60">
                {author}
                <span aria-hidden="true"> · </span>
                <time dateTime={thread.createdAt.toISOString()}>{formatDate(thread.createdAt)}</time>
              </p>
              <ReportButton targetType="thread" targetId={thread.id} threadSlug={thread.slug} />
            </footer>
          </div>
        </section>
      </article>

      {/* The argument */}
      <section id="replies" className="relative scroll-mt-24 border-t border-bronze/15 bg-ink-2" aria-labelledby="replies-heading">
        <div className="container-prose py-20 md:py-28">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div>
              <p className="eyebrow">The argument</p>
              <h2 id="replies-heading" className="display-md mt-3">
                Replies
              </h2>
            </div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-ash">{replyCount ? pluralise(replyCount, "reply", "replies") : "Nothing on record"}</p>
          </div>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-bone/80">{siteConfig.disclaimer.forum}</p>

          {thread.locked ? (
            <Notice className="mt-8">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-bronze-2">Closed · </span>
              This discussion has been closed. It stays on the record, but no further replies are accepted.
            </Notice>
          ) : null}

          <div className="mt-10">
            <ReplyList replies={replies} threadId={thread.id} threadSlug={thread.slug} locked={thread.locked} />
          </div>

          {thread.locked ? null : (
            <div className="mt-16 border-t border-bronze/15 pt-10">
              <p className="eyebrow-muted">Add a reply</p>
              <h3 className="display-sm mt-3">Counsel may proceed.</h3>
              <div className="mt-8">
                <ReplyForm threadId={thread.id} threadSlug={thread.slug} />
              </div>
            </div>
          )}

          <div className="mt-16 flex flex-wrap items-center justify-between gap-6 border-t border-bronze/15 pt-8">
            <Link href="/forum" className="btn btn-sm">
              Back to the record
            </Link>
            <p className="max-w-md text-xs leading-relaxed text-bone/60">{siteConfig.disclaimer.general}</p>
          </div>
        </div>
      </section>
    </>
  );
}
