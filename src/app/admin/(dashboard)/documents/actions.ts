"use server";

import { assertAdmin } from "@/lib/auth/guard";
import { deleteDocument, getDocument, storeUpload, updateDocumentMeta } from "@/server/documents";
import { revalidateContent } from "@/server/revalidate";
import type { FormState } from "@/components/admin/form-state";
import { echo, errorMessage, field, fileField, isUuid } from "../../_lib/form";
import { revalidateAdmin } from "../../_lib/revalidate";

function done() {
  revalidateContent(["/admin", "/admin/documents"]);
  revalidateAdmin();
}

const UPLOAD_FIELDS = ["title", "description", "altText"];

export async function uploadDocumentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await assertAdmin();
  const values = echo(formData, UPLOAD_FIELDS);
  const file = fileField(formData, "file");
  if (!file) return { status: "error", message: "Choose a file to upload.", fieldErrors: { file: "Required." }, values };

  let stored: Awaited<ReturnType<typeof storeUpload>>;
  try {
    stored = await storeUpload(file, ["image", "pdf", "file"], {
      uploadedBy: admin.id,
      title: field(formData, "title", 200) || null,
      description: field(formData, "description", 500) || null,
      altText: field(formData, "altText", 300) || null,
    });
  } catch (err) {
    return { status: "error", message: `Upload failed: ${errorMessage(err)}`, values };
  }
  if (!stored.ok) return { status: "error", message: stored.error, values };
  done();
  return { status: "success", message: `Uploaded ${stored.document.filename}. It is now in the library below.` };
}

export async function updateDocumentAction(id: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const doc = isUuid(id) ? await getDocument(id) : null;
  if (!doc) return;
  await updateDocumentMeta(doc.id, {
    title: field(formData, "title", 200) || null,
    description: field(formData, "description", 500) || null,
    altText: field(formData, "altText", 300) || null,
  });
  done();
}

export async function deleteDocumentAction(id: string): Promise<void> {
  await assertAdmin();
  const doc = isUuid(id) ? await getDocument(id) : null;
  if (!doc) return;
  await deleteDocument(doc.id);
  done();
}
