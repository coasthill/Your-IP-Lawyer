/** Skeleton shown while the cause list is fetched. Same rhythm as the real page so nothing jumps. */
export default function ForumLoading() {
  return (
    <div aria-busy="true" aria-label="Loading the forum">
      <section className="surface-lapis">
        <div className="container-editorial pt-10 pb-12 md:pt-16 md:pb-14">
          <div className="h-3 w-28 bg-bronze-2/40" />
          <div className="mt-6 h-16 w-72 max-w-full bg-ivory/15 md:h-24 md:w-[26rem]" />
          <div className="mt-6 h-5 w-80 max-w-full bg-ivory/10" />
          <div className="mt-8 h-8 w-40 rounded-full bg-ivory/80" />
        </div>
      </section>
      <section>
        <div className="container-editorial pt-8 pb-24 md:pt-10 md:pb-32">
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="h-6 w-24 shrink-0 rounded-full border" />
            ))}
          </div>
          <div className="rule-solid mt-8" role="presentation" />
          <div className="mt-10 h-3 w-20 bg-ink/8" />
          <div className="mt-4 h-10 w-64 bg-ink/10" />
          <div className="mt-8 border-t">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="grid gap-4 border-b py-6 md:grid-cols-[1fr_8rem]">
                <div>
                  <div className="h-5 w-20 rounded-full border" />
                  <div className="mt-3 h-7 w-3/4 bg-ink/10" />
                  <div className="mt-3 h-3 w-40 bg-ink/8" />
                </div>
                <div className="space-y-2 md:justify-self-end">
                  <div className="h-3 w-16 bg-ink/8" />
                  <div className="h-3 w-24 bg-ink/8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
