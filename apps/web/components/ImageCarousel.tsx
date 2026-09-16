"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Route publisher images through our proxy so hot-link-blocked hosts still load. */
function proxied(src: string): string {
  if (src.startsWith("/") || src.startsWith("data:")) return src;
  return `/img?u=${encodeURIComponent(src)}`;
}

/**
 * Article gallery — shows the full photo at its natural aspect ratio.
 * Never forces 16:9 / object-cover (that crops tall graphics and screenshots).
 */
export function ImageCarousel({
  images,
  category: _category = "AI",
  className = "mt-6",
}: {
  images: string[];
  category?: string;
  className?: string;
}) {
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  if (!images.length) return null;
  const i = ((idx % images.length) + images.length) % images.length;
  const src = images[i]!;

  return (
    <div
      className={`relative overflow-hidden rounded-card bg-wash dark:bg-d-wash ${className}`}
    >
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={proxied(src)}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="mx-auto block h-auto max-h-[min(85vh,920px)] w-full object-contain"
        />
      ) : (
        <div className="aspect-[16/9] w-full bg-wash dark:bg-d-wash" />
      )}
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Önceki fotoğraf"
            onClick={() => {
              setFailed(false);
              setIdx((n) => n - 1);
            }}
            className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Sonraki fotoğraf"
            onClick={() => {
              setFailed(false);
              setIdx((n) => n + 1);
            }}
            className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {images.map((_, n) => (
              <button
                key={n}
                type="button"
                aria-label={`Fotoğraf ${n + 1}`}
                onClick={() => {
                  setFailed(false);
                  setIdx(n);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  n === i ? "w-5 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
