"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CoverImg } from "@/components/CoverImg";
import { catColor } from "@/lib/category";

export function ImageCarousel({
  images,
  category = "AI",
  className = "mt-6 aspect-[16/9]",
}: {
  images: string[];
  category?: string;
  className?: string;
}) {
  const [idx, setIdx] = useState(0);
  if (!images.length) return null;
  const i = ((idx % images.length) + images.length) % images.length;
  const src = images[i]!;
  const hue = catColor(category);

  return (
    <div className={`relative overflow-hidden rounded-card ${className}`}>
      <div
        className="absolute inset-0 h-full w-full bg-wash dark:bg-d-wash"
        style={{ background: `linear-gradient(140deg, ${hue}, ${hue}18)` }}
      />
      <CoverImg src={src} />
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Önceki fotoğraf"
            onClick={() => setIdx((n) => n - 1)}
            className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Sonraki fotoğraf"
            onClick={() => setIdx((n) => n + 1)}
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
                onClick={() => setIdx(n)}
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
