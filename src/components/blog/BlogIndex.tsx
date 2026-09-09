import type { ReactNode } from "react";
import type { Category } from "@/db/schema";
import type { PostWithMeta } from "@/server/posts";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { ButtonLink, DemoBadge, EmptyState, Notice } from "@/components/ui/primitives";
import { CategoryNav } from "./CategoryNav";
import { Pagination } from "./Pagination";
import { PostCard } from "./PostCard";
import { editionLabel } from "./format";

export type BlogIndexProps = {
  eyebrow: ReactNode;
  title: ReactNode;
  titleSize?: "xl" | "lg";
  lede?: ReactNode;
  /** Right-hand "record" block in the masthead. */
  recordLabel?: ReactNode;
  categories: Category[];
  /** Slug of the highlighted category; `null` highlights "All"; omit to highlight nothing. */
  currentCategory?: string | null;
  lead: PostWithMeta | null;
  posts: PostWithMeta[];
  page: number;
  hasNext: boolean;
  basePath: string;
  status: "ok" | "error";
  emptyTitle?: ReactNode;
  emptyBody?: ReactNode;
};

/**
 * Shared layout for /blog, /blog/category/[slug] and /blog/tag/[slug]:
 * dark masthead + category chips → lead article on ink → the rest of the record on paper.
 * The turn from ink to paper is the editorial move: the cover, then the pages.
 */
export function BlogIndex({
  eyebrow,
  title,
  titleSize = "xl",
  lede,
  recordLabel,
  categories,
  currentCategory,
  lead,
  posts,
  page,
  hasNext,
  basePath,
  status,
  emptyTitle = "The next case note is probably being written.",
  emptyBody = "Nothing has been filed here yet.",
}: BlogIndexProps) {
  const hasDemo = Boolean(lead?.isDemo) || posts.some((p) => p.isDemo);
  const firstIndex = lead ? 2 : 1;
  const gridHeading = status === "error" ? "The record" : page > 1 ? "Older entries" : lead ? "More from the record" : "All articles";

  return (
    <>
      {/* Masthead */}
      <section className="relative bg-ink" aria-labelledby="blog-title">
        <div className="container-editorial pt-10 pb-10 md:pt-16 md:pb-12">
          <div className="grid gap-10 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <p className="eyebrow">{eyebrow}</p>
              <h1 id="blog-title" className={cn("mt-5", titleSize === "xl" ? "display-xl" : "display-lg")}>
                {title}
              </h1>
              {lede ? <p className="lede mt-6 max-w-2xl">{lede}</p> : null}
            </div>
            <div className="md:col-span-4 md:text-right">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-ash">Record</p>
              <p className="mt-2 font-display text-xl text-parchment">{recordLabel ?? siteConfig.name}</p>
              <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-ash">
                {siteConfig.author.location} · {editionLabel()}
              </p>
            </div>
          </div>
          <div className="rule-solid mt-12" role="presentation" />
          <CategoryNav categories={categories} current={currentCategory} className="mt-6" />
        </div>
      </section>

      {/* Lead article, still on ink */}
      {lead ? (
        <section className="relative bg-ink" aria-labelledby="lead-heading">
          <div className="container-editorial pt-8 pb-20 md:pt-12 md:pb-28">
            <div className="flex items-baseline justify-between gap-4 border-t border-bronze/20 pt-5">
              <p id="lead-heading" className="eyebrow-muted">
                {page > 1 ? "First on this page" : "Lead article"}
              </p>
              <p className="font-mono text-[0.62rem] tracking-[0.22em] text-bronze-2">01</p>
            </div>
            <div className="mt-10 md:mt-14">
              <PostCard post={lead} variant="featured" priority />
            </div>
          </div>
        </section>
      ) : null}

      {/* The rest of the record, on paper */}
      <section className="paper relative grain" aria-labelledby="grid-heading">
        <div className="container-editorial relative z-[2] py-20 md:py-28">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
            <div>
              <p className="eyebrow">The record</p>
              <h2 id="grid-heading" className="display-md mt-3">
                {gridHeading}
              </h2>
            </div>
            {hasDemo ? (
              <div className="flex max-w-md items-start gap-3 text-xs leading-relaxed text-current/70">
                <DemoBadge className="mt-0.5 shrink-0" />
                <p>{siteConfig.disclaimer.demoContent}</p>
              </div>
            ) : null}
          </div>
          <div className="rule-solid my-10" role="presentation" />

          {status === "error" ? (
            <Notice tone="error">The archive could not be reached just now. Please try again in a moment.</Notice>
          ) : posts.length ? (
            <ol className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => (
                <li key={post.id} className="flex flex-col">
                  <span className="eyebrow mb-4">No. {String(i + firstIndex).padStart(2, "0")}</span>
                  <PostCard post={post} variant="standard" />
                </li>
              ))}
            </ol>
          ) : lead ? (
            <p className="max-w-xl font-display text-2xl text-current/80">That is the whole record so far. The next case note is probably being written.</p>
          ) : (
            <EmptyState
              title={emptyTitle}
              body={emptyBody}
              action={
                <ButtonLink href="/forum" size="sm">
                  Meanwhile, the forum is open
                </ButtonLink>
              }
            />
          )}

          {status === "ok" ? <Pagination basePath={basePath} page={page} hasNext={hasNext} /> : null}
        </div>
      </section>
    </>
  );
}
