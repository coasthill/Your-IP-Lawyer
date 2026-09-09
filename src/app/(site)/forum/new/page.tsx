import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { listCategories } from "@/server/taxonomy";
import { NewThreadForm } from "@/components/forum/NewThreadForm";
import { first } from "@/components/forum/format";
import type { CategoryOption } from "@/components/forum/types";
import { Notice } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseKind(raw: string | string[] | undefined): "discussion" | "question" {
  return first(raw) === "question" ? "question" : "discussion";
}

const COPY = {
  discussion: {
    eyebrow: "New discussion",
    title: "Start a discussion",
    lede: "Open the argument. State the point, give the facts that matter, and let the room take it from there.",
    switchLabel: "Have a question instead?",
    switchHref: "/forum/new?kind=question",
    switchText: "Ask a question",
  },
  question: {
    eyebrow: "New question",
    title: "Ask a question",
    lede: "Put it to the room. The forum has a long memory and a short fuse for vagueness, so say exactly where you are stuck.",
    switchLabel: "Not a question?",
    switchHref: "/forum/new",
    switchText: "Start a discussion",
  },
} as const;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const kind = parseKind((await searchParams).kind);
  const copy = COPY[kind];
  const path = kind === "question" ? "/forum/new?kind=question" : "/forum/new";
  return {
    title: copy.title,
    description: `${copy.lede} Guest posting on The IP Forum, no account required.`,
    alternates: { canonical: path },
    robots: { index: false, follow: true },
    openGraph: { type: "website", url: path, title: `${copy.title} — ${siteConfig.name}`, description: copy.lede, siteName: siteConfig.name, locale: siteConfig.locale },
  };
}

const RULES: Array<{ n: string; title: string; body: string }> = [
  {
    n: "01",
    title: "One point, stated precisely",
    body: "A title that says what is in dispute. A body that gives the facts that matter and what you have already read on it. Vague questions receive vague answers, and deserve them.",
  },
  {
    n: "02",
    title: "No advice on specific matters",
    body: "This is a public forum, not a consultation. Do not name parties, quote confidential documents or describe a live matter in detail. Nobody here is your lawyer, and nothing here is legal advice.",
  },
  {
    n: "03",
    title: "Be civil",
    body: "Argue the point, not the person. Objections are welcome; contempt is not. Shouting, in capitals or otherwise, gets a post held.",
  },
  {
    n: "04",
    title: "Moderation",
    body: "Clean posts appear at once. Posts with links, heat or the scent of spam wait for a moderator. Pinning and closing discussions is the editor's call.",
  },
];

export default async function NewThreadPage({ searchParams }: { searchParams: SearchParams }) {
  const kind = parseKind((await searchParams).kind);
  const copy = COPY[kind];

  let categories: CategoryOption[] = [];
  let categoriesFailed = false;
  try {
    categories = (await listCategories("forum")).map((c) => ({ id: c.id, name: c.name, description: c.description }));
  } catch {
    categoriesFailed = true;
  }

  return (
    <section className="relative" aria-labelledby="new-thread-title">
      {/* Masthead, framed by hairlines at the page margins */}
      <div className="frame-lines max-md:before:hidden max-md:after:hidden">
        <div className="container-editorial pt-10 pb-12 md:pt-16 md:pb-14">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="reg-mark text-lapis" aria-hidden="true" />
            <Link href="/forum" className="link-underline eyebrow-muted transition-colors hover:text-lapis">
              The IP Forum
            </Link>
            <span aria-hidden="true" className="text-ash">
              /
            </span>
            <span className="eyebrow">{copy.eyebrow}</span>
          </nav>

          <div className="mt-8 grid gap-8 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <h1 id="new-thread-title" className="display-lg">
                {copy.title}
              </h1>
              <p className="lede mt-6 max-w-2xl">{copy.lede}</p>
            </div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-ash md:col-span-4 md:text-right">
              {copy.switchLabel}{" "}
              <Link href={copy.switchHref} className="link-underline text-lapis transition-colors hover:text-ink">
                {copy.switchText}
              </Link>
            </p>
          </div>

          <div className="rule-solid mt-12" role="presentation" />
        </div>
      </div>

      <div className="container-editorial pb-24 md:pb-32">
        <div className="mt-12 grid gap-16 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            {categoriesFailed ? <Notice className="mb-8">Categories could not be loaded just now. You can still file the discussion; a moderator can place it later.</Notice> : null}
            <NewThreadForm categories={categories} kind={kind} />
          </div>

          <aside className="lg:col-span-4 lg:col-start-9" aria-labelledby="guidelines-heading">
            <div className="lg:sticky lg:top-28">
              <p className="eyebrow eyebrow-mark">House rules</p>
              <h2 id="guidelines-heading" className="display-sm mt-3">
                What makes a good discussion
              </h2>
              <ol className="mt-8 divide-y border-y">
                {RULES.map((rule) => (
                  <li key={rule.n} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 py-5">
                    <span className="pt-1 font-mono text-[0.66rem] tracking-[0.22em] text-lapis">{rule.n}</span>
                    <div>
                      <p className="font-display text-lg leading-snug text-ink">{rule.title}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-graphite">{rule.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-8 space-y-3 text-xs leading-relaxed text-ash">
                <p>{siteConfig.disclaimer.forum}</p>
                <p>{siteConfig.disclaimer.general}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
