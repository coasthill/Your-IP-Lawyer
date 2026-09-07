import { SCENES } from "../story";

/** PLACEHOLDER — replaced by the static (reduced-motion / no-JS) composition. */
export function StaticStory() {
  return (
    <div className="container-editorial py-32">
      {SCENES.flatMap((s) => s.captions).map((c, i) => (
        <section key={i} className="py-10">
          {c.eyebrow ? <p className="eyebrow">{c.eyebrow}</p> : null}
          {i === 0 ? <h1 className="display-xl mt-4">{c.title}</h1> : <h2 className="display-md mt-4">{c.title}</h2>}
          {c.body ? <p className="lede mt-4 max-w-xl">{c.body}</p> : null}
        </section>
      ))}
    </div>
  );
}
