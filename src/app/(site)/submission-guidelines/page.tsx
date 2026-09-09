import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/components/pages/metadata";
import { LIMITS } from "@/lib/storage/validate";
import { ContentsNav, type ContentsItem } from "@/components/pages/ContentsNav";
import { CopyAddressButton } from "@/components/pages/CopyAddressButton";
import { PageMasthead } from "@/components/pages/PageMasthead";
import { SubmissionForm } from "@/components/pages/SubmissionForm";

const PATH = "/submission-guidelines";
const TITLE = "Submission guidelines";
const DESCRIPTION = `Write for ${siteConfig.name}: what we publish (case notes, articles, commentary on intellectual property law in India), editorial expectations, originality and AI-assistance disclosure, citation, format, word counts, the review process, and how to submit by email or through the form.`;

export const metadata = pageMetadata({ path: PATH, title: TITLE, description: DESCRIPTION });

/**
 * The form posts through a Server Action, and Next caps action bodies at 1 MB unless
 * `serverActions.bodySizeLimit` is raised in next.config.ts. Until it is, the form accepts a
 * manuscript up to this size; the storage limit (LIMITS.file) is the ceiling once it is raised.
 */
const FORM_FILE_LIMIT = Math.min(LIMITS.file, 900 * 1024);

const SECTIONS: ContentsItem[] = [
  { id: "what-we-accept", label: "What we accept" },
  { id: "editorial-expectations", label: "Editorial expectations" },
  { id: "originality", label: "Originality" },
  { id: "citation", label: "Citation" },
  { id: "format", label: "Format" },
  { id: "word-count", label: "Word count" },
  { id: "review-process", label: "Review process" },
  { id: "submission-method", label: "Submission method" },
];

const WORD_COUNTS = [
  { kind: "Case note", range: "800 – 1,500", note: "One judgment: what it decided, on which facts, and why it matters beyond the parties." },
  { kind: "Article", range: "1,500 – 3,500", note: "A sustained argument on a question of law or practice, with the counter-arguments taken seriously." },
  { kind: "Commentary", range: "600 – 1,200", note: "A view on a development: a new rule, a bill, a practice direction, a trend. Sharp and short." },
] as const;

/** One numbered guideline: seal numeral, display heading, body. Anchored for the contents nav. */
function Guideline({ n, id, title, children }: { n: number; id: string; title: string; children: ReactNode }) {
  const num = String(n).padStart(2, "0");
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28 border-t py-10 first:border-t-0 first:pt-0 md:py-12">
      <div className="grid gap-x-6 gap-y-3 md:grid-cols-[4rem_minmax(0,1fr)]">
        <span aria-hidden="true" className="font-display text-[1.9rem] leading-none tabular-nums text-seal">
          {num}
        </span>
        <div>
          <h2 id={`${id}-title`} className="display-sm">
            <span className="sr-only">{num}. </span>
            {title}
          </h2>
          <div className="mt-5 max-w-2xl space-y-4 text-[1.02rem] leading-[1.7] text-ink/85 [&_a]:underline [&_a]:decoration-ink/40 [&_a]:underline-offset-4 [&_a:hover]:decoration-ink [&_li+li]:mt-2 [&_strong]:font-medium [&_strong]:text-ink [&_ul]:list-[square] [&_ul]:pl-5 [&_ul_li]:marker:text-seal">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SubmissionGuidelinesPage() {
  const submissionsEmail = siteConfig.submissionsEmail;
  const subjectExample = "Submission — Case note — Working title";
  const mailto = `mailto:${submissionsEmail}?subject=${encodeURIComponent("Submission — [Case note / Article / Commentary] — Working title")}`;

  return (
    <>
      <PageMasthead
        eyebrow="Submissions"
        title="Write for us"
        lede="What we publish, how we edit, and how to send a piece. Read this once before you write; it will save us both a round of emails."
        record={{ label: "Word counts", value: "600 – 3,500 words", note: "Case notes · Articles · Commentary" }}
      />

      {/* The guidelines, on paper */}
      <section className="relative" aria-labelledby="guidelines-heading">
        <div className="container-editorial py-16 md:py-24">
          <h2 id="guidelines-heading" className="sr-only">
            The guidelines
          </h2>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <aside className="min-w-0 lg:col-span-3">
              <ContentsNav items={SECTIONS} tone="paper" />
            </aside>

            <div className="lg:col-span-8 lg:col-start-5">
              <Guideline n={1} id="what-we-accept" title="What we accept">
                <p>
                  Writing on intellectual property law and the disputes it produces, mainly in India, with an eye to how the law is actually applied. Three
                  kinds of piece, in roughly this order of frequency:
                </p>
                <ul>
                  <li>
                    <strong>Case notes</strong> on recent judgments and orders on IP questions, from the Supreme Court, the High Courts, the tribunals and
                    the registries, and from foreign courts where the reasoning travels.
                  </li>
                  <li>
                    <strong>Articles</strong> that make a sustained argument on a question of IP law, litigation, arbitration or dispute resolution.
                  </li>
                  <li>
                    <strong>Commentary</strong> on developments: a new rule, a bill, a practice direction, a trend in the cause list, a habit worth breaking.
                  </li>
                </ul>
                <p>
                  Student notes, reviews and pieces on careers in litigation are welcome and are read on the same footing as everything else. Marketing,
                  firm announcements, pieces about a live matter in which you appear, and anything already published elsewhere are not accepted.
                </p>
              </Guideline>

              <Guideline n={2} id="editorial-expectations" title="Editorial expectations">
                <p>
                  Write for a reader who is intelligent, busy and not necessarily an IP specialist. Say what the court decided before saying what you think of
                  it. Argue; do not merely summarise. Take the strongest version of the view you disagree with, and then disagree with it.
                </p>
                <ul>
                  <li>Plain English. Short sentences win. Latin only where the Latin is the term of art.</li>
                  <li>Neutral on parties, candid on reasoning. Criticism of a judgment is welcome; contempt is not.</li>
                  <li>A title that says what the piece is about, and an opening paragraph that says why it matters.</li>
                  <li>Your byline is your name and a one-line description. No firm logos, and no biography longer than a sentence.</li>
                </ul>
                <p>
                  We edit. Every accepted piece is edited for clarity, length and house style. Substantive changes are agreed with you, and nothing is published
                  until you have approved the final text.
                </p>
              </Guideline>

              <Guideline n={3} id="originality" title="Originality">
                <p>
                  A piece must be your own work, original, unpublished, and not under consideration elsewhere. If it is adapted from a paper, a dissertation
                  or a talk, say so when you send it; that is usually fine. Quotations are attributed and paraphrases are cited. Every proposition of law
                  is yours to have checked.
                </p>
                <p>
                  <strong>AI assistance.</strong> You may use AI tools for research leads, for language, or for structure. Tell us, in a line, what was used
                  and for what; the disclosure goes in the email or the abstract, not in the published piece. A piece substantially written by a model will
                  be declined, however polished: what we publish must contain a lawyer&rsquo;s, or a student&rsquo;s, own thinking. AI can draft. Someone
                  still has to think, and to verify that every authority cited actually exists and actually says what it is cited for. That someone is you.
                </p>
              </Guideline>

              <Guideline n={4} id="citation" title="Citation">
                <p>Cite so that a reader can find the source in under a minute, and never cite what you have not read.</p>
                <ul>
                  <li>
                    <strong>Judgments:</strong> the neutral citation where one exists, otherwise a reporter citation; the court, the date, and paragraph
                    numbers for anything quoted or relied upon.
                  </li>
                  <li>
                    <strong>Statutes:</strong> section, Act and year on first mention; the short form thereafter.
                  </li>
                  <li>
                    <strong>Everything else:</strong> author, title, publication, year, and a link where the source is freely available online.
                  </li>
                  <li>Footnotes, not endnotes, and kept short. The argument belongs in the text.</li>
                  <li>Where a primary source is freely available, link to it. A paywalled link should never be the only citation.</li>
                </ul>
              </Guideline>

              <Guideline n={5} id="format" title="Format">
                <ul>
                  <li>A Word document (.docx) is best, because we edit in it; a PDF is acceptable; the text in the body of an email is acceptable too.</li>
                  <li>In this order: title, a one-paragraph abstract, the piece, then a one-line byline.</li>
                  <li>Headings sparingly. No numbered paragraphs unless the piece is a note that needs them. No images unless they are yours or licensed.</li>
                  <li>British and Indian spelling. &ldquo;Trade mark&rdquo; is two words, as in the Act.</li>
                  <li>No formatting for its own sake: no colours, no text boxes, no track changes left on.</li>
                </ul>
              </Guideline>

              <Guideline n={6} id="word-count" title="Word count">
                <p>Limits are guidance, not statute. A piece that needs 3,800 words will not be refused for it; a piece that is 3,800 words because it was not edited will.</p>
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-ink/30">
                      <th scope="col" className="eyebrow-muted pb-3 pr-4 font-normal">
                        Kind
                      </th>
                      <th scope="col" className="eyebrow-muted pb-3 pr-4 font-normal">
                        Words
                      </th>
                      <th scope="col" className="eyebrow-muted hidden pb-3 font-normal sm:table-cell">
                        Typically
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {WORD_COUNTS.map((row) => (
                      <tr key={row.kind} className="border-b align-baseline">
                        <th scope="row" className="py-4 pr-4 font-display text-xl font-medium text-ink">
                          {row.kind}
                        </th>
                        <td className="py-4 pr-4 font-display text-xl tabular-nums text-seal whitespace-nowrap">{row.range}</td>
                        <td className="hidden py-4 text-sm leading-relaxed text-ink/70 sm:table-cell">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Guideline>

              <Guideline n={7} id="review-process" title="Review process">
                <p>
                  Every submission is acknowledged. It is then read, by one person, between hearings, which is why no timeline is promised: some pieces are
                  answered in days, others take longer, and a polite reminder after a fortnight is always in order.
                </p>
                <ul>
                  <li>
                    <strong>Accepted</strong> pieces go through one or two rounds of editing with you, and a publication date is agreed.
                  </li>
                  <li>
                    <strong>Accepted with revisions</strong> means the argument is worth publishing and is not yet ready; the note will say what is missing.
                  </li>
                  <li>
                    <strong>Declined</strong> pieces receive a short reply. Reasons are given where they would help and not always otherwise.
                  </li>
                </ul>
                <p>
                  Submissions are stored securely, read only by the editor, and never shared. Nothing is published without your agreement to the final
                  text, and you keep the copyright in what you write; we ask only for the right to publish it here and to keep it here.
                </p>
              </Guideline>
            </div>
          </div>
        </div>
      </section>

      {/* Submission method, on paper */}
      <section id="submission-method" className="relative scroll-mt-20 border-t" aria-labelledby="submission-method-title">
        <div className="container-editorial py-20 md:py-28">
          <div className="grid gap-x-6 gap-y-3 md:grid-cols-[4rem_minmax(0,1fr)]">
            <span aria-hidden="true" className="font-display text-[1.9rem] leading-none tabular-nums text-seal">
              08
            </span>
            <div>
              <h2 id="submission-method-title" className="display-md">
                <span className="sr-only">08. </span>
                Submission method
              </h2>
              <p className="lede mt-5 max-w-2xl">Two doors, one desk. Email if you already have a manuscript; the form if you would rather start with the idea.</p>
            </div>
          </div>

          <div className="mt-14 grid gap-16 lg:grid-cols-12 lg:gap-12">
            {/* (a) Email */}
            <div className="lg:col-span-5">
              <p className="eyebrow eyebrow-mark">(a) By email</p>
              <p className="mt-4 text-sm leading-relaxed text-graphite">
                Send the manuscript, as .docx or .pdf, with the abstract and your AI-assistance note in the body of the email, to
              </p>
              <a href={mailto} className="link-underline mt-4 inline-block max-w-full font-display text-[clamp(1.5rem,2.6vw,2.2rem)] leading-tight text-lapis [overflow-wrap:anywhere]">
                {submissionsEmail}
              </a>
              <div className="mt-5">
                <CopyAddressButton value={submissionsEmail} />
              </div>

              <div className="mt-10 border-t pt-6">
                <p className="eyebrow-muted">Subject line</p>
                <p className="mt-3 font-mono text-[0.8rem] leading-relaxed text-ink">
                  Submission — <span className="text-lapis">[Case note / Article / Commentary]</span> — <span className="text-lapis">Working title</span>
                </p>
                <p className="mt-3 text-xs leading-relaxed text-ash">
                  For instance: <span className="font-mono text-graphite">{subjectExample}</span>. The convention lets a submission be found in an inbox that
                  also receives everything else.
                </p>
              </div>

              <div className="mt-10 space-y-3 border-t pt-6 text-xs leading-relaxed text-ash">
                <p>Submissions are stored securely and read only by the editor. Nothing is published without your agreement to the final text.</p>
                <p>{siteConfig.disclaimer.general}</p>
              </div>
            </div>

            {/* (b) The form */}
            <div className="lg:col-span-7">
              <div className="plate px-5 py-8 sm:px-8 sm:py-10">
                <p className="eyebrow eyebrow-mark">(b) Through the form</p>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-graphite">
                  The essentials, filed directly. Attach the manuscript if it is ready; if not, the abstract is enough to start the conversation.
                </p>
                <div className="mt-8">
                  <SubmissionForm maxFileBytes={FORM_FILE_LIMIT} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
