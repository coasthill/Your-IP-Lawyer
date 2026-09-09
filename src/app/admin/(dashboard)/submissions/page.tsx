import Link from "next/link";
import type { Metadata } from "next";
import { pluralise } from "@/lib/utils";
import { formatBytes } from "@/server/documents";
import { countNewSubmissions, listSubmissions } from "@/server/submissions";
import { ActionRow, DataTable, Td, Th } from "@/components/admin/DataTable";
import { EmptyRecord } from "@/components/admin/EmptyRecord";
import { InlineAction } from "@/components/admin/InlineAction";
import { LinkTabs } from "@/components/admin/LinkTabs";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusChip } from "@/components/admin/StatusChip";
import { Notice } from "@/components/ui/primitives";
import { formatDateTime } from "../../_lib/datetime";
import { param, paramOneOf, type SearchParams } from "../../_lib/params";
import { setSubmissionStatusAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Submissions · Admin" };

const TABS = ["new", "reviewing", "accepted", "declined", "all"] as const;
type Tab = (typeof TABS)[number];
const LABEL: Record<Tab, string> = { new: "New", reviewing: "Reviewing", accepted: "Accepted", declined: "Declined", all: "All" };
const KIND_LABEL: Record<string, string> = { article: "Article", "case-note": "Case note", commentary: "Commentary", other: "Other" };

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const tab = paramOneOf(sp, "status", TABS, "new");
  const deleted = param(sp, "deleted") === "1";

  const [rows, all, fresh] = await Promise.all([listSubmissions(tab === "all" ? undefined : tab), listSubmissions(), countNewSubmissions()]);
  const count = (s: string) => all.filter((x) => x.status === s).length;

  return (
    <div>
      <PageHeader
        eyebrow="Submissions · Guest writing"
        title={fresh > 0 ? `${pluralise(fresh, "new submission")} to read.` : "Submissions on file."}
        lede="Pieces sent in through the submission form. Open one to read the abstract, download the file and record a decision. Authors are not notified automatically — reply from your own inbox."
      />

      {deleted ? (
        <Notice tone="success" className="mb-8">
          The submission was deleted.
        </Notice>
      ) : null}

      <LinkTabs
        label="Submission status"
        active={tab}
        tabs={TABS.map((t) => ({ key: t, label: LABEL[t], href: `/admin/submissions?status=${t}`, count: t === "all" ? all.length : t === "new" ? fresh : count(t) }))}
      />

      {rows.length ? (
        <DataTable caption="Submissions" className="min-w-[56rem]">
          <thead>
            <tr>
              <Th className="w-[36%]">Title</Th>
              <Th>Author</Th>
              <Th>Kind</Th>
              <Th>Status</Th>
              <Th>File</Th>
              <Th>Received</Th>
              <Th className="pr-0 text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="transition-colors hover:bg-ivory/[0.02]">
                <Td>
                  <Link href={`/admin/submissions/${s.id}`} className="font-display text-lg leading-snug text-ivory transition-colors hover:text-bronze-2">
                    {s.title}
                  </Link>
                </Td>
                <Td>
                  <span className="text-parchment">{s.name}</span>
                  {s.affiliation ? <span className="block text-xs text-bone/70">{s.affiliation}</span> : null}
                </Td>
                <Td className="text-bone">{KIND_LABEL[s.kind] ?? s.kind}</Td>
                <Td>
                  <StatusChip status={s.status} />
                </Td>
                <Td className="text-bone">
                  {s.document ? (
                    <a href={s.document.url} className="link-underline" target="_blank" rel="noopener">
                      {s.document.kind.toUpperCase()} · {formatBytes(s.document.sizeBytes)}
                    </a>
                  ) : (
                    <span className="text-ash">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-bone">
                  <time dateTime={s.createdAt.toISOString()}>{formatDateTime(s.createdAt)}</time>
                </Td>
                <Td className="pr-0">
                  <ActionRow className="justify-end">
                    <Link href={`/admin/submissions/${s.id}`} className="btn btn-sm">
                      Open
                    </Link>
                    {s.status === "new" ? (
                      <InlineAction action={setSubmissionStatusAction.bind(null, s.id, "reviewing")} variant="ghost" pendingLabel="Saving…">
                        Start review
                      </InlineAction>
                    ) : null}
                  </ActionRow>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <EmptyRecord
          title={tab === "new" ? "Nothing new to read." : tab === "all" ? "No submissions yet." : `Nothing filed under “${LABEL[tab].toLowerCase()}”.`}
          body={tab === "all" || tab === "new" ? "When a reader submits a piece through the site, it will appear here." : undefined}
        />
      )}
    </div>
  );
}
