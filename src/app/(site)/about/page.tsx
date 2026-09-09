import { absoluteUrl, siteConfig } from "@/config/site";
import { pageMetadata } from "@/components/pages/metadata";
import { AdvocatePlate } from "@/components/pages/AdvocatePlate";
import { CtaRow } from "@/components/pages/CtaRow";
import { PageMasthead } from "@/components/pages/PageMasthead";
import { RecordList, type RecordItem } from "@/components/pages/RecordList";

const PATH = "/about";
const TITLE = "About";
const DESCRIPTION = `${siteConfig.author.name} is an ${siteConfig.author.title} based in ${siteConfig.author.location}, with a particular interest in intellectual property and dispute resolution. ${siteConfig.name} is where he writes, learns, discusses and exchanges ideas about the law.`;

export const metadata = pageMetadata({ path: PATH, title: TITLE, ogTitle: siteConfig.author.name, description: DESCRIPTION, profile: { firstName: "Rohit", lastName: "Pradhan" } });

/** The site's purpose, as a numbered record. Mirrors the homepage list; the wording is its own. */
const PURPOSES: RecordItem[] = [
  { title: "IP commentary", body: "Opinion on where intellectual property law stands, and where it appears to be going." },
  { title: "Legal developments", body: "New judgments, new rules, new problems, noted as they arrive." },
  { title: "Case analysis", body: "What a court actually decided, on which facts, and why it matters beyond the parties." },
  { title: "Practical insights", body: "How things work in practice: filings, hearings, evidence, and the parts the textbooks leave out." },
  { title: "Legal writing", body: "A place to write seriously about the law, and an open invitation to others to do the same." },
  { title: "Discussion", body: "A forum where the argument continues after the hearing. No account required." },
  { title: "Professional learning", body: "For students, juniors and everyone still learning, which is all of us." },
  { title: "Dispute resolution and careers", body: "Litigation, arbitration, mediation, and an honest conversation about building a life in them." },
];

/** schema.org ProfilePage whose main entity is the same Person the site layout declares. */
function AboutJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": absoluteUrl(`${PATH}#page`),
    url: absoluteUrl(PATH),
    name: `About ${siteConfig.author.name}`,
    description: DESCRIPTION,
    inLanguage: "en-IN",
    isPartOf: { "@id": absoluteUrl("/#website") },
    mainEntity: {
      "@type": "Person",
      "@id": absoluteUrl("/#person"),
      name: siteConfig.author.name,
      alternateName: siteConfig.author.shortName,
      jobTitle: siteConfig.author.title,
      description: siteConfig.author.bio,
      url: absoluteUrl(PATH),
      address: { "@type": "PostalAddress", addressLocality: "Delhi", addressCountry: "IN" },
      knowsAbout: ["Intellectual property law", "IP litigation", "Trade marks", "Patents", "Copyright", "Designs", "Dispute resolution"],
      sameAs: Object.values(siteConfig.social).filter(Boolean),
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default function AboutPage() {
  return (
    <>
      <AboutJsonLd />

      <PageMasthead
        eyebrow="About"
        title={siteConfig.author.name}
        lede={`${siteConfig.author.title} · ${siteConfig.author.location}`}
        record={{ label: "The record", value: "Intellectual property · Disputes", note: `${siteConfig.author.location} · ${siteConfig.name}` }}
      />

      {/* The biography, on paper */}
      <section className="relative" aria-labelledby="bio-heading">
        <div className="container-editorial py-16 md:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <div className="mx-auto max-w-sm lg:sticky lg:top-28 lg:mx-0 lg:max-w-none">
                <AdvocatePlate tone="paper" />
              </div>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <p className="eyebrow eyebrow-mark">In my own words</p>
              <h2 id="bio-heading" className="display-md mt-4">
                Learning the law where it is practised.
              </h2>
              <div className="prose-editorial mt-8">
                <p>
                  I am an IP litigation lawyer based in Delhi. I work at a law firm, and much of my professional life is spent learning: through litigation,
                  through legal research, and through the practical realities of appearing in court, where the law behaves rather differently from the way it
                  reads.
                </p>
                <p>
                  My particular interest is intellectual property and dispute resolution. What draws me to the work is that it cannot be learned from books
                  alone. A proposition that seems settled in a treatise looks different once it is put to a bench, tested by the other side and decided on a
                  set of facts nobody anticipated. There is a real pleasure in that: in preparing, appearing, being corrected, and coming back better prepared.
                </p>
                <p>
                  I would like, in time, to become a great IP lawyer. I say so plainly because it is the honest reason this site exists. {siteConfig.name} is
                  where I write, learn, discuss and exchange ideas about the law: notes on judgments and developments, arguments tested before they are needed,
                  and an open invitation to anyone who cares about these questions to argue back.
                </p>
                <p>
                  Nothing here is legal advice, and the views are my own. It is one lawyer&rsquo;s notebook, kept in public, in the hope that it is useful to
                  others who are still learning. That is everyone.
                </p>
              </div>
              <p className="mt-10 font-display text-xl italic text-ink/70">— {siteConfig.author.shortName}</p>
            </div>
          </div>
        </div>
      </section>

      {/* What this site is for */}
      <section className="relative border-t" aria-labelledby="purpose-heading">
        <div className="container-editorial py-24 md:py-32">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-4">
              <p className="eyebrow eyebrow-mark">The website</p>
              <h2 id="purpose-heading" className="display-md mt-4">
                What this site is for
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-graphite">
                Eight things, in no particular order of importance. If a piece of writing here does none of them, it should not have been published.
              </p>
            </div>
            <div className="md:col-span-8">
              <RecordList items={PURPOSES} />
            </div>
          </div>

          <div className="rule mt-24" role="presentation" />

          <div className="mt-12 flex flex-wrap items-end justify-between gap-x-12 gap-y-8">
            <div>
              <p className="eyebrow-muted">Proceed to the next matter.</p>
              <p className="display-sm mt-3">Read, argue, or write.</p>
            </div>
            <CtaRow />
          </div>
        </div>
      </section>
    </>
  );
}
