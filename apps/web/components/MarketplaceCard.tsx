import { ArrowUpRight, Bot, Boxes, Code2, Cpu, Mic, Volume2, Wrench } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { MarketplaceApp } from "@/lib/types";

const CAT_ICON: Record<string, typeof Bot> = {
  mcp: Boxes,
  llm: Cpu,
  stt: Mic,
  tts: Volume2,
  agent: Bot,
  tool: Wrench,
  other: Code2,
};
const CAT_HUE: Record<string, string> = {
  mcp: "#7C3AED",
  llm: "#2563EB",
  stt: "#0D9488",
  tts: "#DB2777",
  agent: "#EA580C",
  tool: "#0EA5A0",
  other: "#6B7280",
};

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function MarketplaceCard({ app, locale }: { app: MarketplaceApp; locale: Locale }) {
  const Icon = CAT_ICON[app.category] ?? Code2;
  const hue = CAT_HUE[app.category] ?? "#6B7280";
  const h = host(app.url);
  const genericHost = /^(github\.com|gitlab\.com|huggingface\.co)$/.test(h);
  const fav = h && !genericHost ? `https://www.google.com/s2/favicons?domain=${h}&sz=128` : null;

  return (
    <a
      href={app.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card card-hover group flex flex-col p-5"
    >
      <div className="flex items-start gap-3.5">
        <span
          className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl"
          style={{ backgroundColor: `${hue}14` }}
        >
          {fav ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fav} alt="" className="h-6 w-6" referrerPolicy="no-referrer" />
          ) : (
            <Icon className="h-5 w-5" style={{ color: hue }} strokeWidth={2} />
          )}
        </span>
        <div className="min-w-0 pt-0.5">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{ color: hue }}
          >
            {app.category_label}
          </p>
          <h3 className="text-[16px] font-bold tracking-tight2 text-ink group-hover:text-accent dark:text-d-ink">
            {app.name}
          </h3>
        </div>
        <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-accent" />
      </div>

      <p className="mt-3 line-clamp-2 flex-1 text-[13.5px] leading-relaxed text-ink-2 dark:text-d-ink-2">
        {app.tagline}
      </p>

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-[11px] text-ink-2 dark:border-d-line dark:text-d-ink-2">
        <span className="truncate font-medium">{app.author_name}</span>
        {app.repo_url && (
          <span className="ml-auto shrink-0 font-semibold text-accent">
            {locale === "tr" ? "kaynak" : "source"} ↗
          </span>
        )}
      </div>
    </a>
  );
}
