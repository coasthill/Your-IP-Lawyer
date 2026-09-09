import type { PostWithMeta } from "@/server/posts";
import { Arrow, ButtonLink } from "@/components/ui/primitives";
import { PostCard } from "./PostCard";

/** "Next issue." — related reading after an article. */
export function RelatedPosts({ posts }: { posts: PostWithMeta[] }) {
  if (!posts.length) return null;
  return (
    <section className="relative border-t border-bronze/15 bg-ink" aria-labelledby="related-heading">
      <div className="container-editorial py-20 md:py-28">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="eyebrow">Related reading</p>
            <h2 id="related-heading" className="display-md mt-3">
              Next issue.
            </h2>
            <p className="mt-4 max-w-xs text-sm text-bone">More from the record, filed nearby.</p>
          </div>
          <div className="md:col-span-8">
            <div className="border-b border-bronze/15">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} variant="compact" />
              ))}
            </div>
            <div className="mt-8">
              <ButtonLink href="/blog" size="sm">
                Back to the record <Arrow />
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
