"use client";

import { useState } from "react";

/** Hosts that block hot-linking — route through /img. Everyone else loads direct. */
function needsProxy(src: string): boolean {
  try {
    const host = new URL(src).hostname.toLowerCase();
    return (
      host === "redd.it" ||
      host.endsWith(".redd.it") ||
      host.endsWith("redditmedia.com") ||
      host.endsWith("redditstatic.com") ||
      host === "reddit.com" ||
      host.endsWith(".reddit.com")
    );
  } catch {
    return false;
  }
}

function resolveSrc(src: string): string {
  if (src.startsWith("/") || src.startsWith("data:")) return src;
  if (needsProxy(src)) return `/img?u=${encodeURIComponent(src)}`;
  return src;
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
