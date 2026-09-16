import { ArrowUpRight } from "lucide-react";
import { CatBadge } from "@/components/Cover";
import { EventRow } from "@/components/EventCard";
import { ImageCarousel } from "@/components/ImageCarousel";
import { Meta } from "@/components/Meta";
import type { Locale } from "@/lib/i18n";
import type { EventCard as EventCardT, EventDetail } from "@/lib/types";

function looksLikeStats(p: string) {
  return /\d([.,]\d)?\s*(bin|K|k)|%\d|\d{2,}/.test(p) && p.length > 80 && p.length < 420;
}

function Paragraph({ text, role }: { text: string; role: "lead" | "body" | "bridge" | "callout" | "close" }) {
  const cls =
    role === "lead"
      ? "article-lead"
      : role === "bridge"
        ? "article-bridge"
        : role === "callout"
          ? "article-callout"
          : role === "close"
            ? "article-close"
            : "article-body";
  return <p className={cls}>{text}</p>;
}

function roleFor(p: string, index: number, total: number): "lead" | "body" | "bridge" | "callout" | "close" {
  if (index === 0) return "lead";
  if (index === total - 1) return "close";
  if (looksLikeStats(p)) return "callout";
  if (p.length < 100) return "bridge";
  return "body";
}

/** Compact feature layout for the LLM Radar story — still a news article, not a landing page. */
export function LlmRadarArticle({
  event,
  locale,
  ownNews,
}: {
  event: EventDetail;
  locale: Locale;
  ownNews: EventCardT[];
}) {
  const tr = locale === "tr";
  const primary = event.sources.find((s) => s.is_primary) ?? event.sources[0];

  const gallery =
    event.image_urls && event.image_urls.length > 0
      ? event.image_urls
      : ([event.image_url, ...event.body.filter((p) => /^\/news\/.*\.(svg|png|jpe?g|webp)$/i.test(p.trim()))].filter(
          (u): u is string => Boolean(u),
        ) as string[]);
  const paragraphs = event.body.filter(
    (p) => !/^\/news\/.*\.(svg|png|jpe?g|webp)$/i.test(p.trim()),
  );

  return (
    <div className="mx-auto grid max-w-content gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
      <article className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <CatBadge category={event.category} locale={locale} />
        </div>
        <h1 className="mt-3 max-w-[20ch] text-[32px] font-extrabold leading-[1.08] tracking-tight3 text-ink dark:text-d-ink sm:max-w-none sm:text-[40px]">
          {event.title}
        </h1>
        {event.summary && <p className="article-dek mt-4 max-w-[38rem]">{event.summary}</p>}
        <div className="mt-5 border-y border-line py-3 dark:border-d-line">
          <Meta
            summary={paragraphs.join(" ") || event.summary}
            date={event.last_activity_at}
            source={primary?.source.name}
            locale={locale}
          />
        </div>

        {gallery.length > 0 && (
          <ImageCarousel images={gallery} category={event.category} />
        )}

        <div className="mt-9 space-y-6">
          {paragraphs.map((p, i) => (
            <Paragraph key={p.slice(0, 48)} text={p} role={roleFor(p, i, paragraphs.length)} />
          ))}
        </div>

        {primary && (
          <a
            href={primary.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 flex items-center justify-between rounded-card border border-line bg-paper p-5 transition-colors hover:border-accent dark:border-d-line dark:bg-d-canvas"
          >
            <span>
              <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-ink-2 dark:text-d-ink-2">
                {tr ? "İncelemek isterseniz" : "Take a look"}
              </span>
              <span className="mt-1 block text-[15px] font-bold text-ink dark:text-d-ink">
                {event.primary_entity?.name ?? primary.source.name}
              </span>
            </span>
            <ArrowUpRight className="h-5 w-5 text-accent" />
          </a>
        )}
      </article>

      <aside className="lg:pt-1">
        {ownNews.length > 0 && (
          <div className="lg:sticky lg:top-24">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-ink-2 dark:text-d-ink-2">
              {tr ? "PlanetAI9 Haberleri" : "PlanetAI9 News"}
            </h2>
            <div className="mt-3 border-t border-line dark:border-d-line">
              {ownNews.map((e) => (
                <EventRow key={e.slug} event={e} locale={locale} />
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

export function isLlmRadarStory(slug: string, body?: string[] | null): boolean {
  if (slug === "turkiye-nin-ilk-llm-radar-sistemi-yayinda") return true;
  if (slug.includes("llm-radar") || slug.includes("llmradar")) return true;
  const joined = (body ?? []).join("\n");
  return /llm.?radar/i.test(joined);
}
