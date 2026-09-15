import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroSideItem } from "@/components/EventCard";
import { Meta } from "@/components/Meta";
import { Cover } from "@/components/Cover";
import { relativeTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import type { EventCard, VideoCard } from "@/lib/types";

export type HeroSideEntry =
  | { kind: "news"; event: EventCard }
  | { kind: "video"; video: VideoCard };

function HeroSideVideo({ video, locale }: { video: VideoCard; locale: Locale }) {
  return (
    <Link
      href={`/videos/${video.youtube_id}`}
      className="group flex gap-4 border-b border-line py-4 first:pt-0 last:border-b-0 dark:border-d-line"
    >
      <span className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-lg bg-wash dark:bg-d-wash">
        {video.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-2 text-[14px] font-bold leading-snug tracking-tight2 text-ink transition-colors group-hover:text-accent dark:text-d-ink">
          {video.title}
        </h4>
        <p className="mt-1.5 text-[11px] text-ink-2 dark:text-d-ink-2">
          PlanetAI9 · {relativeTime(video.published_at, locale)}
        </p>
      </div>
    </Link>
  );
}

export function HeroBlock({
  lead,
  side,
  locale,
  readMore,
}: {
  lead: EventCard;
  side: HeroSideEntry[];
  locale: Locale;
  readMore: string;
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-start lg:gap-10">
      <article className="group">
        <Link href={`/news/${lead.slug}`} className="block">
          <Cover src={lead.image_url} category={lead.category} className="aspect-[16/9]" rounded="rounded-card" zoom />
          <Meta
            summary={lead.summary}
            date={lead.published_at}
            source={lead.top_source?.name}
            locale={locale}
            className="mt-4"
          />
          <h1 className="mt-2 text-[28px] font-extrabold leading-[1.12] tracking-tight3 text-ink transition-colors group-hover:text-accent dark:text-d-ink sm:text-[34px]">
            {lead.title}
          </h1>
          {lead.summary && (
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
              {lead.summary}
            </p>
          )}
          <span className="btn-dark mt-5">
            {readMore} <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </article>

      {side.length > 0 && (
        <div className="border-t border-line pt-1 dark:border-d-line lg:border lg:rounded-card lg:border-line lg:p-5 lg:pt-5 dark:lg:border-d-line lg:dark:bg-transparent">
          {side.map((item) =>
            item.kind === "news" ? (
              <HeroSideItem key={item.event.slug} event={item.event} locale={locale} />
            ) : (
              <HeroSideVideo key={item.video.youtube_id} video={item.video} locale={locale} />
            ),
          )}
        </div>
      )}
    </section>
  );
}
