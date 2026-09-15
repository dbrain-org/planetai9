import Link from "next/link";
import { Meta } from "@/components/Meta";
import { Cover } from "@/components/Cover";
import type { Locale } from "@/lib/i18n";
import type { EventCard as EventCardT } from "@/lib/types";

/** Vertical card for grids (Öne Çıkanlar, category grids). */
export function EventCard({ event, locale = "tr" }: { event: EventCardT; locale?: Locale }) {
  return (
    <article className="group">
      <Link href={`/news/${event.slug}`} className="block">
        <Cover src={event.image_url} category={event.category} className="aspect-[16/10]" zoom />
        <h3 className="mt-3.5 text-[16px] font-bold leading-snug tracking-tight2 text-ink transition-colors group-hover:text-accent dark:text-d-ink">
          {event.title}
        </h3>
        <Meta
          summary={event.summary}
          date={event.published_at}
          source={event.top_source?.name}
          locale={locale}
          className="mt-2.5"
        />
      </Link>
    </article>
  );
}

/** Horizontal row for lists (Son Haberler). */
export function NewsListItem({ event, locale = "tr" }: { event: EventCardT; locale?: Locale }) {
  return (
    <article className="group border-b border-line py-6 first:pt-0 last:border-b-0 dark:border-d-line">
      <Link href={`/news/${event.slug}`} className="flex gap-5">
        <Cover
          src={event.image_url}
          category={event.category}
          className="hidden h-28 w-40 shrink-0 sm:block"
          zoom
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-[18px] font-bold leading-snug tracking-tight2 text-ink transition-colors group-hover:text-accent dark:text-d-ink">
            {event.title}
          </h3>
          {event.summary && (
            <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-ink-2 dark:text-d-ink-2">
              {event.summary}
            </p>
          )}
          <Meta
            summary={event.summary}
            date={event.published_at}
            source={event.top_source?.name}
            locale={locale}
            className="mt-2.5"
          />
        </div>
      </Link>
    </article>
  );
}

/** Minimal row for detail-page rails (no image). */
export function EventRow({ event, locale = "tr" }: { event: EventCardT; locale?: Locale }) {
  return (
    <Link
      href={`/news/${event.slug}`}
      className="group flex gap-3 border-b border-line py-3.5 last:border-b-0 dark:border-d-line"
    >
      <Cover
        src={event.image_url}
        category={event.category}
        className="h-14 w-16 shrink-0 rounded-lg"
      />
      <div className="min-w-0">
        <h4 className="line-clamp-3 text-[13px] font-bold leading-snug tracking-tight2 text-ink transition-colors group-hover:text-accent dark:text-d-ink">
          {event.title}
        </h4>
        <p className="mt-1 text-[11px] text-ink-2 dark:text-d-ink-2">
          {event.top_source?.name}
        </p>
      </div>
    </Link>
  );
}

/** Compact row for the hero side-list. */
export function HeroSideItem({ event, locale = "tr" }: { event: EventCardT; locale?: Locale }) {
  return (
    <Link
      href={`/news/${event.slug}`}
      className="group flex gap-4 border-b border-line py-4 first:pt-0 last:border-b-0 dark:border-d-line"
    >
      <Cover
        src={event.image_url}
        category={event.category}
        className="h-[68px] w-[68px] shrink-0 rounded-lg"
        zoom
      />
      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-2 text-[14px] font-bold leading-snug tracking-tight2 text-ink transition-colors group-hover:text-accent dark:text-d-ink">
          {event.title}
        </h4>
        <Meta
          summary={event.summary}
          date={event.published_at}
          source={event.top_source?.name}
          locale={locale}
          className="mt-1.5 text-[11px]"
        />
      </div>
    </Link>
  );
}
