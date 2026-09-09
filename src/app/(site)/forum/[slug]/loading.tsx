/** Skeleton for a discussion page. Same rhythm as the real page so nothing jumps. */
export default function ThreadLoading() {
  return (
    <div aria-busy="true" aria-label="Loading the discussion">
      <section>
        <div className="container-editorial pt-10 pb-10 md:pt-16 md:pb-12">
          <div className="h-3 w-40 bg-lapis/20" />
          <div className="mt-8 h-10 w-3/4 bg-ink/10 md:h-14" />
          <div className="mt-3 h-10 w-1/2 bg-ink/10 md:h-14" />
          <div className="rule mt-12" role="presentation" />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i}>
                <div className="h-3 w-16 bg-ink/8" />
                <div className="mt-3 h-6 w-28 bg-ink/10" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section>
        <div className="container-prose py-10 md:py-14">
          <div className="plate px-6 py-8 sm:px-10 sm:py-10">
            <div className="h-3 w-32 bg-lapis/20" />
            <div className="mt-8 space-y-3">
              <div className="h-4 w-full bg-ink/10" />
              <div className="h-4 w-11/12 bg-ink/10" />
              <div className="h-4 w-4/5 bg-ink/10" />
              <div className="h-4 w-3/5 bg-ink/10" />
            </div>
          </div>
        </div>
      </section>
      <section className="border-t">
        <div className="container-prose py-20 md:py-28">
          <div className="h-3 w-24 bg-lapis/20" />
          <div className="mt-4 h-10 w-40 bg-ink/10" />
          <div className="mt-10 border-y">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="border-b py-8 last:border-b-0">
                <div className="h-6 w-40 bg-ink/10" />
                <div className="mt-4 h-4 w-full bg-ink/8" />
                <div className="mt-2 h-4 w-2/3 bg-ink/8" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
