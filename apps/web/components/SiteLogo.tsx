"use client";

import { useEffect, useRef, useState } from "react";

/** Site favicon (through /img), or the site's first letter when there is none. */
export function SiteLogo({ host }: { host: string }) {
  const [failed, setFailed] = useState(!host);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, [host]);

  if (failed) {
    return <span className="text-[26px] font-black uppercase text-ink">{host.charAt(0) || "·"}</span>;
  }
  const src = `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={`/img?u=${encodeURIComponent(src)}`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-11 w-11 object-contain"
    />
  );
}
