"use client";

import { useEffect, useRef, useState } from "react";

/** Remote covers go through /img so we cache them and publishers can't block the browser. */
function resolveSrc(src: string): string {
  if (src.startsWith("/") || src.startsWith("data:")) return src;
  try {
    const url = new URL(src);
    if (url.protocol !== "http:" && url.protocol !== "https:") return src;
  } catch {
    return src;
  }
  return `/img?u=${encodeURIComponent(src)}`;
}

/** <img> that removes itself if the file fails, and otherwise fills the card at any size. */
export function CoverImg({
  src,
  zoom = false,
  fit = "cover",
}: {
  src: string;
  zoom?: boolean;
  /** cover = fill & crop; contain = show full image (no crop). */
  fit?: "cover" | "contain";
  /** Accepted so older call sites still compile. Size is handled by the card. */
  minWidth?: number;
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={resolveSrc(src)}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`absolute inset-0 h-full w-full transition-transform duration-500 ${
        fit === "contain" ? "object-contain" : "object-cover"
      } ${zoom && fit === "cover" ? "group-hover:scale-105" : ""}`}
    />
  );
}
