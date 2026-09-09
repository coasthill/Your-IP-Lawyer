import type { Metadata } from "next";
import { LIMITS } from "@/lib/storage/validate";
import { pluralise } from "@/lib/utils";
import { formatBytes, listDocuments } from "@/server/documents";
import { CopyButton } from "@/components/admin/CopyButton";
import { ActionRow, DataTable, Td, Th } from "@/components/admin/DataTable";
import { DocumentUploadForm } from "@/components/admin/DocumentUploadForm";
import { EmptyRecord } from "@/components/admin/EmptyRecord";
import { FormField } from "@/components/admin/FormBits";
import { InlineDelete } from "@/components/admin/InlineAction";
import { LinkTabs } from "@/components/admin/LinkTabs";
import { PageHeader, SectionHeading } from "@/components/admin/PageHeader";
import { FlagChip } from "@/components/admin/StatusChip";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { FileGlyph, Thumb } from "@/components/admin/Thumb";
import { formatDateTime } from "../../_lib/datetime";
import { paramOneOf, type SearchParams } from "../../_lib/params";
import { deleteDocumentAction, updateDocumentAction, uploadDocumentAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Documents · Admin" };

const KINDS = ["all", "image", "pdf", "file"] as const;
type Kind = (typeof KINDS)[number];
const KIND_LABEL: Record<Kind, string> = { all: "All", image: "Images", pdf: "PDFs", file: "Word files" };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const kind = paramOneOf(sp, "kind", KINDS, "all");
  const all = await listDocuments();
  const docs = kind === "all" ? all : all.filter((d) => d.kind === kind);
  const count = (k: string) => all.filter((d) => d.kind === k).length;
  const total = all.reduce((n, d) => n + d.sizeBytes, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Documents · Library"
        title="Images, PDFs and files."
        lede={all.length ? `${pluralise(all.length, "file")} on file, ${formatBytes(total)} in storage. Feature images for articles, attachments for readers, and anything sent in with a submission.` : "Nothing uploaded yet. Feature images and attachments for articles start here."}
      />

      <section id="upload" className="scroll-mt-20" aria-labelledby="upload-heading">
        <SectionHeading number="01" title={<span id="upload-heading">Upload</span>} aside="Stored outside the repository" />
        <div className="max-w-3xl">
          <DocumentUploadForm action={uploadDocumentAction} limits={{ imageMb: Math.round(LIMITS.image / 1024 / 1024), docMb: Math.round(LIMITS.pdf / 1024 / 1024) }} />
        </div>
      </section>

      <section className="mt-16" aria-labelledby="library-heading">
        <SectionHeading number="02" title={<span id="library-heading">Library</span>} aside={`${docs.length} shown`} />
        <LinkTabs label="File type" active={kind} tabs={KINDS.map((k) => ({ key: k, label: KIND_LABEL[k], href: `/admin/documents?kind=${k}#library-heading`, count: k === "all" ? all.length : count(k) }))} />

        {docs.length ? (
          <DataTable caption="Uploaded files" className="min-w-[60rem]">
            <thead>
              <tr>
                <Th className="w-16">
                  <span className="sr-only">Preview</span>
                </Th>
                <Th className="w-[32%]">File</Th>
                <Th>Kind</Th>
                <Th>Size</Th>
                <Th>Uploaded</Th>
                <Th>Address</Th>
                <Th className="pr-0 text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="align-top transition-colors hover:bg-lapis-tint/60">
                  <Td>{d.kind === "image" ? <Thumb src={d.url} alt={d.altText || d.title || d.filename} size={48} /> : <FileGlyph label={d.kind === "pdf" ? "PDF" : "DOC"} size={48} />}</Td>
                  <Td>
                    <p className="font-display text-lg leading-snug text-ink">{d.title || d.filename}</p>
                    <p className="font-mono text-[0.62rem] tracking-[0.06em] text-ash">
                      {d.filename}
                      {d.width && d.height ? ` · ${d.width}×${d.height}` : ""}
                    </p>
                    {d.altText ? <p className="mt-1 text-xs text-slate">Alt: {d.altText}</p> : d.kind === "image" ? <p className="mt-1 text-xs text-seal">No alt text yet.</p> : null}
                    {d.description ? <p className="mt-1 text-xs text-slate">{d.description}</p> : null}
                  </Td>
                  <Td>
                    <FlagChip>{d.kind}</FlagChip>
                  </Td>
                  <Td className="whitespace-nowrap text-graphite">{formatBytes(d.sizeBytes)}</Td>
                  <Td className="whitespace-nowrap text-graphite">
                    <time dateTime={d.createdAt.toISOString()}>{formatDateTime(d.createdAt)}</time>
                  </Td>
                  <Td>
                    <ActionRow>
                      <CopyButton value={d.url} />
                      <a href={d.url} className="btn btn-sm btn-ghost" target="_blank" rel="noopener">
                        Open
                      </a>
                    </ActionRow>
                  </Td>
                  <Td className="pr-0">
                    <ActionRow className="justify-end">
                      <details className="group relative">
                        <summary className="btn btn-sm cursor-pointer list-none [&::-webkit-details-marker]:hidden">Edit</summary>
                        <form action={updateDocumentAction.bind(null, d.id)} className="plate mt-3 w-72 space-y-3 p-4 text-left">
                          <FormField label="Title" htmlFor={`doc-${d.id}-title`}>
                            <input id={`doc-${d.id}-title`} name="title" defaultValue={d.title ?? ""} maxLength={200} />
                          </FormField>
                          <FormField label="Alt text" htmlFor={`doc-${d.id}-alt`} hint={d.kind === "image" ? "Read aloud to readers who cannot see the image." : "Only used for images."}>
                            <input id={`doc-${d.id}-alt`} name="altText" defaultValue={d.altText ?? ""} maxLength={300} />
                          </FormField>
                          <FormField label="Description" htmlFor={`doc-${d.id}-desc`}>
                            <input id={`doc-${d.id}-desc`} name="description" defaultValue={d.description ?? ""} maxLength={500} />
                          </FormField>
                          <SubmitButton variant="solid" pendingLabel="Saving…">
                            Save
                          </SubmitButton>
                        </form>
                      </details>
                      <InlineDelete action={deleteDocumentAction.bind(null, d.id)} question="Delete the file for good?" />
                    </ActionRow>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyRecord title={kind === "all" ? "The library is empty." : `No ${KIND_LABEL[kind].toLowerCase()} yet.`} body="Upload a feature image or a PDF above. Files attached to articles or submissions also appear here." />
        )}
        <p className="mt-4 text-xs text-ash">Deleting a file removes it from storage. Articles that used it as a feature image lose the image; attachments and submission files are unlinked.</p>
      </section>
    </div>
  );
}
