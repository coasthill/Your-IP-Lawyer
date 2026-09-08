import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { renderPlainText } from "@/lib/security/sanitize";
import { formatBytes } from "@/server/documents";
import { getSubmission } from "@/server/submissions";
import { InlineDelete } from "@/components/admin/InlineAction";
import { PageHeader, SectionHeading } from "@/components/admin/PageHeader";
import { StatusChip } from "@/components/admin/StatusChip";
import { SubmissionReviewForm } from "@/components/admin/SubmissionReviewForm";
import { FileGlyph } from "@/components/admin/Thumb";
import { formatDateTime } from "../../../_lib/datetime";
import { isUuid } from "../../../_lib/form";
import { deleteSubmissionAndReturnAction, reviewSubmissionAction } from "../actions";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = { article: "Article", "case-note": "Case note", commentary: "Commentary", other: "Other" };

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const s = isUuid(id) ? await getSubmission(id) : null;
  return { title: s ? `Submission · ${s.title}` : "Submission not found" };
}

export default async function SubmissionPage({ params }: Props) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const s = await getSubmission(id);
  if (!s) notFound();

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="inline-flex flex-wrap items-center gap-2">
            Submissions · {KIND_LABEL[s.kind] ?? s.kind} <StatusChip status={s.status} />
          </span>
        }
        title={s.title}
        lede={
          <span className="font-mono text-[0.7rem] tracking-[0.08em] text-bone">
            by {s.name}
            {s.affiliation ? `, ${s.affiliation}` : ""} · received {formatDateTime(s.createdAt)}
          </span>
        }
        actions={
          <>
            <Link href="/admin/submissions" className="btn btn-sm btn-ghost">
              Back to the list
            </Link>
            <InlineDelete action={deleteSubmissionAndReturnAction.bind(null, s.id)} question="Delete this submission?">
              Delete submission
            </InlineDelete>
          </>
        }
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <SectionHeading number="01" title="Abstract" />
          <div className="prose-ugc max-w-[68ch] text-parchment/90" dangerouslySetInnerHTML={{ __html: renderPlainText(s.abstract) }} />

          <SectionHeading number="02" title="Attached file" />
          {s.document ? (
            <div className="flex flex-wrap items-center gap-4 border-y border-bronze/20 py-4">
              <FileGlyph label={s.document.kind === "pdf" ? "PDF" : "DOC"} size={44} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg leading-snug text-ivory">{s.document.filename}</p>
                <p className="font-mono text-[0.62rem] tracking-[0.06em] text-ash">
                  {s.document.mimeType} · {formatBytes(s.document.sizeBytes)} · uploaded {formatDateTime(s.document.createdAt)}
                </p>
              </div>
              <a href={s.document.url} className="btn btn-sm" download={s.document.filename}>
                Download
              </a>
              <a href={s.document.url} className="btn btn-sm btn-ghost" target="_blank" rel="noopener">
                Open
              </a>
            </div>
          ) : (
            <p className="border-y border-bronze/20 py-6 text-sm text-bone/70">No file attached. The author sent the abstract only.</p>
          )}
          <p className="mt-3 text-xs text-bone/60">Files from guests are checked by content type and size before storage, but open them with the usual care.</p>
        </div>

        <aside className="space-y-10 lg:border-l lg:border-bronze/15 lg:pl-8">
          <div>
            <p className="eyebrow mb-4">Contact</p>
            <dl className="divide-y divide-bronze/15 border-y border-bronze/20 text-sm">
              <Row label="Author">{s.name}</Row>
              <Row label="Email">
                <a href={`mailto:${s.email}?subject=${encodeURIComponent(`Re: ${s.title}`)}`} className="link-underline break-all">
                  {s.email}
                </a>
              </Row>
              <Row label="Affiliation">{s.affiliation || <span className="text-ash">—</span>}</Row>
              <Row label="Kind">{KIND_LABEL[s.kind] ?? s.kind}</Row>
              <Row label="Received">{formatDateTime(s.createdAt)}</Row>
              <Row label="Last updated">{formatDateTime(s.updatedAt)}</Row>
            </dl>
          </div>

          <div>
            <p className="eyebrow mb-4">Review</p>
            <SubmissionReviewForm action={reviewSubmissionAction.bind(null, s.id)} status={s.status} adminNotes={s.adminNotes ?? ""} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-2.5">
      <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-ash">{label}</dt>
      <dd className="min-w-0 text-parchment">{children}</dd>
    </div>
  );
}
