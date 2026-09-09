/** Skeleton shown while the record is fetched. Same rhythm as the real page so nothing jumps. */
export default function BlogLoading() {
  return (
    <div aria-busy="true" aria-label="Loading the blog">
      <section className="frame-lines relative">
        <div className="container-editorial pt-10 pb-10 md:pt-16 md:pb-12">
          <div className="h-3 w-28 bg-lapis/20" />
          <div className="mt-6 h-16 w-48 bg-ink/10 md:h-24 md:w-72" />
          <div className="mt-6 h-5 w-72 max-w-full bg-ink/8" />
          <div className="rule-solid mt-12" role="presentation" />
          <div className="mt-6 flex gap-2 overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-6 w-24 shrink-0 rounded-full border" />
            ))}
          </div>
        </div>
      </section>
      <section>
        <div className="container-editorial pt-8 pb-16 md:pt-12 md:pb-24">
          <div className="border-t pt-5">
            <div className="h-3 w-24 bg-ink/8" />
          </div>
          <div className="plate mt-10 grid overflow-hidden md:grid-cols-12">
            <div className="aspect-[16/10] bg-vellum md:col-span-7 md:aspect-auto md:min-h-[26rem]" />
            <div className="flex flex-col justify-end space-y-4 p-6 sm:p-8 md:col-span-5 md:p-10">
              <div className="h-3 w-24 bg-lapis/20" />
              <div className="h-10 w-full bg-ink/10" />
              <div className="h-10 w-3/4 bg-ink/10" />
              <div className="h-4 w-2/3 bg-ink/8" />
            </div>
          </div>
        </div>
      </section>
      <section>
        <div className="container-editorial pt-12 pb-20 md:pt-16 md:pb-28">
          <div className="h-3 w-24 bg-lapis/20" />
          <div className="mt-4 h-10 w-64 bg-ink/10" />
          <div className="rule-solid my-10" role="presentation" />
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i}>
                <div className="mb-3 h-3 w-12 bg-ink/8" />
                <div className="plate overflow-hidden">
                  <div className="aspect-[4/3] bg-vellum" />
                  <div className="p-5 sm:p-6">
                    <div className="h-3 w-20 bg-lapis/20" />
                    <div className="mt-3 h-6 w-5/6 bg-ink/10" />
                    <div className="mt-3 h-4 w-full bg-ink/8" />
                    <div className="mt-5 h-3 w-2/3 bg-ink/8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
