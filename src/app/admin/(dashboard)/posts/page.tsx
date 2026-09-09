import Link from "next/link";
import type { Metadata } from "next";
import { timeAgo } from "@/lib/utils";
import { listPostsForAdmin } from "@/server/posts";
import { ActionRow, DataTable, Td, Th } from "@/components/admin/DataTable";
import { EmptyRecord } from "@/components/admin/EmptyRecord";
import { InlineAction, InlineDelete } from "@/components/admin/InlineAction";
import { PageHeader } from "@/components/admin/PageHeader";
import { FlagChip, StatusChip } from "@/components/admin/StatusChip";
import { Notice } from "@/components/ui/primitives";
import { formatDateTime, isInFuture } from "../../_lib/datetime";
import { param, type SearchParams } from "../../_lib/params";
import { deletePostAction, publishPostAction, setFeaturedAction, unpublishPostAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Posts · Admin" };

export default async function PostsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const deleted = param(sp, "deleted") === "1";
  const posts = await listPostsForAdmin();
  const published = posts.filter((p) => p.status === "published").length;

  return (
    <div>
      <PageHeader
        eyebrow="Posts · The publication"
        title="Articles and case notes."
        lede={posts.length ? `${published} published, ${posts.length - published} in draft. Newest edits first.` : "Nothing here yet. Start the argument."}
        actions={
          <Link href="/admin/posts/new" className="btn btn-solid btn-sm">
            New post
          </Link>
        }
      />

      {deleted ? (
        <Notice tone="success" className="mb-8">
          The article was deleted. Struck from the record.
        </Notice>
      ) : null}

      {posts.length ? (
        <DataTable caption="All articles, newest edits first" className="min-w-[64rem]">
          <thead>
            <tr>
              <Th className="w-[34%]">Title</Th>
              <Th>Status</Th>
              <Th>Category</Th>
              <Th>Published</Th>
              <Th>Flags</Th>
              <Th>Updated</Th>
              <Th className="pr-0 text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => {
              const scheduled = post.status === "published" && isInFuture(post.publishedAt);
              return (
                <tr key={post.id} className="transition-colors hover:bg-ivory/[0.02]">
                  <Td>
                    <Link href={`/admin/posts/${post.id}`} className="font-display text-lg leading-snug text-ivory transition-colors hover:text-bronze-2">
                      {post.title}
                    </Link>
                    <p className="mt-1 font-mono text-[0.62rem] tracking-[0.06em] text-ash">
                      /blog/{post.slug} · {post.readingMinutes} min
                    </p>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      <StatusChip status={post.status} />
                      {scheduled ? <FlagChip>Scheduled</FlagChip> : null}
                    </div>
                  </Td>
                  <Td className="text-bone">{post.category?.name ?? <span className="text-ash">—</span>}</Td>
                  <Td className="whitespace-nowrap text-bone">
                    {post.publishedAt ? <time dateTime={post.publishedAt.toISOString()}>{formatDateTime(post.publishedAt)}</time> : <span className="text-ash">—</span>}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      {post.featured ? <FlagChip tone="bronze">Featured</FlagChip> : null}
                      {post.isDemo ? <FlagChip tone="seal">Demo</FlagChip> : null}
                      {!post.featured && !post.isDemo ? <span className="text-ash">—</span> : null}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap text-bone">
                    <time dateTime={post.updatedAt.toISOString()} title={formatDateTime(post.updatedAt)}>
                      {timeAgo(post.updatedAt)}
                    </time>
                  </Td>
                  <Td className="pr-0">
                    <ActionRow className="justify-end">
                      <Link href={`/admin/posts/${post.id}`} className="btn btn-sm">
                        Edit
                      </Link>
                      {post.status === "published" ? (
                        <InlineAction action={unpublishPostAction.bind(null, post.id)} pendingLabel="Withdrawing…">
                          Unpublish
                        </InlineAction>
                      ) : (
                        <InlineAction action={publishPostAction.bind(null, post.id)} variant="solid" pendingLabel="Publishing…">
                          Publish
                        </InlineAction>
                      )}
                      <InlineAction action={setFeaturedAction.bind(null, post.id, !post.featured)} variant="ghost" pendingLabel="Saving…" title={post.featured ? "Remove from the lead position" : "Make this the lead article"}>
                        {post.featured ? "Unfeature" : "Feature"}
                      </InlineAction>
                      <InlineDelete action={deletePostAction.bind(null, post.id)} question="Delete the article and its comments?" />
                    </ActionRow>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ) : (
        <EmptyRecord
          title="Nothing here yet. Start the argument."
          body="The first article sets the tone for the whole publication. It does not have to be long."
          action={
            <Link href="/admin/posts/new" className="btn btn-solid btn-sm">
              Write the first post
            </Link>
          }
        />
      )}
    </div>
  );
}
