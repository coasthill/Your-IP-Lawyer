/** Skeleton shown while the record is fetched. Same rhythm as the real page so nothing jumps. */
export default function BlogLoading() {
  return (
    <div aria-busy="true" aria-label="Loading the blog">
      <section className="bg-ink">
        <div className="container-editorial pt-10 pb-10 md:pt-16 md:pb-12">
          <div className="h-3 w-28 bg-bronze/20" />
          <div className="mt-6 h-16 w-48 bg-ivory/10 md:h-24 md:w-72" />
          <div className="mt-6 h-5 w-72 max-w-full bg-ivory/8" />
          <div className="rule-solid mt-12" role="presentation" />
          <div className="mt-6 flex gap-2 overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-6 w-24 shrink-0 border border-bronze/15" />
            ))}
          </div>
        </div>
        <div className="container-editorial pb-20 md:pb-28">
          <div className="border-t border-bronze/20 pt-5">
            <div className="h-3 w-24 bg-ivory/8" />
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-12 md:items-end">
            <div className="aspect-[16/10] bg-charcoal md:col-span-7" />
            <div className="space-y-4 md:col-span-5">
              <div className="h-3 w-24 bg-bronze/20" />
              <div className="h-10 w-full bg-ivory/10" />
              <div className="h-10 w-3/4 bg-ivory/10" />
              <div className="h-4 w-2/3 bg-ivory/8" />
            </div>
          </div>
        </div>
      </section>
      <section className="paper">
        <div className="container-editorial py-20 md:py-28">
          <div className="h-3 w-24 bg-ink/15" />
          <div className="mt-4 h-10 w-64 bg-ink/10" />
          <div className="rule-solid my-10" role="presentation" />
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="border-t border-ink/20 pt-5">
                <div className="aspect-[4/3] bg-ink/10" />
                <div className="mt-5 h-3 w-20 bg-ink/15" />
                <div className="mt-3 h-6 w-5/6 bg-ink/10" />
                <div className="mt-3 h-4 w-full bg-ink/8" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
