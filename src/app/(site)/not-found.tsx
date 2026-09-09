import { Arrow, ButtonLink } from "@/components/ui/primitives";

/** 404 inside the site chrome (Navigation + Footer). The root not-found.tsx covers everything else. */
export default function SiteNotFound() {
  return (
    <section className="surface-lapis relative frame-lines max-md:before:hidden max-md:after:hidden" aria-labelledby="not-found-title">
      <div className="container-editorial flex min-h-[70vh] flex-col justify-center py-24 md:py-32">
        <p className="eyebrow flex items-center gap-3">
          <span className="reg-mark" aria-hidden="true" />
          404 · Not on the cause list
        </p>
        <h1 id="not-found-title" className="display-lg mt-6 max-w-4xl">
          This page has left the record.
        </h1>
        <p className="lede mt-6 max-w-lg">The matter you are looking for is not listed. It may have been moved, renamed, or never filed in the first place.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/" variant="solid">
            Back to the record
          </ButtonLink>
          <ButtonLink href="/blog">Read the blog</ButtonLink>
          <ButtonLink href="/forum" variant="ghost">
            Join the forum <Arrow />
          </ButtonLink>
        </div>
        <p className="mt-16 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-bone">Proceed to the next matter.</p>
      </div>
    </section>
  );
}
