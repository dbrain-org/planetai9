"use client";

import { useState } from "react";

/** Route publisher images through our proxy so hot-link-blocked hosts (Reddit…) still load. */
function proxied(src: string): string {
  if (src.startsWith("/") || src.startsWith("data:")) return src;
  return `/img?u=${encodeURIComponent(src)}`;
}

/** <img> that removes itself on load failure so the parent's gradient placeholder shows through. */
export function CoverImg({
  src,
  zoom = false,
  fit = "cover",
}: {
  src: string;
  zoom?: boolean;
  /** cover = fill & crop; contain = show full image (no crop). */
  fit?: "cover" | "contain";
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={proxied(src)}
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
