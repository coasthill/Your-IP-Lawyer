"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-2xl py-10">
      <p className="eyebrow">Adjourned</p>
      <h1 className="display-md mt-4">Something went wrong on this page.</h1>
      <p className="lede mt-5 opacity-85">
        The action could not be completed. If you have been away for a while, your session may have expired — sign in again and the record will be exactly where you left it.
      </p>
      {error.digest ? <p className="mt-4 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-ash">Reference {error.digest}</p> : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" className="btn btn-solid" onClick={() => retry()}>
          Try again
        </button>
        <Link href="/admin/login" className="btn">
          Sign in again
        </Link>
        <Link href="/admin" className="btn btn-ghost">
          Back to the overview
        </Link>
      </div>
    </div>
  );
}
