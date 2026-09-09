import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/PageHeader";
import { PostEditor } from "@/components/admin/PostEditor";
import { loadEditorContext } from "../_lib";
import { previewMarkdownAction, savePostAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New post · Admin" };

export default async function NewPostPage() {
  const ctx = await loadEditorContext();
  return (
    <div>
      <PageHeader
        eyebrow="Posts · New"
        title="A blank page. The argument starts here."
        lede="Write in Markdown; the preview shows the article exactly as it will be typeset. Save as a draft as often as you like — only Published is visible to readers."
        actions={
          <Link href="/admin/posts" className="btn btn-sm btn-ghost">
            Back to the list
          </Link>
        }
      />
      <PostEditor post={null} categories={ctx.categories} images={ctx.images} defaults={ctx.defaults} saveAction={savePostAction} previewAction={previewMarkdownAction} />
    </div>
  );
}
