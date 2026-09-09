"use server";

import { assertAdmin } from "@/lib/auth/guard";
import { revalidateContent } from "@/server/revalidate";
import { deleteCategory, ensureCategory, getCategoryBySlug, listCategories, updateCategory } from "@/server/taxonomy";
import { slugify } from "@/lib/utils";
import type { FormState } from "@/components/admin/form-state";
import { echo, field, isUuid, oneOf } from "../../_lib/form";
import { revalidateAdmin } from "../../_lib/revalidate";

const SCOPES = ["blog", "forum", "both"] as const;

function done() {
  revalidateContent(["/admin", "/admin/categories"]);
  revalidateAdmin();
}

export async function addCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  const values = echo(formData, ["name", "description", "scope"]);
  const name = field(formData, "name", 80);
  const scope = oneOf(formData.get("scope"), SCOPES, "both");
  const description = field(formData, "description", 300);
  if (name.length < 2) return { status: "error", message: "Give the category a name.", fieldErrors: { name: "At least 2 characters." }, values };

  const slug = slugify(name);
  if (await getCategoryBySlug(slug)) return { status: "error", message: `A category with the address “${slug}” already exists.`, values };

  const cat = await ensureCategory(name, scope);
  if (description) await updateCategory(cat.id, { description });
  done();
  return { status: "success", message: `Added “${cat.name}”.` };
}

export async function updateCategoryAction(id: string, formData: FormData): Promise<void> {
  await assertAdmin();
  if (!isUuid(id)) return;
  const cats = await listCategories();
  const cat = cats.find((c) => c.id === id);
  if (!cat) return;
  const name = field(formData, "name", 80) || cat.name;
  const description = field(formData, "description", 300);
  const scope = oneOf(formData.get("scope"), SCOPES, cat.scope as (typeof SCOPES)[number]);
  const sortRaw = Number.parseInt(field(formData, "sortOrder", 6), 10);
  const sortOrder = Number.isFinite(sortRaw) ? Math.max(-999, Math.min(999, sortRaw)) : cat.sortOrder;
  await updateCategory(cat.id, { name, description: description || null, scope, sortOrder });
  done();
}

export async function deleteCategoryAction(id: string): Promise<void> {
  await assertAdmin();
  if (!isUuid(id)) return;
  const cats = await listCategories();
  if (!cats.some((c) => c.id === id)) return;
  await deleteCategory(id);
  done();
}
