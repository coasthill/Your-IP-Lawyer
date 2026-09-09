import Link from "next/link";
import { Suspense } from "react";
import { siteConfig } from "@/config/site";
import { getFeaturedPost, listPublishedPosts, type PostWithMeta } from "@/server/posts";
import { listThreads } from "@/server/forum";
import { PostCard } from "@/components/blog/PostCard";
import { ThreadRow } from "@/components/forum/ThreadRow";
import { Arrow, ButtonLink, Eyebrow } from "@/components/ui/primitives";

/**
 * The editorial sections that follow the cinematic stage:
 * purpose → blog → forum → about → contact. The artwork made the argument; this is the record.
 */
export function HomeSections() {
  return (
    <div className="relative">
      <Purpose />
      <Suspense fallback={<SectionSkeleton paper />}>
        <FromTheBlog />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <FromTheForum />
      </Suspense>
      <AboutTeaser />
      <ContactTeaser />
    </div>
  );
}

const PURPOSES = [
  ["IP commentary", "Opinion on where the law is, and where it is going."],
  ["Legal developments", "New judgments, new rules, new problems."],
  ["Case analysis", "What a court actually decided, and why it matters."],
  ["Practical insights", "How things work in practice, not only on paper."],
  ["Legal writing", "A place to write seriously about intellectual property."],
  ["Discussion", "A forum where the argument continues after the hearing."],
  ["Professional learning", "For students, juniors and anyone still learning. That is everyone."],
  ["Dispute resolution & careers", "Litigation, arbitration, mediation, and how to build a life in them."],
] as const;

function Purpose() {
  return (
    <section className="relative border-t" aria-labelledby="purpose-heading">
      <div className="container-editorial py-24 md:py-36">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-7">
            <Eyebrow className="eyebrow-mark mb-6">The website</Eyebrow>
            <h2 id="purpose-heading" className="display-lg">
              Intellectual property.
              <br />
              <span className="italic text-lapis">Without the boring part.</span>
            </h2>
            <p className="lede mt-8 max-w-xl">
              {siteConfig.name} is a platform for thinking out loud about intellectual property law in India: commentary, case analysis, practical insight,
              discussion, and the long process of learning how the law behaves in a courtroom.
            </p>
            <p className="mt-6 max-w-xl text-base text-graphite">
              It is written by a practising IP litigation lawyer and open to anyone who wants to read, argue, or write. Nothing here is legal advice. Everything here is
              meant to be worth your time.
            </p>
          </div>
          <div className="md:col-span-5">
            <ol className="divide-y border-y">
              {PURPOSES.map(([title, body], i) => (
                <li key={title} className="grid grid-cols-[3rem_1fr] gap-4 py-4">
                  <span className="font-mono text-[0.62rem] tracking-[0.2em] text-lapis pt-1">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="font-display text-xl text-ink">{title}</p>
                    <p className="mt-1 text-sm text-slate">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

async function FromTheBlog() {
  let featured: PostWithMeta | null = null;
  let latest: PostWithMeta[] = [];
  try {
    featured = await getFeaturedPost();
    const posts = await listPublishedPosts({ limit: 4 });
    latest = posts.filter((p) => p.id !== featured?.id).slice(0, 3);
  } catch {
    /* database unavailable — render the invitation only */
  }
  return (
    <section className="paper relative border-t" aria-labelledby="blog-heading">
      <div className="container-editorial py-24 md:py-32">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow className="eyebrow-mark mb-4">The publication</Eyebrow>
            <h2 id="blog-heading" className="display-md">
              From the blog
            </h2>
            <p className="mt-3 text-sm text-ash">Filed under: things worth reading.</p>
          </div>
          <ButtonLink href="/blog" size="sm">
            All articles <Arrow />
          </ButtonLink>
        </div>
        <div className="rule-solid my-10" role="presentation" />
        {featured ? (
          <>
            <PostCard post={featured} variant="featured" priority />
            {latest.length ? (
              <div className="mt-14 grid gap-10 border-t pt-10 md:grid-cols-3">
                {latest.map((p) => (
                  <PostCard key={p.id} post={p} variant="standard" />
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <p className="font-display text-2xl">The next case note is probably being written.</p>
        )}
      </div>
    </section>
  );
}

async function FromTheForum() {
  let threads: Awaited<ReturnType<typeof listThreads>> = [];
  try {
    threads = await listThreads({ sort: "active", limit: 4 });
  } catch {
    /* database unavailable */
  }
  return (
    <section className="surface-lapis relative" aria-labelledby="forum-heading">
      <div className="container-editorial py-24 md:py-32">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <Eyebrow className="eyebrow-mark mb-4">The community</Eyebrow>
            <h2 id="forum-heading" className="display-md">
              The IP Forum
            </h2>
            <p className="lede mt-5">Where the argument continues after the hearing.</p>
            <p className="mt-4 text-sm text-bone">
              Discussions on trade marks, patents, copyright, designs, GI, litigation, arbitration, careers and law school. No account required. Views are
              the participants&rsquo; own.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/forum" variant="solid" size="sm">
                Browse discussions
              </ButtonLink>
              <ButtonLink href="/forum/new" size="sm">
                Start the argument
              </ButtonLink>
            </div>
          </div>
          <div className="md:col-span-8">
            {threads.length ? (
              <div className="border-t">
                {threads.map((t) => (
                  <ThreadRow key={t.id} thread={t} compact />
                ))}
              </div>
            ) : (
              <div className="plate px-8 py-12">
                <p className="display-sm">Nothing here yet.</p>
                <p className="mt-2 text-sm text-bone">Start the argument.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutTeaser() {
  return (
    <section className="relative" aria-labelledby="about-heading">
      <div className="container-editorial py-24 md:py-32">
        <div className="grid gap-12 md:grid-cols-12 md:items-center">
          <div className="md:col-span-3">
            <div className="relative aspect-[3/4] overflow-hidden border bg-lapis-3 shadow-[var(--shadow-plate)] grain vignette">
              <svg viewBox="0 0 300 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
                <defs>
                  <linearGradient id="about-wall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#1b5ad6" />
                    <stop offset="1" stopColor="#0f2f7c" />
                  </linearGradient>
                  <radialGradient id="about-key" cx="30%" cy="18%" r="70%">
                    <stop offset="0" stopColor="#fbfaf7" stopOpacity="0.42" />
                    <stop offset="0.5" stopColor="#f6ecd2" stopOpacity="0.1" />
                    <stop offset="1" stopColor="#0f2f7c" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="about-gown" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#2a2a31" />
                    <stop offset="0.5" stopColor="#0d0d10" />
                    <stop offset="1" stopColor="#050506" />
                  </linearGradient>
                </defs>
                <rect width="300" height="400" fill="url(#about-wall)" />
                <rect width="300" height="400" fill="url(#about-key)" />
                <rect x="30" y="40" width="240" height="280" fill="none" stroke="#d9b653" strokeOpacity="0.22" />
                <path d="M150 112c-26 0-44 18-52 44l-44 210c-2 10 4 18 14 18h164c10 0 16-8 14-18l-44-210c-8-26-26-44-52-44z" fill="url(#about-gown)" />
                <path d="M118 126c8-10 20-14 32-14s24 4 32 14l-6 12c-8-6-16-9-26-9s-18 3-26 9z" fill="#1c1c22" />
                <ellipse cx="150" cy="86" rx="26" ry="32" fill="#141417" />
                <path d="M126 74c8-14 40-14 48 0-4-10-14-16-24-16s-20 6-24 16z" fill="#1a1a1f" />
                <path d="M141 122l4 30 5-30zM159 122l-4 30-5-30z" fill="#fbfaf7" opacity="0.94" />
                <path d="M150 112c-26 0-44 18-52 44l-44 210c-2 10 4 18 14 18h20L98 172c6-24 22-40 44-46z" fill="#3a3a44" opacity="0.28" />
              </svg>
            </div>
          </div>
          <div className="md:col-span-8 md:col-start-5">
            <Eyebrow className="eyebrow-mark mb-4">About</Eyebrow>
            <h2 id="about-heading" className="display-md">
              {siteConfig.author.name}
            </h2>
            <p className="mt-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-ash">
              {siteConfig.author.title} · {siteConfig.author.location}
            </p>
            <p className="lede mt-6 max-w-2xl">
              An IP litigation lawyer at a Delhi law firm, learning the law the way it is actually practised: through litigation, research and the daily
              realities of appearing in court. This site is where the thinking is written down.
            </p>
            <div className="mt-8">
              <ButtonLink href="/about" size="sm">
                Read more <Arrow />
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactTeaser() {
  return (
    <section className="surface-lapis relative" aria-labelledby="contact-heading">
      <div className="container-editorial py-24 md:py-32">
        <Eyebrow className="eyebrow-mark mb-6">Contact</Eyebrow>
        <h2 id="contact-heading" className="display-xl">
          Have something
          <br />
          to say?
        </h2>
        <p className="mt-8 text-sm text-bone">A case note, a correction, a question for the forum, an argument you want to have in writing.</p>
        <a href={`mailto:${siteConfig.contactEmail}`} className="link-underline mt-6 inline-block font-display text-[clamp(1.4rem,3.4vw,2.6rem)] text-ivory">
          {siteConfig.contactEmail}
        </a>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/contact" variant="solid" size="sm">
            Contact page
          </ButtonLink>
          <Link href="/submission-guidelines" className="btn btn-sm btn-ghost">
            Submission guidelines <Arrow />
          </Link>
        </div>
      </div>
    </section>
  );
}

function SectionSkeleton({ paper }: { paper?: boolean }) {
  return (
    <section className={paper ? "paper" : "surface-lapis"} aria-hidden="true">
      <div className="container-editorial py-24 md:py-32">
        <div className="h-3 w-24 rounded-sm bg-current opacity-10" />
        <div className="mt-6 h-10 w-2/3 rounded-sm bg-current opacity-10" />
        <div className="mt-12 h-64 w-full rounded-sm bg-current opacity-[0.06]" />
      </div>
    </section>
  );
}
