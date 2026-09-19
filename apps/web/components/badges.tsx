import { impactLabel } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

const DOT: Record<string, string> = {
  low: "bg-muted",
  medium: "bg-accent",
  high: "bg-amber-500",
  critical: "bg-live",
};

export function ImpactBadge({ impact, locale = "tr" }: { impact: string; locale?: Locale }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-2 dark:text-d-ink-2">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[impact] ?? DOT.low}`} />
      {impactLabel(impact, locale)}
    </span>
  );
}
