"use client";

import { useState } from "react";

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

/** <img> that removes itself on load failure / tiny sources so the gradient placeholder shows. */
export function CoverImg({
  src,
  zoom = false,
  fit = "cover",
  minWidth = 0,
}: {
  src: string;
  zoom?: boolean;
  /** cover = fill & crop; contain = show full image (no crop). */
  fit?: "cover" | "contain";
  /** Hide the image if its intrinsic width is below this (avoids blurry upscales). */
  minWidth?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolveSrc(src)}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      onLoad={(e) => {
        if (minWidth > 0 && e.currentTarget.naturalWidth < minWidth) {
          setFailed(true);
        }
      }}
      className={`absolute inset-0 h-full w-full transition-transform duration-500 ${
        fit === "contain" ? "object-contain" : "object-cover"
      } ${zoom && fit === "cover" ? "group-hover:scale-105" : ""}`}
    />
  );
}
