import Link from "next/link";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/components/pages/metadata";
import { CopyAddressButton } from "@/components/pages/CopyAddressButton";
import { PageMasthead } from "@/components/pages/PageMasthead";
import { RecordList, type RecordItem } from "@/components/pages/RecordList";

const PATH = "/contact";
const TITLE = "Contact";
const DESCRIPTION = `Write to ${siteConfig.author.name}, ${siteConfig.author.title}, ${siteConfig.author.location}: a case note, a question for the forum, a correction. One address, read by one person. Not for confidential matter information.`;

export const metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

const SUBJECTS: RecordItem[] = [
  {
    title: "A case note",
    body: (
      <>
        You read a judgment and think it was wrongly decided, or rightly decided for the wrong reasons. Say so in eight hundred words. The{" "}
        <Link href="/submission-guidelines" className="link-underline text-parchment">
          submission guidelines
        </Link>{" "}
        will save us both a round of emails.
      </>
    ),
  },
  {
    title: "A question for the forum",
    body: (
      <>
        If other people would benefit from seeing the answer, put it to{" "}
        <Link href="/forum" className="link-underline text-parchment">
          the forum
        </Link>{" "}
        rather than to this inbox. If it is a question about how the forum itself works, or something you would rather raise quietly, write.
      </>
    ),
  },
  {
    title: "A correction",
    body: "An error in an article, a citation that leads nowhere, a name misspelt. Corrections are welcome, acknowledged, and made in the text with a note saying so.",
  },
];

export default function ContactPage() {
  const email = siteConfig.contactEmail;
  return (
    <>
      <PageMasthead size="xl" eyebrow="Contact" title="Have something to say?" lede="No form, no ticket number, no auto-reply. One address, read by one person." />

      {/* The address */}
      <section className="relative bg-ink" aria-labelledby="address-heading">
        <div className="container-editorial pt-4 pb-20 md:pt-8 md:pb-28">
          <p id="address-heading" className="eyebrow-muted">
            The address
          </p>
          <a
            href={`mailto:${email}`}
            className="link-underline mt-6 inline-block max-w-full font-display text-[clamp(1.9rem,6.4vw,6rem)] leading-[1.05] tracking-[-0.02em] text-ivory [overflow-wrap:anywhere]"
          >
            {email}
          </a>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <CopyAddressButton value={email} />
            <p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-bronze-2">Counsel may proceed.</p>
          </div>

          <div className="rule-solid mt-16 md:mt-20" role="presentation" />

          <div className="mt-12 grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <p className="eyebrow">What to write about</p>
              <RecordList items={SUBJECTS} className="mt-6" />
            </div>

            <aside className="lg:col-span-4 lg:col-start-9" aria-labelledby="replies-heading">
              <p id="replies-heading" className="eyebrow-muted">
                On replies
              </p>
              <p className="mt-4 font-display text-xl leading-snug text-parchment">
                Every email is read, by one person, usually between hearings. Replies come when the cause list allows: some within the day, some later, none
                on a promised date.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-bone">If a fortnight passes in silence, a short reminder is entirely in order.</p>

              <div className="mt-12 border-t border-bronze/15 pt-8">
                <p className="eyebrow-muted">A necessary note</p>
                <p className="mt-4 text-sm leading-relaxed text-bone">
                  Please do not send confidential information about any matter by email: no pleadings, no documents, no facts of a live dispute. Writing to
                  this address does not create a lawyer–client relationship, and no advice on a particular matter is given by email.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-bone/60">{siteConfig.disclaimer.general}</p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
