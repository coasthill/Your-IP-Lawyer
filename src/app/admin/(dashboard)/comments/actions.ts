"use server";

import { assertAdmin } from "@/lib/auth/guard";
import { deleteComment, setCommentStatus } from "@/server/comments";
import { revalidateContent } from "@/server/revalidate";
import { isUuid } from "../../_lib/form";
import { revalidateAdmin } from "../../_lib/revalidate";

type Status = "approved" | "pending" | "hidden" | "spam";

async function change(id: string, status: Status) {
  await assertAdmin();
  if (!isUuid(id)) return;
  await setCommentStatus(id, status);
  revalidateContent(["/admin", "/admin/comments"]);
  revalidateAdmin();
}

export async function approveCommentAction(id: string): Promise<void> {
  await change(id, "approved");
}
export async function hideCommentAction(id: string): Promise<void> {
  await change(id, "hidden");
}
export async function spamCommentAction(id: string): Promise<void> {
  await change(id, "spam");
}
export async function pendCommentAction(id: string): Promise<void> {
  await change(id, "pending");
}
export async function deleteCommentAction(id: string): Promise<void> {
  await assertAdmin();
  if (!isUuid(id)) return;
  await deleteComment(id);
  revalidateContent(["/admin", "/admin/comments"]);
  revalidateAdmin();
}
