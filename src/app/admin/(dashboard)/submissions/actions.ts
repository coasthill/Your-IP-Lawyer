"use server";

import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth/guard";
import { deleteSubmission, getSubmission, updateSubmission } from "@/server/submissions";
import { revalidateContent } from "@/server/revalidate";
import type { FormState } from "@/components/admin/form-state";
import { field, isUuid, oneOf, textField } from "../../_lib/form";
import { revalidateAdmin } from "../../_lib/revalidate";

const STATUSES = ["new", "reviewing", "accepted", "declined"] as const;

function done() {
  revalidateContent(["/admin", "/admin/submissions"]);
  revalidateAdmin();
}

export async function reviewSubmissionAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  const submission = isUuid(id) ? await getSubmission(id) : null;
  if (!submission) return { status: "error", message: "That submission no longer exists." };
  const status = oneOf(formData.get("status"), STATUSES, submission.status as (typeof STATUSES)[number]);
  const adminNotes = textField(formData, "adminNotes", 4000);
  await updateSubmission(submission.id, { status, adminNotes });
  done();
  return { status: "success", message: `Saved. Marked as ${status}.` };
}

export async function setSubmissionStatusAction(id: string, status: string): Promise<void> {
  await assertAdmin();
  const submission = isUuid(id) ? await getSubmission(id) : null;
  if (!submission) return;
  await updateSubmission(submission.id, { status: oneOf(status, STATUSES, "new") });
  done();
}

export async function deleteSubmissionAction(id: string): Promise<void> {
  await assertAdmin();
  const submission = isUuid(id) ? await getSubmission(id) : null;
  if (!submission) return;
  await deleteSubmission(submission.id);
  done();
}

export async function deleteSubmissionAndReturnAction(id: string): Promise<void> {
  await deleteSubmissionAction(id);
  redirect("/admin/submissions?deleted=1");
}
