import Link from "next/link";
import { fontClassNames } from "./fonts";

export default function NotFound() {
  return (
    <main className={`${fontClassNames} container-editorial flex min-h-[70vh] flex-col justify-center`}>
      <p className="eyebrow">404</p>
      <h1 className="display-lg mt-6">This page has left the record.</h1>
      <p className="lede mt-6 max-w-lg">The matter you are looking for is not on the cause list. It may have been moved, renamed or never filed.</p>
      <div className="mt-10">
        <Link href="/" className="btn">Back to the record</Link>
      </div>
    </main>
  );
}
