import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { getCurrentAdmin } from "@/lib/auth/session";
import { countAdminUsers } from "@/server/admin-users";
import { LoginForm } from "@/components/admin/LoginForm";
import { Notice } from "@/components/ui/primitives";
import { safeAdminPath } from "../_lib/form";
import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const sp = await searchParams;
  const next = safeAdminPath(Array.isArray(sp.next) ? sp.next[0] : sp.next);

  const admin = await getCurrentAdmin();
  if (admin) redirect(next);

  const adminCount = await countAdminUsers();

  return (
    <div className="relative flex min-h-dvh flex-col grain vignette">
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-[var(--page-x)] py-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="group block leading-none">
            <span className="eyebrow transition-colors group-hover:text-ivory">{siteConfig.author.name}</span>
            <span className="mt-2 block font-display text-2xl uppercase tracking-[0.18em] text-ivory">{siteConfig.name}</span>
          </Link>

          <div className="rule my-8" role="presentation" />

          <p className="eyebrow-muted">Chambers · Sign in</p>
          <h1 className="display-sm mt-3">Counsel may proceed.</h1>

          <div className="mt-8">
            {adminCount === 0 ? (
              <Notice tone="info" className="space-y-3">
                <p className="font-display text-lg text-ivory">No admin account exists yet.</p>
                <p className="text-parchment/85">Create the first one from a terminal in the project folder, then return here:</p>
                <pre className="overflow-x-auto border border-bronze/25 bg-ink/60 p-3 font-mono text-[0.7rem] leading-relaxed text-parchment">
                  {`npm run admin:create -- \\\n  --email you@example.com \\\n  --name "Rohit Pradhan" \\\n  --password "at-least-12-characters-1"`}
                </pre>
                <p className="text-xs text-bone/70">For the live site, prefix the command with your production DATABASE_URL. Running it again with the same email resets the password.</p>
              </Notice>
            ) : (
              <LoginForm action={loginAction} next={next} />
            )}
          </div>

          <p className="mt-10 text-center">
            <Link href="/" className="link-underline font-mono text-[0.66rem] uppercase tracking-[0.2em] text-bone hover:text-ivory">
              Back to the record
            </Link>
          </p>
        </div>
      </div>
      <p className="relative z-10 px-[var(--page-x)] pb-6 text-center font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ash">
        {siteConfig.author.title} · {siteConfig.author.location}
      </p>
    </div>
  );
}
