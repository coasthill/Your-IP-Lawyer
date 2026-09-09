import Link from "next/link";
import { Arrow } from "@/components/ui/primitives";

export function Pagination({ basePath, page, hasNext }: { basePath: string; page: number; hasNext: boolean }) {
  if (page <= 1 && !hasNext) return null;
  const hrefFor = (p: number) => (p <= 1 ? basePath : `${basePath}?page=${p}`);
  return (
    <nav aria-label="Pagination" className="mt-16 flex items-center justify-between gap-4 border-t pt-8">
      <div>
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} rel="prev" className="btn btn-sm">
            <Arrow direction="left" /> Newer
          </Link>
        ) : null}
      </div>
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-ash">Page {page}</p>
      <div>
        {hasNext ? (
          <Link href={hrefFor(page + 1)} rel="next" className="btn btn-sm">
            Older <Arrow />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
