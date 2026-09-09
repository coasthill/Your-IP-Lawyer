import type { Document } from "@/db/schema";
import { pluralise } from "@/lib/utils";
import { formatBytes } from "./format";
import { PdfPreview } from "./PdfPreview";

type Attachment = Document & { label: string | null };

const KIND_LABEL: Record<string, string> = { pdf: "PDF", image: "Image", file: "File" };

/** Documents attached to an article: judgments, orders, annexures. */
export function Attachments({ documents }: { documents: Attachment[] }) {
  if (!documents.length) return null;
  return (
    <section aria-labelledby="attachments-heading" className="mt-16 border-t border-current/20 pt-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="attachments-heading" className="eyebrow">
          Attachments
        </h2>
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-current/50">{pluralise(documents.length, "document")}</p>
      </div>
      <ol className="mt-6 divide-y divide-current/10 border-y border-current/15">
        {documents.map((doc) => {
          const title = doc.label || doc.title || doc.filename;
          return (
            <li key={doc.id} className="py-5">
              <div className="grid grid-cols-[2rem_1fr] gap-x-4 gap-y-4 sm:grid-cols-[2rem_1fr_auto] sm:items-center">
                <KindIcon kind={doc.kind} />
                <div className="min-w-0">
                  <p className="break-words font-display text-xl leading-tight">{title}</p>
                  <p className="mt-1 break-words font-mono text-[0.62rem] uppercase tracking-[0.18em] text-current/55">
                    {doc.filename}
                    <span aria-hidden="true"> · </span>
                    {KIND_LABEL[doc.kind] ?? "File"}
                    {doc.sizeBytes > 0 ? (
                      <>
                        <span aria-hidden="true"> · </span>
                        {formatBytes(doc.sizeBytes)}
                      </>
                    ) : null}
                  </p>
                  {doc.description ? <p className="mt-2 text-sm leading-relaxed text-current/75">{doc.description}</p> : null}
                </div>
                <div className="col-start-2 flex flex-wrap gap-2 sm:col-start-3">
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
                    Open<span className="sr-only"> {title} in a new tab</span>
                  </a>
                  <a href={doc.url} download={doc.filename} className="btn btn-sm btn-ghost">
                    Download<span className="sr-only"> {title}</span>
                  </a>
                </div>
              </div>
              {doc.kind === "pdf" ? <PdfPreview url={doc.url} title={title} /> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Small line-drawn document glyphs. Decorative; the kind is also written out in text. */
function KindIcon({ kind }: { kind: string }) {
  const common = { width: 22, height: 26, viewBox: "0 0 22 26", "aria-hidden": true as const, className: "mt-1 text-current/70" };
  const page = <path d="M3 1.5h10l6 6v17H3z M13 1.5v6h6" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />;
  if (kind === "pdf") {
    return (
      <svg {...common}>
        {page}
        <path d="M6 20.5v-8h2.4c1.5 0 2.4.9 2.4 2.2s-.9 2.2-2.4 2.2H7.4" fill="none" stroke="currentColor" strokeWidth="1.1" />
        <path d="M12.5 12.5h3.5M12.5 16h2.8M12.5 12.5v8" fill="none" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    );
  }
  if (kind === "image") {
    return (
      <svg {...common}>
        {page}
        <path d="M6 20.5l3.5-4.5 2.5 3 2-2.2 2.5 3.7z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
        <circle cx="8" cy="12.5" r="1.3" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      {page}
      <path d="M6.5 13h9M6.5 16.5h9M6.5 20h6" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
