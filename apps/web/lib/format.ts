export type Locale = "tr" | "en";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const TR_UNIT: Record<string, string> = {
  year: "yıl",
  month: "ay",
  day: "gün",
  hour: "saat",
  minute: "dakika",
};

export function relativeTime(iso: string, locale: Locale = "tr"): string {
  const diffSec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diffSec < 60) return locale === "tr" ? "az önce" : "just now";
  const rtf = new Intl.RelativeTimeFormat(locale === "tr" ? "tr" : "en", { numeric: "always" });
  for (const [unit, secs] of UNITS) {
    if (diffSec >= secs) {
      const n = Math.floor(diffSec / secs);
      if (locale === "tr") return `${n} ${TR_UNIT[unit]} önce`;
      return rtf.format(-n, unit);
    }
  }
  return locale === "tr" ? "az önce" : "just now";
}

export function clockTime(iso: string, locale: Locale = "tr"): string {
  return new Date(iso).toLocaleTimeString(locale === "tr" ? "tr-TR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dateLabel(iso: string, locale: Locale = "tr"): string {
  return new Date(iso).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function duration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}
