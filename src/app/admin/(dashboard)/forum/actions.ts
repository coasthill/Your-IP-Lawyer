"use server";

import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth/guard";
import { cleanLine, cleanText } from "@/lib/security/sanitize";
import { createThreadAsAdmin, deleteReply, deleteThread, listOpenReports, resolveReport, setReplyStatus, setThreadFlags, setThreadStatus } from "@/server/forum";
import { revalidateContent } from "@/server/revalidate";
import { listCategories } from "@/server/taxonomy";
import type { FormState } from "@/components/admin/form-state";
import { echo, field, flag, isUuid, textField } from "../../_lib/form";
import { revalidateAdmin } from "../../_lib/revalidate";

type Status = "approved" | "pending" | "hidden" | "spam";

function done(extra: string[] = []) {
  revalidateContent(["/admin", "/admin/forum", ...extra]);
  revalidateAdmin();
}

/* ---------------- Threads ---------------- */

async function threadStatus(id: string, status: Status) {
  await assertAdmin();
  if (!isUuid(id)) return;
  await setThreadStatus(id, status);
  done();
}
export async function approveThreadAction(id: string): Promise<void> {
  await threadStatus(id, "approved");
}
export async function hideThreadAction(id: string): Promise<void> {
  await threadStatus(id, "hidden");
}
export async function spamThreadAction(id: string): Promise<void> {
  await threadStatus(id, "spam");
}
export async function pendThreadAction(id: string): Promise<void> {
  await threadStatus(id, "pending");
}
export async function deleteThreadAction(id: string): Promise<void> {
  await assertAdmin();
  if (!isUuid(id)) return;
  await deleteThread(id);
  done();
}
export async function pinThreadAction(id: string, pinned: boolean): Promise<void> {
  await assertAdmin();
  if (!isUuid(id)) return;
  await setThreadFlags(id, { pinned: Boolean(pinned) });
  done();
}
export async function lockThreadAction(id: string, locked: boolean): Promise<void> {
  await assertAdmin();
  if (!isUuid(id)) return;
  await setThreadFlags(id, { locked: Boolean(locked) });
  done();
}

/* ---------------- Replies ---------------- */

async function replyStatus(id: string, status: Status) {
  await assertAdmin();
  if (!isUuid(id)) return;
  await setReplyStatus(id, status);
  done();
}
export async function approveReplyAction(id: string): Promise<void> {
  await replyStatus(id, "approved");
}
export async function hideReplyAction(id: string): Promise<void> {
  await replyStatus(id, "hidden");
}
export async function spamReplyAction(id: string): Promise<void> {
  await replyStatus(id, "spam");
}
export async function pendReplyAction(id: string): Promise<void> {
  await replyStatus(id, "pending");
}
export async function deleteReplyAction(id: string): Promise<void> {
  await assertAdmin();
  if (!isUuid(id)) return;
  await deleteReply(id);
  done();
}

/* ---------------- Reports ---------------- */

export async function resolveReportAction(id: string): Promise<void> {
  await assertAdmin();
  if (!isUuid(id)) return;
  const open = await listOpenReports();
  if (!open.some((r) => r.id === id)) return;
  await resolveReport(id);
  done();
}

/* ---------------- New discussion (by the admin) ---------------- */

const NEW_THREAD_FIELDS = ["title", "body", "categoryId", "tags", "authorName", "pinned"];

export async function createThreadAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await assertAdmin();
  const values = echo(formData, NEW_THREAD_FIELDS);
  const title = cleanLine(field(formData, "title", 140), 140);
  const body = cleanText(textField(formData, "body", 8000), 8000);
  const authorName = cleanLine(field(formData, "authorName", 60), 60) || admin.name;
  const tags = field(formData, "tags", 400);
  const pinned = flag(formData, "pinned");
  const categoryRaw = field(formData, "categoryId", 64);

  const fieldErrors: Record<string, string> = {};
  if (title.length < 8) fieldErrors.title = "Give the discussion a title of at least 8 characters.";
  if (body.length < 20) fieldErrors.body = "Say a little more — at least 20 characters.";

  let categoryId: string | null = null;
  if (categoryRaw) {
    const cats = await listCategories("forum");
    const cat = cats.find((c) => c.id === categoryRaw);
    if (!cat) fieldErrors.categoryId = "Choose a forum category from the list.";
    else categoryId = cat.id;
  }
  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "A few fields need attention.", fieldErrors, values };
  }

  const thread = await createThreadAsAdmin({ title, body, categoryId, tags: tags.split(",").map((t) => t.trim()).filter(Boolean), authorName, pinned });
  done([`/forum/${thread.slug}`]);
  redirect(`/admin/forum?view=threads&status=approved&created=${encodeURIComponent(thread.slug)}`);
}
