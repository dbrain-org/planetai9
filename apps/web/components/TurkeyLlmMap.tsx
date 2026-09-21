import type { LlmMapPin } from "@/lib/types";
import { isOnTurkeyLand, TURKEY_CITY_LABELS, TURKEY_MAP, projectTurkey } from "./turkeyMapPath";

const PIN_GAP = 18;

/** If a point drifts into the sea, walk it back toward the land origin. */
function keepOnLand(x: number, y: number, ox: number, oy: number): { x: number; y: number } {
  if (isOnTurkeyLand(x, y)) return { x, y };
  // binary search back toward original (which should be on land)
  let lo = 0;
  let hi = 1;
  let bestX = ox;
  let bestY = oy;
  for (let i = 0; i < 12; i++) {
    const t = (lo + hi) / 2;
    const cx = ox + (x - ox) * t;
    const cy = oy + (y - oy) * t;
    if (isOnTurkeyLand(cx, cy)) {
      bestX = cx;
      bestY = cy;
      lo = t;
    } else {
      hi = t;
    }
  }
  return { x: bestX, y: bestY };
}

/** Project pins, then push overlapping ones apart — without leaving land. */
function layoutPins(pins: LlmMapPin[]): { pin: LlmMapPin; x: number; y: number }[] {
  const nodes = pins.map((pin) => {
    const { x, y } = projectTurkey(pin.lng, pin.lat);
    return { pin, x, y, ox: x, oy: y };
  });

  const seen = new Map<string, number>();
  for (const n of nodes) {
    const key = `${n.ox.toFixed(0)},${n.oy.toFixed(0)}`;
    const i = seen.get(key) ?? 0;
    seen.set(key, i + 1);
    if (i > 0) {
      const angle = (i / 8) * Math.PI * 2;
      const r = 12 + Math.floor(i / 8) * 10;
      n.x = n.ox + Math.cos(angle) * r;
      n.y = n.oy + Math.sin(angle) * r;
      const fixed = keepOnLand(n.x, n.y, n.ox, n.oy);
      n.x = fixed.x;
      n.y = fixed.y;
    }
  }

  for (let iter = 0; iter < 50; iter++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 0.01) {
          dx = 1;
          dy = 0;
          dist = 0.01;
        }
        if (dist >= PIN_GAP) continue;
        const push = ((PIN_GAP - dist) / 2) * 0.7;
        const ux = dx / dist;
        const uy = dy / dist;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
        moved = true;
      }
    }
    for (const n of nodes) {
      const fixed = keepOnLand(n.x, n.y, n.ox, n.oy);
      n.x = fixed.x;
      n.y = fixed.y;
    }
    if (!moved) break;
  }

  return nodes.map(({ pin, x, y }) => ({ pin, x, y }));
}

/** Türkiye outline + curated lat/lng pins. */
export function TurkeyLlmMap({
  pins,
  locale = "tr",
}: {
  pins: LlmMapPin[];
  locale?: "tr" | "en";
}) {
  const tr = locale === "tr";
  const placed = pins.filter(
    (p) =>
      p.lat >= TURKEY_MAP.minLat &&
      p.lat <= TURKEY_MAP.maxLat &&
      p.lng >= TURKEY_MAP.minLng &&
      p.lng <= TURKEY_MAP.maxLng,
  );
  const laid = layoutPins(placed);

  return (
    <div className="relative overflow-hidden rounded-card border border-line bg-[#D7E6F2] dark:border-d-line dark:bg-[#1a2430]">
      <svg
        viewBox={TURKEY_MAP.viewBox}
        className="h-auto w-full"
        role="img"
        aria-label={tr ? "Türkiye haritası" : "Map of Türkiye"}
      >
        <defs>
          <filter id="tr-land-shadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
          </filter>
        </defs>
        <path
          d={TURKEY_MAP.path}
          fill="#F7FAFC"
          stroke="#6B8499"
          strokeWidth={1.25}
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#tr-land-shadow)"
          className="dark:fill-[#2a3544] dark:stroke-[#7a8c9e]"
        />
        {TURKEY_CITY_LABELS.map((c) => {
          const { x, y } = projectTurkey(c.lng, c.lat);
          return (
            <text
              key={c.name}
              x={x}
              y={y + 16}
              textAnchor="middle"
              className="fill-[#5A6F82] dark:fill-[#9aafc2]"
              style={{ fontSize: 11 }}
            >
              {c.name}
            </text>
          );
        })}
        {laid.map(({ pin, x, y }) => (
          <a
            key={pin.slug}
            href={`/turkiye-llm/ureticiler/${pin.slug}`}
            aria-label={pin.city ? `${pin.name}, ${pin.city}` : pin.name}
          >
            <circle cx={x} cy={y} r={9} className="fill-accent/25" />
            <circle
              cx={x}
              cy={y}
              r={6}
              className="fill-accent stroke-white dark:stroke-[#1a2430]"
              strokeWidth={2}
            />
          </a>
        ))}
      </svg>
      {placed.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-[13px] text-muted">
          {tr ? "Haritada pin yok." : "No map pins yet."}
        </p>
      )}
    </div>
  );
}
