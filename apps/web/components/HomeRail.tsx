import Link from "next/link";
import { Eye, Flame, MessageCircle, Play } from "lucide-react";
import { relativeTime } from "@/lib/format";
import type { DictT, Locale } from "@/lib/i18n";
import type { EventCard, TopicTrend, VideoCard } from "@/lib/types";

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
    <div className="card p-4">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[14px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {metric === "views" ? (
            <Eye className="h-3.5 w-3.5 text-accent" strokeWidth={2.2} />
          ) : (
            <MessageCircle className="h-3.5 w-3.5 text-accent" strokeWidth={2.2} />
          )}
          {title}
        </h3>
        <Link
          href={href}
          className="shrink-0 text-[11px] font-semibold text-accent hover:text-accent-ink"
        >
          {seeAll}
        </Link>
      </div>
      <ol className="divide-y divide-line dark:divide-d-line">
        {rows.map((e, i) => {
          const count =
            metric === "views" ? (e.view_count ?? 0) : (e.comment_count ?? 0);
          return (
            <li key={e.slug}>
              <Link href={`/news/${e.slug}`} className="group flex gap-2.5 py-2 first:pt-0 last:pb-0">
                <span className="w-4 shrink-0 text-[12px] font-extrabold tabular-nums text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 text-[12.5px] font-bold leading-snug tracking-tight2 text-ink transition-colors group-hover:text-accent dark:text-d-ink">
                    {e.title}
                  </span>
                  {count > 0 && (
                    <span className="mt-0.5 block text-[10.5px] tabular-nums text-muted">
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
    <div className="card p-4">
      <h3 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
        <Flame className="h-3.5 w-3.5 text-live" strokeWidth={2.2} />
        {t.section.trends}
      </h3>
      <ol className="space-y-2.5">
        {trends.slice(0, 5).map((tr, i) => {
          const lead = tr.sample_events[0];
          return (
            <li key={tr.topic.slug}>
              <Link href={`/trends/${tr.topic.slug}`} className="group flex gap-2.5">
                <span className="w-4 shrink-0 text-[13px] font-extrabold text-muted">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold leading-snug tracking-tight2 text-ink transition-colors group-hover:text-accent dark:text-d-ink">
                    {tr.topic.name}
                  </span>
                  {lead?.primary_entity && (
                    <span className="block text-[11.5px] text-ink-2 dark:text-d-ink-2">
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
        <Link href="/videos" className="text-[11px] font-semibold text-accent hover:text-accent-ink">
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
        className="block border-t border-line px-5 py-3 text-center text-[12px] font-bold text-accent hover:bg-accent-soft dark:border-d-line dark:hover:bg-accent/10"
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
