import { redirect } from "next/navigation";
import { getCurrentAdmin } from "./session";

/** Use at the top of admin pages. Redirects to the login page when not authenticated. */
export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** For server actions: throws instead of redirecting so the caller can return an error state. */
export async function assertAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("Not authorised");
  return admin;
}
