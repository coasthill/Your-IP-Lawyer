/** Skeleton shown while the cause list is fetched. Same rhythm as the real page so nothing jumps. */
export default function ForumLoading() {
  return (
    <div aria-busy="true" aria-label="Loading the forum">
      <section className="bg-ink">
        <div className="container-editorial pt-10 pb-10 md:pt-16 md:pb-12">
          <div className="h-3 w-28 bg-bronze/20" />
          <div className="mt-6 h-16 w-72 max-w-full bg-ivory/10 md:h-24 md:w-[26rem]" />
          <div className="mt-6 h-5 w-80 max-w-full bg-ivory/8" />
          <div className="rule-solid mt-12" role="presentation" />
          <div className="mt-6 flex gap-2 overflow-hidden">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="h-6 w-24 shrink-0 border border-bronze/15" />
            ))}
          </div>
        </div>
        <div className="container-editorial pt-8 pb-24 md:pt-12 md:pb-32">
          <div className="h-3 w-20 bg-ivory/8" />
          <div className="mt-4 h-10 w-64 bg-ivory/10" />
          <div className="mt-8 border-t border-bronze/15">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="grid gap-4 border-b border-bronze/15 py-6 md:grid-cols-[1fr_8rem]">
                <div>
                  <div className="h-5 w-20 border border-bronze/15" />
                  <div className="mt-3 h-7 w-3/4 bg-ivory/10" />
                  <div className="mt-3 h-3 w-40 bg-ivory/8" />
                </div>
                <div className="space-y-2 md:justify-self-end">
                  <div className="h-3 w-16 bg-ivory/8" />
                  <div className="h-3 w-24 bg-ivory/8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
