/** Skeleton for an article while it is fetched. */
export default function ArticleLoading() {
  return (
    <div aria-busy="true" aria-label="Loading the article">
      <section className="frame-lines relative">
        <div className="container-editorial pt-10 pb-14 md:pt-16 md:pb-20">
          <div className="h-3 w-40 bg-lapis/20" />
          <div className="mt-8 h-12 w-full max-w-4xl bg-ink/10 md:h-16" />
          <div className="mt-3 h-12 w-2/3 max-w-2xl bg-ink/10 md:h-16" />
          <div className="mt-8 h-6 w-full max-w-3xl bg-ink/8" />
          <div className="mt-2 h-6 w-3/4 max-w-2xl bg-ink/8" />
          <div className="rule mt-12" role="presentation" />
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i}>
                <div className="h-3 w-20 bg-ink/8" />
                <div className="mt-3 h-6 w-40 bg-ink/10" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section>
        <div className="container-prose py-16 md:py-24">
          <div className="space-y-4">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="h-4 bg-ink/10" style={{ width: `${88 - ((i * 13) % 30)}%` }} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
