import type React from "react";
import { requireAdmin } from "@/lib/auth/guard";
import { countPendingComments } from "@/server/comments";
import { countPendingForum } from "@/server/forum";
import { countNewSubmissions } from "@/server/submissions";
import { AdminShell } from "@/components/admin/AdminShell";
import { logoutAction } from "../login/actions";

export const dynamic = "force-dynamic";

/** Every dashboard page sits inside this guard. Pages also re-check on their own before reading data. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [pendingComments, pendingForum, newSubmissions] = await Promise.all([countPendingComments(), countPendingForum(), countNewSubmissions()]);

  const items = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/posts", label: "Posts" },
    { href: "/admin/comments", label: "Comments", count: pendingComments },
    { href: "/admin/forum", label: "Forum", count: pendingForum.threads + pendingForum.replies },
    { href: "/admin/submissions", label: "Submissions", count: newSubmissions },
    { href: "/admin/documents", label: "Documents" },
    { href: "/admin/categories", label: "Categories" },
    { href: "/admin/users", label: "Users" },
  ];

  return (
    <AdminShell admin={{ name: admin.name }} items={items} logoutAction={logoutAction}>
      {children}
    </AdminShell>
  );
}
