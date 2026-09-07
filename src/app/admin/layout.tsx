import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/** Admin area shell. Authentication is enforced in the (dashboard) group layout; /admin/login is public. */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-dvh bg-ink text-parchment">{children}</div>;
}
