import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Category } from "@/db/schema";
import { siteConfig } from "@/config/site";
import { pluralise } from "@/lib/utils";
import { countThreads, listThreads, type ThreadPublic, type ThreadSort } from "@/server/forum";
import { getCategoryBySlug, listCategories } from "@/server/taxonomy";
import { ForumToolbar } from "@/components/forum/ForumToolbar";
import { IntentModal } from "@/components/forum/IntentModal";
import { ThreadRow } from "@/components/forum/ThreadRow";
import { PAGE_SIZE, editionLabel, forumHref, parseCategory, parsePage, parseSort } from "@/components/forum/format";
import { Arrow, ButtonLink, EmptyState, Notice } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const DESCRIPTION = `The IP Forum: a community discussion on intellectual property law in India — trade marks, patents, copyright, designs, litigation, arbitration, careers and law school. Hosted by ${siteConfig.author.name}. No account required.`;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sp = await searchParams;
  const categorySlug = parseCategory(sp.category);
  const page = parsePage(sp.page);
  const category = categorySlug ? await getCategoryBySlug(categorySlug).catch(() => null) : null;
  const base = category ? `${category.name} · The IP Forum` : "The IP Forum";
  const title = page > 1 ? `${base} · Page ${page}` : base;
  const path = forumHref({ category: category?.slug ?? null, page });
  return {
    title,
    description: DESCRIPTION,
    alternates: { canonical: path },
    openGraph: { type: "website", url: path, title: `${title} — ${siteConfig.name}`, description: DESCRIPTION, siteName: siteConfig.name, locale: siteConfig.locale },
    twitter: { card: "summary", title: `${title} — ${siteConfig.name}`, description: DESCRIPTION },
  };
}

type ForumData = {
  status: "ok" | "error";
  categories: Category[];
  threads: ThreadPublic[];
  hasNext: boolean;
  total: number | null;
};

/** One page of the cause list. Database failures degrade to `status: "error"` so the masthead still renders. */
async function loadForum(opts: { categorySlug?: string; sort: ThreadSort; page: number }): Promise<ForumData> {
  try {
    const [categories, rows, total] = await Promise.all([
      listCategories("forum"),
      listThreads({ categorySlug: opts.categorySlug, sort: opts.sort, limit: PAGE_SIZE + 1, offset: (opts.page - 1) * PAGE_SIZE }),
      countThreads().catch(() => null),
    ]);
    return { status: "ok", categories, threads: rows.slice(0, PAGE_SIZE), hasNext: rows.length > PAGE_SIZE, total };
  } catch {
    return { status: "error", categories: [], threads: [], hasNext: false, total: null };
  }
}

export default async function ForumPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const categorySlug = parseCategory(sp.category);
  const sort = parseSort(sp.sort);
  const page = parsePage(sp.page);

  const data = await loadForum({ categorySlug, sort, page });
  const category = categorySlug ? (data.categories.find((c) => c.slug === categorySlug) ?? null) : null;
  if (data.status === "ok" && categorySlug && !category) notFound();
  if (data.status === "ok" && page > 1 && !data.threads.length) notFound();

  const listHeading = category ? category.name : "All discussions";
  const firstNumber = (page - 1) * PAGE_SIZE + 1;

  return (
    <>
      {/* Masthead */}
      <section className="relative bg-ink" aria-labelledby="forum-title">
        <div className="container-editorial pt-10 pb-10 md:pt-16 md:pb-12">
          <div className="grid gap-10 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <p className="eyebrow">The community</p>
              <h1 id="forum-title" className="display-xl mt-5">
                The IP Forum
              </h1>
              <p className="lede mt-6 max-w-2xl">Where the argument continues after the hearing.</p>
            </div>
            <div className="md:col-span-4 md:text-right">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-ash">Record</p>
              <p className="mt-2 font-display text-xl text-parchment">{data.total === null ? siteConfig.name : `${pluralise(data.total, "discussion")} on record`}</p>
              <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-ash">
                {siteConfig.author.location} · {editionLabel()}
              </p>
              <div className="mt-5">
                <IntentModal />
              </div>
            </div>
          </div>
          <div className="rule-solid mt-12" role="presentation" />
          <ForumToolbar categories={data.categories} currentCategory={category?.slug ?? null} sort={sort} className="mt-6" />
        </div>
      </section>

      {/* The cause list */}
      <section className="relative bg-ink" aria-labelledby="list-heading">
        <div className="container-editorial pt-8 pb-24 md:pt-12 md:pb-32">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
            <div>
              <p className="eyebrow-muted">The record</p>
              <h2 id="list-heading" className="display-md mt-3">
                {listHeading}
              </h2>
              {category?.description ? <p className="mt-3 max-w-xl text-sm text-bone">{category.description}</p> : null}
            </div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-ash">
              {page > 1 ? `Page ${page} · ` : ""}
              {data.threads.length ? `Nos. ${firstNumber}–${firstNumber + data.threads.length - 1}` : "Nothing listed"}
            </p>
          </div>

          <div className="mt-8">
            {data.status === "error" ? (
              <Notice tone="error">The forum could not be reached just now. Please try again in a moment.</Notice>
            ) : data.threads.length ? (
              <ol className="border-t border-bronze/15">
                {data.threads.map((t) => (
                  <li key={t.id}>
                    <ThreadRow thread={t} />
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="Nothing here yet."
                body="Start the argument."
                action={
                  <ButtonLink href="/forum/new" variant="solid" size="sm">
                    Start a discussion
                  </ButtonLink>
                }
              />
            )}
          </div>

          {data.status === "ok" && (page > 1 || data.hasNext) ? (
            <nav aria-label="Pagination" className="mt-12 flex items-center justify-between gap-4 border-t border-bronze/15 pt-8">
              <div>
                {page > 1 ? (
                  <Link href={forumHref({ category: category?.slug ?? null, sort, page: page - 1 })} rel="prev" className="btn btn-sm">
                    <Arrow direction="left" /> Previous
                  </Link>
                ) : null}
              </div>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-ash">Page {page}</p>
              <div>
                {data.hasNext ? (
                  <Link href={forumHref({ category: category?.slug ?? null, sort, page: page + 1 })} rel="next" className="btn btn-sm">
                    Load more <Arrow />
                  </Link>
                ) : null}
              </div>
            </nav>
          ) : null}

          <div className="mt-16 max-w-2xl space-y-2 border-t border-bronze/15 pt-8 text-xs leading-relaxed text-bone/60">
            <p>{siteConfig.disclaimer.forum}</p>
            <p>No account is required. Guest posts may be held for moderation before they appear; nothing here is legal advice on any particular matter.</p>
          </div>
        </div>
      </section>
    </>
  );
}
