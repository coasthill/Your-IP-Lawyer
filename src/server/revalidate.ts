import { revalidatePath } from "next/cache";

/** Call after any content change so public pages re-render with fresh data. */
export function revalidateContent(paths: string[] = []) {
  for (const p of ["/", "/blog", "/forum", "/sitemap.xml", ...paths]) {
    try {
      revalidatePath(p);
    } catch {
      /* ignore outside request scope */
    }
  }
}
