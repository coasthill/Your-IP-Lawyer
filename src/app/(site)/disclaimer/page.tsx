import Link from "next/link";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/components/pages/metadata";
import { PageMasthead } from "@/components/pages/PageMasthead";
import { RecordList, type RecordItem } from "@/components/pages/RecordList";

const PATH = "/disclaimer";
const TITLE = "Disclaimer";
const DESCRIPTION = `What ${siteConfig.name} is and is not: general information, not legal advice; no lawyer–client relationship; forum views are the participants' own; demonstration content is marked; external links are not endorsed; and a note on jurisdiction.`;

export const metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION, card: "summary" });

const TERMS: RecordItem[] = [
  {
    id: "general",
    title: "General",
    body: (
      <>
        <p>{siteConfig.disclaimer.general}</p>
        <p className="mt-3">
          The law changes, judgments are overruled, and a proposition that was true when an article was written may not be true when you read it. Nothing
          here should be relied upon in place of advice on your own facts from a lawyer you have actually instructed.
        </p>
      </>
    ),
  },
  {
    id: "no-relationship",
    title: "No lawyer–client relationship",
    body: (
      <p>
        Reading this site, leaving a comment, posting in the forum, submitting an article or emailing its author does not make anyone your lawyer. A
        lawyer–client relationship is created only by an express engagement, which this site does not offer and cannot accept. Please do not send
        confidential information about any matter through it.
      </p>
    ),
  },
  {
    id: "forum",
    title: "The forum",
    body: (
      <>
        <p>{siteConfig.disclaimer.forum}</p>
        <p className="mt-3">Moderation removes spam and abuse. It does not verify legal accuracy, and it cannot.</p>
      </>
    ),
  },
  {
    id: "demo-content",
    title: "Demonstration content",
    body: (
      <>
        <p>{siteConfig.disclaimer.demoContent}</p>
        <p className="mt-3">It is marked as such wherever it appears, and it is removed as the real record grows.</p>
      </>
    ),
  },
  {
    id: "external-links",
    title: "External links",
    body: (
      <p>
        Links to judgments, statutes, registries and other websites are given for convenience. We do not control those sites, do not endorse their contents,
        and cannot promise that they will still be where we left them.
      </p>
    ),
  },
  {
    id: "jurisdiction",
    title: siteConfig.footer.jurisdictionHeading,
    body: <p className="font-display text-lg italic leading-relaxed text-graphite">{siteConfig.footer.jurisdiction}</p>,
  },
];

export default function DisclaimerPage() {
  return (
    <>
      <PageMasthead eyebrow="Disclaimer" title="A few necessary words." lede="Short, because you have better things to read. Meant, because we do." />

      <section className="relative" aria-labelledby="terms-heading">
        <div className="container-editorial pt-4 pb-24 md:pt-8 md:pb-32">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-3">
              <p id="terms-heading" className="eyebrow eyebrow-mark">
                The terms
              </p>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-graphite">
                Six points. They apply to every page of {siteConfig.name}, to the forum, and to anything sent to its address.
              </p>
            </div>
            <div className="lg:col-span-8 lg:col-start-5">
              <RecordList items={TERMS} bodyClassName="text-base [&_p]:max-w-2xl" />
              <p className="mt-10 text-sm text-graphite">
                A question about any of this?{" "}
                <Link href="/contact" className="link-underline text-lapis">
                  Write.
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
