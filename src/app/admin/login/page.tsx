import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { getCurrentAdmin } from "@/lib/auth/session";
import { countAdminUsers } from "@/server/admin-users";
import { LoginForm } from "@/components/admin/LoginForm";
import { FirstAdminForm } from "@/components/admin/FirstAdminForm";
import { Notice } from "@/components/ui/primitives";
import { safeAdminPath } from "../_lib/form";
import { createFirstAdminAction, loginAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const sp = await searchParams;
  const next = safeAdminPath(Array.isArray(sp.next) ? sp.next[0] : sp.next);

  const admin = await getCurrentAdmin();
  if (admin) redirect(next);

  const adminCount = await countAdminUsers();

  /*
   * The lapis wall is painted with `bg-lapis` rather than `.surface-lapis` so that the ivory
   * plate below keeps the paper rules for its inputs, labels and buttons; the few elements on
   * the blue itself carry their light colours explicitly.
   */
  return (
    <div className="relative flex min-h-dvh flex-col bg-lapis text-parchment frame-lines max-md:before:hidden max-md:after:hidden [--hairline:rgba(251,250,247,0.22)]">
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-[var(--page-x)] py-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="group block leading-none focus-visible:outline-bronze-2">
            <span className="eyebrow text-bronze-2 transition-colors group-hover:text-ivory">{siteConfig.author.name}</span>
            <span className="mt-2 block font-display text-2xl uppercase tracking-[0.18em] text-ivory">{siteConfig.name}</span>
          </Link>

          <div className="rule my-8" role="presentation" />

          <p className="eyebrow-muted flex items-center gap-3 text-bone">
            <span className="reg-mark" aria-hidden="true" />
            Chambers · Sign in
          </p>
          <h1 className="display-sm mt-3 text-ivory">Counsel may proceed.</h1>

          <div className="plate paper mt-8 px-6 py-8 sm:px-8">
            {adminCount === 0 ? (
              <div className="space-y-6">
                <Notice tone="info" className="space-y-2">
                  <p className="font-display text-lg text-ink">No admin account exists yet.</p>
                  <p className="text-graphite">Create the first one below. This form disappears as soon as an account exists.</p>
                </Notice>
                <FirstAdminForm action={createFirstAdminAction} />
                <p className="text-xs text-slate">
                  Prefer the terminal? Run <code className="font-mono">npm run admin:create -- --email you@example.com --name &quot;Your Name&quot; --password &quot;…&quot;</code> in the project folder.
                </p>
              </div>
            ) : (
              <LoginForm action={loginAction} next={next} />
            )}
          </div>

          <p className="mt-10 text-center">
            <Link href="/" className="link-underline font-mono text-[0.66rem] uppercase tracking-[0.2em] text-bone hover:text-ivory focus-visible:outline-bronze-2">
              Back to the record
            </Link>
          </p>
        </div>
      </div>
      <p className="relative z-10 px-[var(--page-x)] pb-6 text-center font-mono text-[0.6rem] uppercase tracking-[0.2em] text-bone/70">
        {siteConfig.author.title} · {siteConfig.author.location}
      </p>
    </div>
  );
}
