import { artAssets, type ArtAsset } from "../art";
import { indiaSvgPath } from "../india-outline";
import { IP_ELEMENTS, SCENES, type Caption } from "../story";
import { cn } from "@/lib/utils";

/**
 * The still homepage — served when the visitor prefers reduced motion (or asks for it with
 * ?render=static). Nothing moves and nothing needs JavaScript: the paintings hang one after the
 * other with the captions of the story laid out as a readable editorial sequence. Each scene hangs
 * the still of its first beat (or that beat's fallback still) — never a frame of a clip.
 */
export function StaticStory() {
  const assets = artAssets();
  const byScene = (id: string) => assets.find((a) => a.entry.scene === id) ?? assets[0];
  const [lawyer, gown, gavel, patent, design, trademark, gi, legal] = SCENES;

  return (
    <div className="relative bg-paper text-ink" data-renderer="static">
      {/* 01 · The lawyer */}
      <section className="surface-lapis relative" aria-labelledby="static-title">
        <div className="container-editorial grid gap-10 pb-16 pt-[calc(var(--header-height)+2.5rem)] md:grid-cols-12 md:items-center md:pb-24 md:pt-[calc(var(--header-height)+3rem)]">
          <div className="md:col-span-5">
            <SceneIndex n="01" label={lawyer.label} />
            <CaptionBlock caption={lawyer.captions[0]} as="h1" id="static-title" />
          </div>
          <figure className="md:col-span-7">
            <Painting asset={byScene("lawyer")} priority />
            <figcaption className="sr-only">{byScene("lawyer").entry.alt}</figcaption>
          </figure>
        </div>
      </section>

      {/* 02 · The gown moves — the five subjects */}
      <section className="container-editorial py-16 md:py-24" aria-labelledby="static-gown">
        <div className="grid gap-10 md:grid-cols-12">
          <figure className="md:col-span-6">
            <Painting asset={byScene("gown")} />
          </figure>
          <div className="md:col-span-6">
            <SceneIndex n="02" label={gown.label} />
            <h2 id="static-gown" className="display-md mt-4">
              Five subjects, one gown.
            </h2>
            <ol className="mt-8 divide-y border-y">
              {IP_ELEMENTS.map((el, i) => (
                <li key={el.key} className="grid grid-cols-[3rem_1fr] gap-4 py-5">
                  <span className="pt-1 font-mono text-[0.62rem] tracking-[0.2em] text-lapis">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="font-display text-2xl">{el.title}</h3>
                    <p className="mt-1 text-sm text-graphite">{el.line}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 03 · The gavel */}
      <section className="surface-lapis" aria-labelledby="static-gavel">
        <div className="container-editorial grid gap-10 py-16 md:grid-cols-12 md:items-center md:py-24">
          <div className="md:col-span-5">
            <SceneIndex n="03" label={gavel.label} />
            <CaptionBlock caption={gavel.captions[0]} id="static-gavel" />
          </div>
          <figure className="md:col-span-7">
            <Painting asset={byScene("gavel")} />
          </figure>
        </div>
      </section>

      {/* 04–06 · The machine, the design, the mark */}
      {(
        [
          ["04", patent, byScene("patent"), "static-patent"],
          ["05", design, byScene("design"), "static-design"],
          ["06", trademark, byScene("trademark"), "static-trademark"],
        ] as const
      ).map(([n, scene, asset, id], i) => (
        <section key={id} className="container-editorial py-16 md:py-24" aria-labelledby={id}>
          <div className="grid gap-10 md:grid-cols-12 md:items-center">
            <figure className={cn("md:col-span-7", i % 2 === 1 && "md:order-2")}>
              <Painting asset={asset} />
            </figure>
            <div className="md:col-span-5">
              <SceneIndex n={n} label={scene.label} />
              <CaptionBlock caption={scene.captions[0]} id={id} />
            </div>
          </div>
        </section>
      ))}

      {/* 07 · Geographical indication — the painting and the map */}
      <section className="container-editorial py-16 md:py-24" aria-labelledby="static-gi">
        <div className="grid gap-10 md:grid-cols-12 md:items-center">
          <figure className="md:col-span-6">
            <Painting asset={byScene("gi")} />
          </figure>
          <div className="md:col-span-6">
            <SceneIndex n="07" label={gi.label} />
            <CaptionBlock caption={gi.captions[0]} id="static-gi" />
            <div className="mt-8 max-w-xs text-lapis">
              <svg viewBox="0 0 1000 1000" className="h-auto w-full" role="img" aria-label="Outline of India as depicted on the Survey of India map">
                <path d={indiaSvgPath(1000, 0.9)} fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-ash">Boundary as per the Survey of India · a conceptual view</p>
            </div>
          </div>
        </div>
      </section>

      {/* 08 · The legal world */}
      <section className="surface-lapis" aria-labelledby="static-legal">
        <div className="container-editorial grid gap-10 py-16 md:grid-cols-12 md:items-center md:py-24">
          <figure className="md:col-span-7">
            <Painting asset={byScene("legal-world")} />
          </figure>
          <div className="md:col-span-5">
            <SceneIndex n="08" label={legal.label} />
            <CaptionBlock caption={legal.captions[0]} id="static-legal" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Painting({ asset, priority }: { asset: ArtAsset; priority?: boolean }) {
  const lapis = asset.entry.tone === "lapis";
  return (
    <div className="relative aspect-[3/2] w-full overflow-hidden border border-current/15 bg-lapis-3">
      {asset.src ? (
        // eslint-disable-next-line @next/next/no-img-element -- static files with known sizes; no optimisation step needed
        <img
          src={asset.src}
          srcSet={asset.srcSmall ? `${asset.srcSmall} 1100w, ${asset.src} 2000w` : undefined}
          sizes="(min-width: 768px) 58vw, 100vw"
          width={asset.width}
          height={asset.height}
          alt={asset.entry.alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className="h-full w-full object-cover"
          style={{ objectPosition: `${asset.focal[0] * 100}% ${asset.focal[1] * 100}%`, backgroundImage: asset.lqip ? `url(${asset.lqip})` : undefined, backgroundSize: "cover" }}
        />
      ) : (
        <div className={cn("h-full w-full", lapis ? "bg-[radial-gradient(70%_60%_at_20%_10%,#4d7ce6,#1b5ad6_50%,#0f2f7c)]" : "bg-[radial-gradient(70%_60%_at_20%_10%,#ffffff,#f5f3ee_50%,#e6e2d9)]")} role="img" aria-label={asset.entry.alt} />
      )}
    </div>
  );
}

function SceneIndex({ n, label }: { n: string; label: string }) {
  return (
    <p className="eyebrow eyebrow-mark">
      {n} · {label}
    </p>
  );
}

function CaptionBlock({ caption, as: Tag = "h2", id }: { caption: Caption; as?: "h1" | "h2"; id: string }) {
  return (
    <div className="mt-4">
      {caption.eyebrow ? <p className="eyebrow-muted mb-3">{caption.eyebrow}</p> : null}
      <Tag id={id} className={Tag === "h1" ? "display-xl" : "display-md"}>
        {caption.title}
      </Tag>
      {caption.body ? <p className="lede mt-5 max-w-md">{caption.body}</p> : null}
    </div>
  );
}
