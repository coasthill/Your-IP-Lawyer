"use server";

import { assertAdmin } from "@/lib/auth/guard";
import { passwordProblems, verifyPassword } from "@/lib/auth/password";
import { isValidEmail } from "@/lib/security/sanitize";
import { countAdminUsers, deleteAdminUser, listAdminUsers, upsertAdminUser } from "@/server/admin-users";
import type { FormState } from "@/components/admin/form-state";
import { echo, field, isUuid } from "../../_lib/form";
import { revalidateAdmin } from "../../_lib/revalidate";

function password(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v : "";
}

export async function addAdminAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  const values = echo(formData, ["email", "name"]);
  const email = field(formData, "email", 200).toLowerCase();
  const name = field(formData, "name", 80);
  const pass = password(formData, "password");
  const confirm = password(formData, "confirm");

  const fieldErrors: Record<string, string> = {};
  if (!isValidEmail(email)) fieldErrors.email = "Enter a valid email address.";
  if (name.length < 2) fieldErrors.name = "Enter a name.";
  const problems = passwordProblems(pass);
  if (problems.length) fieldErrors.password = `Needs ${problems.join(", ")}.`;
  if (pass !== confirm) fieldErrors.confirm = "The two passwords differ.";
  if (Object.keys(fieldErrors).length) return { status: "error", message: "A few fields need attention.", fieldErrors, values };

  const existing = await listAdminUsers();
  if (existing.some((u) => u.email === email)) {
    return { status: "error", message: "An admin with that email already exists. To reset their password, use the terminal command on the sign-in page.", values };
  }
  const result = await upsertAdminUser({ email, name, password: pass });
  if (!result.ok) return { status: "error", message: result.error, values };
  revalidateAdmin();
  return { status: "success", message: `Added ${name}. They can sign in at /admin/login.` };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await assertAdmin();
  const current = password(formData, "current");
  const next = password(formData, "password");
  const confirm = password(formData, "confirm");

  const fieldErrors: Record<string, string> = {};
  if (!(await verifyPassword(current, admin.passwordHash))) fieldErrors.current = "That is not your current password.";
  const problems = passwordProblems(next);
  if (problems.length) fieldErrors.password = `Needs ${problems.join(", ")}.`;
  if (next !== confirm) fieldErrors.confirm = "The two passwords differ.";
  if (next && next === current) fieldErrors.password = "Choose a password you have not used here before.";
  if (Object.keys(fieldErrors).length) return { status: "error", message: "The password was not changed.", fieldErrors };

  const result = await upsertAdminUser({ email: admin.email, name: admin.name, password: next });
  if (!result.ok) return { status: "error", message: result.error };
  return { status: "success", message: "Password changed. Existing sessions on other devices stay signed in until they expire." };
}

export async function deleteAdminAction(id: string): Promise<void> {
  const admin = await assertAdmin();
  if (!isUuid(id) || id === admin.id) return;
  const users = await listAdminUsers();
  if (!users.some((u) => u.id === id)) return;
  if ((await countAdminUsers()) <= 1) return;
  await deleteAdminUser(id);
  revalidateAdmin();
}
