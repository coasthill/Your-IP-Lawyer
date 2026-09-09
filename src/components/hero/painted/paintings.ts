"use client";

import { artAssets, placeholderCanvas, type ArtAsset } from "../art";

/**
 * Loads the paintings progressively. Each entry starts as the tiny blurred placeholder (or a painted
 * stand-in when no artwork exists yet), then swaps to the real file when it arrives. The first
 * painting is fetched first; the rest load in story order after it.
 */
export type Painting = {
  asset: ArtAsset;
  /** Whatever is currently drawable: LQIP, placeholder or the full image. */
  source: TexImageSource;
  /** Pixel size of `source`'s aspect reference (the real painting's size, so cropping is stable). */
  width: number;
  height: number;
  /** Focal point in texture space (y up). */
  focal: [number, number];
  loaded: boolean;
  version: number;
};

export type PaintingSet = {
  paintings: Painting[];
  /** Resolves when the first painting is fully loaded (or after `firstTimeout` ms, whichever is first). */
  first: Promise<void>;
  cancel: () => void;
};

function decode(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

export function loadPaintings(opts: { small: boolean; firstTimeout?: number; onUpdate?: (index: number) => void }): PaintingSet {
  const assets = artAssets();
  let cancelled = false;
  const paintings: Painting[] = assets.map((asset) => ({
    asset,
    source: placeholderCanvas(asset.entry, 96, 64),
    width: asset.width,
    height: asset.height,
    focal: [asset.focal[0], 1 - asset.focal[1]],
    loaded: false,
    version: 0,
  }));

  const swap = (i: number, source: TexImageSource, loaded: boolean) => {
    if (cancelled) return;
    paintings[i].source = source;
    paintings[i].loaded = loaded;
    paintings[i].version++;
    opts.onUpdate?.(i);
  };

  const loadOne = async (i: number) => {
    const a = assets[i];
    if (!a.src) return;
    if (a.lqip) {
      try {
        swap(i, await decode(a.lqip), false);
      } catch {
        /* keep the placeholder */
      }
    }
    try {
      const img = await decode(opts.small && a.srcSmall ? a.srcSmall : a.src);
      swap(i, img, true);
    } catch {
      /* the LQIP or placeholder stays — the story still plays */
    }
  };

  const firstLoad = loadOne(0);
  const first = Promise.race([firstLoad, new Promise<void>((r) => setTimeout(r, opts.firstTimeout ?? 4000))]);
  void firstLoad.finally(async () => {
    for (let i = 1; i < assets.length && !cancelled; i++) await loadOne(i);
  });

  return {
    paintings,
    first,
    cancel: () => {
      cancelled = true;
    },
  };
}
