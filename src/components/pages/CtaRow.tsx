import { Arrow, ButtonLink } from "@/components/ui/primitives";

/** The three doors out of a static page: read, argue, write. */
export function CtaRow({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/blog" variant="solid">
          Read the blog
        </ButtonLink>
        <ButtonLink href="/forum">Join the forum</ButtonLink>
        <ButtonLink href="/submission-guidelines" variant="ghost">
          Write for us <Arrow />
        </ButtonLink>
      </div>
    </div>
  );
}
