import { categoryLabel } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { catColor } from "@/lib/category";
import { CoverImg } from "./CoverImg";

export function Cover({
  src,
  category,
  className = "",
  rounded = "rounded-xl",
  zoom = false,
  fit = "cover",
  minWidth = 0,
}: {
  src: string | null;
  category: string;
  className?: string;
  rounded?: string;
  zoom?: boolean;
  fit?: "cover" | "contain";
  /** Drop tiny source images instead of upscaling them into a blurry cover. */
  minWidth?: number;
}) {
  const hue = catColor(category);
  return (
    <div className={`relative overflow-hidden bg-wash dark:bg-d-wash ${rounded} ${className}`}>
      {fit === "cover" ? (
        <div
          className="absolute inset-0 h-full w-full"
          style={{ background: `linear-gradient(140deg, ${hue}, ${hue}18)` }}
        />
      ) : (
        <div className="absolute inset-0 h-full w-full bg-wash dark:bg-d-wash" />
      )}
      {src && <CoverImg src={src} zoom={zoom} fit={fit} minWidth={minWidth} />}
    </div>
  );
}

export function CatBadge({
  category,
  locale = "tr",
  className = "",
}: {
  category: string;
  locale?: Locale;
  className?: string;
}) {
  return <span className={`badge ${className}`}>{categoryLabel(category, locale)}</span>;
}
