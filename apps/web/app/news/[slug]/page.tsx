import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { EventRow } from "@/components/EventCard";
import { VideoCard } from "@/components/VideoCard";
import { ImageCarousel } from "@/components/ImageCarousel";
import { isLlmRadarStory, LlmRadarArticle } from "@/components/LlmRadarArticle";
import { Meta } from "@/components/Meta";
import { api, apiSafe } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { getDict, getLocale } from "@/lib/i18n";
import type { EventDetail, ImportanceFactors, Page as PageT } from "@/lib/types";

export const revalidate = 120;

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getDict();
  let event: EventDetail;
  try {
    event = await api<EventDetail>(`/events/${slug}`, { revalidate: 60 });
  } catch {
    notFound();
  }
  const tr = locale === "tr";
  const primary = event.sources.find((s) => s.is_primary) ?? event.sources[0];
  const factorKeys = Object.keys(t.event.factors) as (keyof Omit<ImportanceFactors, "total">)[];

  const submitted = await apiSafe<PageT>("/events?origin=submitted&limit=6&sort=recent", {
    data: [],
    next_cursor: null,
    count: 0,
  });
  const ownNews = submitted.data.filter((e) => e.slug !== event.slug).slice(0, 5);

  if (isLlmRadarStory(slug, event.body)) {
    return <LlmRadarArticle event={event} locale={locale} ownNews={ownNews} />;
  }

  // Explicit alt başlık when present; otherwise first body paragraph as standfirst.
  const hasDek = Boolean(event.summary?.trim());
  const lead = (hasDek ? event.summary : event.body[0]) || event.summary || null;
  const bodyParas = hasDek ? event.body : event.body.length > 1 ? event.body.slice(1) : [];

  return (
    <div className="mx-auto grid max-w-content gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
      <article className="mx-auto w-full max-w-[680px]">
        <h1 className="text-[30px] font-extrabold leading-[1.12] tracking-tight3 text-ink dark:text-d-ink sm:text-[40px]">
          {event.title}
        </h1>
        {lead && (
          <p className="mt-4 text-[18px] leading-relaxed text-ink-2 dark:text-d-ink-2">
            {lead}
          </p>
        )}
        <div className="mt-5 border-y border-line py-3 dark:border-d-line">
          <Meta
            summary={event.body.join(" ") || event.summary}
            date={event.last_activity_at}
            source={primary?.source.name}
            locale={locale}
          />
        </div>

        {(event.image_urls?.length || event.image_url) && (
          <ImageCarousel
            images={
              event.image_urls?.length
                ? event.image_urls
                : event.image_url
                  ? [event.image_url]
                  : []
            }
            category={event.category}
          />
        )}

        {(bodyParas.length > 0 || primary) && (
          <div className="mt-8 space-y-5">
            {bodyParas.map((p, i) => (
              <p key={i} className="text-[17px] leading-[1.8] text-ink dark:text-d-ink">
                {p}
              </p>
            ))}
            {primary && (
              <p className="pt-1 text-[13px] text-ink-2 dark:text-d-ink-2">
                {primary.source.source_type === "official_announcement" ? (
                  <>
                    {tr ? "İncelemek isterseniz " : "If you'd like to take a look, "}
                    <a
                      href={primary.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-accent"
                    >
                      {event.primary_entity?.name ?? primary.source.name}
                    </a>
                    {tr ? "'ı inceleyebilirsiniz." : "."}
                  </>
                ) : (
                  <>
                    {tr ? "Bu haber " : "This story is based on reporting by "}
                    <a
                      href={primary.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-accent"
                    >
                      {primary.source.name}
                    </a>
                    {tr ? " kaynağından derlenmiştir." : "."}
                  </>
                )}
              </p>
            )}
          </div>
        )}

        {event.why_it_matters && (
          <div className="mt-8 rounded-card border border-line bg-canvas p-5 dark:border-d-line dark:bg-d-canvas">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent">
              {t.event.whyMatters}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
              {event.why_it_matters}
            </p>
          </div>
        )}

        {primary && (
          <a
            href={primary.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 flex items-center justify-between rounded-card border border-line bg-paper p-5 transition-colors hover:border-accent dark:border-d-line dark:bg-d-canvas"
          >
            <span>
              <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-ink-2 dark:text-d-ink-2">
                {primary.source.source_type === "official_announcement"
                  ? tr
                    ? "İncelemek isterseniz"
                    : "Take a look"
                  : tr
                    ? "Haberin tamamı"
                    : "Full story"}
              </span>
              <span className="mt-1 block text-[15px] font-bold text-ink dark:text-d-ink">
                {event.primary_entity?.name ?? primary.source.name}
              </span>
            </span>
            <ArrowUpRight className="h-5 w-5 text-accent" />
          </a>
        )}

        {event.sources.length > 1 && (
          <section className="mt-8">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-ink-2 dark:text-d-ink-2">
              {t.event.coveredBy(event.sources.length)}
            </h2>
            <div className="mt-3 divide-y divide-line border-y border-line dark:divide-d-line dark:border-d-line">
              {event.sources.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 py-3 text-sm text-ink-2 hover:text-accent dark:text-d-ink-2"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-ink dark:text-d-ink">
                    {s.title}
                  </span>
                  <span className="shrink-0 text-[11px]">
                    {s.source.name} · {relativeTime(s.published_at, locale)}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              ))}
            </div>
          </section>
        )}

        {event.importance_factors && (
          <section className="mt-8">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-ink-2 dark:text-d-ink-2">
              {t.event.score} · {event.importance_factors.total.toFixed(1)}/10
            </h2>
            <div className="mt-3 space-y-2.5">
              {factorKeys.map((k) => (
                <div key={k} className="flex items-center gap-3 text-[11px]">
                  <span className="w-40 text-ink-2 dark:text-d-ink-2">{t.event.factors[k]}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-wash dark:bg-d-wash">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.round(event.importance_factors![k] * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right tabular-nums text-muted">
                    {event.importance_factors![k].toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {(event.entities.length > 0 || event.topics.length > 0) && (
          <div className="mt-8 flex flex-wrap gap-2">
            {event.entities.map(({ entity, role }) => (
              <Link
                key={entity.slug}
                href={`/entities/${entity.slug}`}
                className={`rounded-full px-3 py-1 text-[12px] font-medium ${
                  role === "primary"
                    ? "bg-ink text-white dark:bg-white dark:text-ink"
                    : "bg-wash text-ink-2 hover:bg-line dark:bg-d-wash dark:text-d-ink-2"
                }`}
              >
                {entity.name}
              </Link>
            ))}
            {event.topics.map((tp) => (
              <Link
                key={tp.slug}
                href={`/trends/${tp.slug}`}
                className="rounded-full bg-wash px-3 py-1 text-[12px] font-medium text-ink-2 hover:bg-line dark:bg-d-wash dark:text-d-ink-2"
              >
                #{tp.name.replace(/\s+/g, "")}
              </Link>
            ))}
          </div>
        )}

        {event.related_videos.length > 0 && (
          <section className="mt-10">
            <h2 className="sec-title mb-5">{t.event.relatedVideos}</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {event.related_videos.map((v) => (
                <VideoCard key={v.youtube_id} video={v} locale={locale} />
              ))}
            </div>
          </section>
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
