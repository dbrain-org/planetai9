import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink, Youtube } from "lucide-react";
import { ArticleEntities } from "@/components/ArticleEntities";
import { EventRow } from "@/components/EventCard";
import { api, apiSafe } from "@/lib/api";
import { dateLabel, duration, relativeTime } from "@/lib/format";
import { getDict, getLocale } from "@/lib/i18n";
import { linkifyEntities } from "@/lib/linkify";
import type { VideoCard, VideoDetail } from "@/lib/types";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const v = await api<VideoDetail>(`/videos/${id}`, { revalidate: 300 });
    return {
      title: v.title,
      description: v.description?.slice(0, 160) ?? undefined,
      openGraph: { images: v.thumbnail_url ? [v.thumbnail_url] : undefined },
    };
  } catch {
    return {};
  }
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getDict();
  const tr = locale === "tr";

  let video: VideoDetail;
  try {
    video = await api<VideoDetail>(`/videos/${id}`, { revalidate: 300 });
  } catch {
    notFound();
  }
  const all = await apiSafe<VideoCard[]>("/videos?limit=12", []);
  const more = all.filter((v) => v.youtube_id !== video.youtube_id).slice(0, 6);
  const watchUrl = `https://www.youtube.com/watch?v=${video.youtube_id}`;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/videos"
        className="mb-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-2 hover:text-ink dark:text-d-ink-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {t.section.video}
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <article className="min-w-0 space-y-5">
          <div className="aspect-video overflow-hidden rounded-xl border border-line dark:border-d-line">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <h1 className="text-2xl font-black leading-snug tracking-tight text-ink dark:text-d-ink">
            {video.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-2 dark:text-d-ink-2">
            <span>PlanetAI9</span>
            <span>·</span>
            <span>{dateLabel(video.published_at, locale)}</span>
            {video.duration_sec > 0 && (
              <>
                <span>·</span>
                <span>{duration(video.duration_sec)}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-live px-3.5 py-2 text-[12.5px] font-semibold text-white hover:opacity-90"
            >
              <Youtube className="h-4 w-4" /> {tr ? "YouTube'da izle" : "Watch on YouTube"}
            </a>
            <a
              href="https://www.youtube.com/@planetai9?sub_confirmation=1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-[12.5px] font-semibold text-ink-2 hover:text-ink dark:border-d-line dark:text-d-ink-2"
            >
              {tr ? "Kanala abone ol" : "Subscribe"}
            </a>
          </div>

          {(video.related_entities.length > 0 || video.related_topics.length > 0) && (
            <div className="space-y-3">
              {video.related_entities.length > 0 && (
                <ArticleEntities
                  entities={video.related_entities.map((e) => ({ entity: e, role: "related" }))}
                  locale={locale}
                  compact
                />
              )}
              {video.related_topics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {video.related_topics.map((tp) => (
                    <Link key={tp.slug} href={`/trends/${tp.slug}`} className="pill hover:text-accent">
                      #{tp.name.replace(/\s+/g, "")}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-line pt-4 dark:border-d-line">
            {video.description ? (
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2 dark:text-d-ink-2">
                {linkifyEntities(video.description, video.related_entities)}
              </p>
            ) : (
              <p className="text-[14px] leading-relaxed text-ink-2 dark:text-d-ink-2">
                {tr
                  ? "PlanetAI9 YouTube kanalından yapay zekâ sohbetleri, model incelemeleri ve Türkiye'den yapay zekâ hikâyeleri. Tüm bölümler için kanala göz at."
                  : "AI conversations, model reviews and AI stories from Türkiye on the PlanetAI9 YouTube channel."}
              </p>
            )}
          </div>
        </article>

        <aside className="space-y-6">
          {more.length > 0 && (
            <div className="card overflow-hidden">
              <div className="border-b border-line px-5 py-3 dark:border-d-line">
                <h2 className="text-[15px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
                  {tr ? "Sıradaki videolar" : "Up next"}
                </h2>
              </div>
              <ul className="divide-y divide-line dark:divide-d-line">
                {more.map((v) => (
                  <li key={v.youtube_id}>
                    <Link href={`/videos/${v.youtube_id}`} className="group flex gap-3 p-4">
                      <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-wash dark:bg-d-wash">
                        {v.thumbnail_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
                        )}
                        {v.duration_sec > 0 && (
                          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[9px] font-semibold text-white">
                            {duration(v.duration_sec)}
                          </span>
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
              <Link
                href="/videos"
                className="block border-t border-line px-5 py-3 text-center text-[12px] font-bold text-accent hover:bg-accent-soft dark:border-d-line dark:hover:bg-accent/10"
              >
                {t.common.seeAll}
              </Link>
            </div>
          )}

          {video.related_events.length > 0 && (
            <div className="card p-4">
              <h2 className="mb-2 text-[15px] font-black tracking-tight text-ink dark:text-d-ink">
                {t.section.related}
              </h2>
              <div className="divide-y divide-line dark:divide-d-line">
                {video.related_events.map((e) => (
                  <EventRow key={e.slug} event={e} locale={locale} />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
