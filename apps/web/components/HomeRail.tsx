import Link from "next/link";
import { Play } from "lucide-react";
import { Cover } from "@/components/Cover";
import { relativeTime } from "@/lib/format";
import type { DictT, Locale } from "@/lib/i18n";
import type { EventCard, TopicTrend, VideoCard } from "@/lib/types";

function RailThumb({ src, category }: { src: string | null; category: string }) {
  return (
    <Cover
      src={src}
      category={category}
      rounded="rounded-md"
      className="mt-0.5 h-11 w-14 shrink-0"
      minWidth={80}
    />
  );
}

function formatCount(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(n);
}

/** Compact ranked list for home right-rail (most read / most commented). */
export function RankedNewsList({
  title,
  href,
  items,
  locale,
  metric,
  seeAll,
  limit = 5,
}: {
  title: string;
  href: string;
  items: EventCard[];
  locale: Locale;
  metric: "views" | "comments";
  seeAll: string;
  limit?: number;
}) {
  const rows = items.slice(0, limit);
  if (rows.length === 0) return null;

  return (
    <div className="card px-4 pb-1 pt-3.5">
      <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-line pb-2.5 dark:border-d-line">
        <h3 className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-ink dark:text-d-ink">
          {title}
        </h3>
        <Link
          href={href}
          className="shrink-0 text-[11px] font-semibold text-muted transition-colors hover:text-ink dark:hover:text-d-ink"
        >
          {seeAll}
        </Link>
      </div>
      <ol>
        {rows.map((e, i) => {
          const count =
            metric === "views" ? (e.view_count ?? 0) : (e.comment_count ?? 0);
          return (
            <li key={e.slug} className="border-b border-line last:border-0 dark:border-d-line">
              <Link href={`/news/${e.slug}`} className="group flex items-start gap-2.5 py-3">
                <span className="w-5 shrink-0 pt-1 text-[11px] font-semibold tabular-nums tracking-wide text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <RailThumb src={e.image_url} category={e.category} />
                <span className="min-w-0 pt-px">
                  <span className="line-clamp-3 text-[13px] font-semibold leading-[1.35] tracking-tight2 text-ink transition-colors group-hover:text-accent dark:text-d-ink">
                    {e.title}
                  </span>
                  {count > 0 && (
                    <span className="mt-1 block text-[11px] tabular-nums tracking-tight text-muted">
                      {metric === "views"
                        ? locale === "tr"
                          ? `${formatCount(count, locale)} okuma`
                          : `${formatCount(count, locale)} views`
                        : locale === "tr"
                          ? `${formatCount(count, locale)} yorum`
                          : `${formatCount(count, locale)} comments`}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function TrendsCard({ trends, t }: { trends: TopicTrend[]; t: DictT }) {
  return (
    <div className="card px-4 pb-2 pt-3.5">
      <h3 className="border-b border-line pb-2.5 text-[12px] font-extrabold uppercase tracking-[0.14em] text-ink dark:border-d-line dark:text-d-ink">
        {t.section.trends}
      </h3>
      <ol>
        {trends.slice(0, 5).map((tr, i) => {
          const lead = tr.sample_events[0];
          return (
            <li key={tr.topic.slug} className="border-b border-line last:border-0 dark:border-d-line">
              <Link href={`/trends/${tr.topic.slug}`} className="group flex items-start gap-2.5 py-2.5">
                <span className="w-5 shrink-0 pt-1.5 text-[11px] font-semibold tabular-nums text-muted">
                  {i + 1}
                </span>
                <RailThumb src={lead?.image_url ?? null} category={lead?.category ?? "genel"} />
                <span className="min-w-0 pt-px">
                  <span className="block text-[13px] font-semibold leading-[1.35] tracking-tight2 text-ink transition-colors group-hover:text-accent dark:text-d-ink">
                    {tr.topic.name}
                  </span>
                  {lead?.primary_entity && (
                    <span className="mt-0.5 block text-[12px] leading-snug text-muted">
                      {lead.primary_entity.name}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
        {trends.length === 0 && (
          <li className="text-[13px] text-ink-2 dark:text-d-ink-2">{t.common.noData}</li>
        )}
      </ol>
    </div>
  );
}

export function VideosCard({
  videos,
  locale,
  t,
  title,
  limit = 3,
}: {
  videos: VideoCard[];
  locale: Locale;
  t: DictT;
  title?: string;
  limit?: number;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3 dark:border-d-line">
        <h3 className="flex items-center gap-2 text-[15px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          <Play className="h-3.5 w-3.5 fill-current" /> {title ?? t.section.video}
        </h3>
        <Link href="/videos" className="text-[11px] font-semibold text-ink transition-colors hover:text-ink-2 dark:text-d-ink dark:hover:text-d-ink-2">
          {t.common.seeAll}
        </Link>
      </div>
      <ul className="divide-y divide-line dark:divide-d-line">
        {videos.slice(0, limit).map((v) => (
          <li key={v.youtube_id}>
            <Link href={`/videos/${v.youtube_id}`} className="group flex gap-3 p-4">
              <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-wash dark:bg-d-wash">
                {v.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 text-[13px] font-bold leading-snug text-ink group-hover:text-accent dark:text-d-ink">
                  {v.title}
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-2 dark:text-d-ink-2">
                  {relativeTime(v.published_at, locale)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <a
        href="https://www.youtube.com/@planetai9?sub_confirmation=1"
        target="_blank"
        rel="noopener noreferrer"
        className="block border-t border-line px-5 py-3 text-center text-[12px] font-bold text-ink hover:bg-wash dark:border-d-line dark:text-d-ink dark:hover:bg-d-wash"
      >
        {locale === "tr" ? "PlanetAI9 kanalına abone ol" : "Subscribe to PlanetAI9"}
      </a>
    </div>
  );
}

export function HomeSidebar({
  trends,
  videos,
  t,
  locale,
}: {
  trends: TopicTrend[];
  videos: VideoCard[];
  t: DictT;
  locale: Locale;
}) {
  return (
    <aside className="space-y-6">
      <TrendsCard trends={trends} t={t} />
      {videos.length > 0 && <VideosCard videos={videos} locale={locale} t={t} />}
    </aside>
  );
}
