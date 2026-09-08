import { cn } from "@/lib/utils";

/**
 * Portrait plate for the About page. Not a photograph: an original tenebrist composition —
 * a generic advocate in a black gown with white bands, face in shadow, one warm key light from
 * the upper left and a faint cool rim from the right — in the manner of the homepage artwork.
 * Nobody in particular is depicted.
 */
export function AdvocatePlate({ className, caption = "Fig. 01 — An advocate, in the manner of the homepage. Not a photograph; nobody in particular." }: { className?: string; caption?: string }) {
  return (
    <figure className={cn("w-full", className)}>
      <div className="relative aspect-[3/4] overflow-hidden border border-bronze/25 bg-charcoal grain vignette">
        <svg viewBox="0 0 600 800" className="absolute inset-0 h-full w-full" role="img" aria-labelledby="advocate-plate-title advocate-plate-desc">
          <title id="advocate-plate-title">An advocate in a black gown with white bands</title>
          <desc id="advocate-plate-desc">A dark, painterly silhouette of a lawyer in court dress, lit from the upper left, face in shadow.</desc>
          <defs>
            <radialGradient id="ap-key" cx="24%" cy="14%" r="78%">
              <stop offset="0" stopColor="#f2d9b4" stopOpacity="0.34" />
              <stop offset="0.45" stopColor="#c8a274" stopOpacity="0.08" />
              <stop offset="1" stopColor="#09090b" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ap-rim" cx="92%" cy="40%" r="60%">
              <stop offset="0" stopColor="#8ea0c4" stopOpacity="0.14" />
              <stop offset="1" stopColor="#09090b" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="ap-gown" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#2d2d35" />
              <stop offset="0.42" stopColor="#111114" />
              <stop offset="1" stopColor="#050506" />
            </linearGradient>
            <linearGradient id="ap-sleeve" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1c1c21" />
              <stop offset="1" stopColor="#070708" />
            </linearGradient>
            <linearGradient id="ap-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0c0c0f" stopOpacity="0" />
              <stop offset="1" stopColor="#040405" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="ap-rimstroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8ea0c4" stopOpacity="0" />
              <stop offset="0.25" stopColor="#8ea0c4" stopOpacity="0.4" />
              <stop offset="0.8" stopColor="#8ea0c4" stopOpacity="0.12" />
              <stop offset="1" stopColor="#8ea0c4" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="ap-keystroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f2d9b4" stopOpacity="0.55" />
              <stop offset="0.6" stopColor="#c8a274" stopOpacity="0.15" />
              <stop offset="1" stopColor="#c8a274" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="ap-band" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f6f0e2" />
              <stop offset="1" stopColor="#cfc6b2" />
            </linearGradient>
          </defs>

          {/* Room */}
          <rect width="600" height="800" fill="#101013" />
          <rect width="600" height="800" fill="url(#ap-key)" />
          <rect width="600" height="800" fill="url(#ap-rim)" />
          {/* A suggestion of a wall panel behind the figure */}
          <rect x="60" y="80" width="480" height="560" fill="none" stroke="#c8a274" strokeOpacity="0.08" />
          <line x1="60" y1="360" x2="540" y2="360" stroke="#c8a274" strokeOpacity="0.05" />

          {/* Floor and cast shadow */}
          <rect x="0" y="600" width="600" height="200" fill="url(#ap-floor)" />
          <ellipse cx="318" cy="770" rx="190" ry="16" fill="#000" opacity="0.55" />

          {/* Sleeves */}
          <path d="M236 250 C 196 310 146 430 122 530 C 116 552 136 562 150 546 C 192 480 232 392 256 306 Z" fill="url(#ap-sleeve)" />
          <path d="M364 250 C 404 310 454 430 478 530 C 484 552 464 562 450 546 C 408 480 368 392 344 306 Z" fill="#141418" />

          {/* Gown */}
          <path d="M300 200 C 258 200 228 226 216 266 L 150 706 C 146 728 160 744 182 744 L 418 744 C 440 744 454 728 450 706 L 384 266 C 372 226 342 200 300 200 Z" fill="url(#ap-gown)" />
          {/* Folds */}
          <path d="M262 300 C 250 420 232 560 214 740" fill="none" stroke="#3b3b46" strokeOpacity="0.55" strokeWidth="1.5" />
          <path d="M286 300 C 282 440 272 580 262 744" fill="none" stroke="#33333d" strokeOpacity="0.45" strokeWidth="1.2" />
          <path d="M328 300 C 338 440 356 580 372 744" fill="none" stroke="#1d1d22" strokeOpacity="0.8" strokeWidth="1.5" />
          <path d="M348 320 C 362 460 384 600 404 744" fill="none" stroke="#17171b" strokeOpacity="0.9" strokeWidth="2" />
          {/* Warm light catching the left shoulder and the fall of the gown */}
          <path d="M258 214 C 236 232 222 258 214 292 L 176 540" fill="none" stroke="url(#ap-keystroke)" strokeWidth="3" strokeLinecap="round" />
          {/* Cool rim along the right contour */}
          <path d="M344 212 C 366 230 380 258 388 296 L 446 704" fill="none" stroke="url(#ap-rimstroke)" strokeWidth="2" strokeLinecap="round" />

          {/* Gown opening and the bands at the throat */}
          <path d="M266 206 L 300 286 L 334 206 C 322 216 278 216 266 206 Z" fill="#0a0a0c" />
          <path d="M283 208 L 288 266 C 291 274 297 274 299 266 L 300 214 Z" fill="url(#ap-band)" opacity="0.94" />
          <path d="M317 208 L 312 266 C 309 274 303 274 301 266 L 300 214 Z" fill="url(#ap-band)" opacity="0.88" />
          <path d="M283 208 C 290 214 310 214 317 208" fill="none" stroke="#f6f0e2" strokeOpacity="0.9" strokeWidth="2.5" strokeLinecap="round" />

          {/* Head, in shadow */}
          <ellipse cx="300" cy="140" rx="46" ry="58" fill="#141418" />
          <path d="M254 128 C 262 92 338 92 346 128 C 336 108 316 98 300 98 C 284 98 264 108 254 128 Z" fill="#0d0d10" />
          <path d="M262 112 C 258 140 262 168 276 190" fill="none" stroke="#e0bf96" strokeOpacity="0.22" strokeWidth="2" strokeLinecap="round" />
          <path d="M342 118 C 348 146 344 172 330 192" fill="none" stroke="#8ea0c4" strokeOpacity="0.16" strokeWidth="1.5" strokeLinecap="round" />
          {/* Neck */}
          <path d="M280 186 L 284 208 L 316 208 L 320 186 Z" fill="#101013" />

          {/* Dust in the key light */}
          <g fill="#f2d9b4">
            <circle cx="118" cy="112" r="1.2" opacity="0.5" />
            <circle cx="164" cy="172" r="0.9" opacity="0.4" />
            <circle cx="96" cy="230" r="1.4" opacity="0.32" />
            <circle cx="206" cy="96" r="0.8" opacity="0.45" />
            <circle cx="150" cy="300" r="1" opacity="0.3" />
            <circle cx="238" cy="150" r="0.7" opacity="0.4" />
            <circle cx="70" cy="160" r="0.9" opacity="0.28" />
            <circle cx="184" cy="380" r="1.1" opacity="0.22" />
          </g>

          {/* Plate marks */}
          <g stroke="#c8a274" strokeOpacity="0.45" strokeWidth="1">
            <path d="M18 34 V18 H34" fill="none" />
            <path d="M566 18 H582 V34" fill="none" />
            <path d="M18 766 V782 H34" fill="none" />
            <path d="M582 766 V782 H566" fill="none" />
          </g>
        </svg>
        <span className="absolute bottom-3 right-4 z-[2] font-mono text-[0.58rem] uppercase tracking-[0.22em] text-bone/60" aria-hidden="true">
          Plate 01
        </span>
      </div>
      <figcaption className="mt-3 font-mono text-[0.62rem] uppercase leading-relaxed tracking-[0.18em] text-ash">{caption}</figcaption>
    </figure>
  );
}
