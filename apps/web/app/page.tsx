import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { HeroBlock, type HeroSideEntry } from "@/components/HeroBlock";
import { RankedNewsList, TrendsCard } from "@/components/HomeRail";
import { VideoCard } from "@/components/VideoCard";
import { apiSafe } from "@/lib/api";
import { getDict, getLocale } from "@/lib/i18n";
import type { EventCard as EventCardT, HomePayload, Page as PageT } from "@/lib/types";

export const revalidate = 60;

/** Hero sağ sütun — her zaman bu kadar slot. */
const SIDE_SLOTS = 5;
/** Öne Çıkanlar ızgarası — dolunca fazlası yalnızca /news (Gündem)'de kalır. */
const FEATURED_SLOTS = 6;

const EMPTY: HomePayload = {
  top_signals: [],
  latest_news: [],
  popular: [],
  most_read: [],
  most_commented: [],
  trending: [],
  videos: [],
  timeline: [],
  columns: [],
  sections: {},
};

function SectionHead({ title, href, seeAll }: { title: string; href?: string; seeAll: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="sec-title">{title}</h2>
      {href && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-accent hover:text-accent-ink"
        >
          {seeAll} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getDict();
  // Home is Türkiye-only: clicking the PlanetAI9 logo always lands on
  // Türkiye news ("Gündem" in the navbar points here too). World news lives
  // under its own nav item ("Dünya" -> /news?region=world).
  const [raw, submitted] = await Promise.all([
    apiSafe<HomePayload>("/home?region=TR", EMPTY, {
      revalidate: 60,
      tags: ["home"],
    }),
    // Enough headroom for lead + side + featured cascade; older items stay on Gündem.
    apiSafe<PageT>("/events?origin=submitted&limit=40&sort=recent", {
      data: [],
      next_cursor: null,
      count: 0,
    }),
  ]);
  const home: HomePayload = { ...EMPTY, ...raw };

  const pool = [
    ...home.top_signals,
    ...home.latest_news.filter((e) => !home.top_signals.some((s) => s.slug === e.slug)),
  ];
  const score = (e: EventCardT) =>
    (e.top_source?.source_type === "major_news" || e.top_source?.source_type === "official_announcement"
      ? 4
      : 0) +
    (e.image_url ? 3 : 0) +
    Math.min(e.source_count, 3) +
    e.importance / 10;
  const ranked = [...pool].sort((a, b) => score(b) - score(a));

  // Cascade (newest → oldest), nothing is deleted — older slots fall through:
  //   1) lead (büyük)  2) sağ sütun (5)  3) Öne Çıkanlar (6)  4) Gündem (/news)
  const own = submitted.data;
  const lead = own[0] ?? ranked[0] ?? null;
  const used = new Set<string>(lead ? [lead.slug] : []);

  const ownForSide = own.filter((e) => !used.has(e.slug)).slice(0, SIDE_SLOTS);
  ownForSide.forEach((e) => used.add(e.slug));

  const side: HeroSideEntry[] = ownForSide.map((event) => ({ kind: "news" as const, event }));

  // Sağ sütunu haberlerle doldur; yetmezse videoya düş.
  for (const event of ranked) {
    if (side.length >= SIDE_SLOTS) break;
    if (used.has(event.slug)) continue;
    side.push({ kind: "news", event });
    used.add(event.slug);
  }
  for (const video of home.videos) {
    if (side.length >= SIDE_SLOTS) break;
    side.push({ kind: "video", video });
  }

  // Hero'dan taşan PlanetAI9 haberleri → Öne Çıkanlar (kaybolmaz).
  const ownForFeatured = own.filter((e) => !used.has(e.slug)).slice(0, FEATURED_SLOTS);
  ownForFeatured.forEach((e) => used.add(e.slug));

  const featured = [
    ...ownForFeatured,
    ...ranked.filter((e) => !used.has(e.slug)),
  ].slice(0, FEATURED_SLOTS);
  // own[lead+side+featured:] ve kalan ranked → yalnızca Gündem'de (/news)

  const seeAll = locale === "tr" ? "Tümünü gör" : "See all";
  const sideVideoIds = new Set(
    side.filter((s): s is Extract<HeroSideEntry, { kind: "video" }> => s.kind === "video").map(
      (s) => s.video.youtube_id,
    ),
  );
  const moreVideos = home.videos.filter((v) => !sideVideoIds.has(v.youtube_id)).slice(0, 4);

  const showRail =
    home.trending.length > 0 ||
    home.most_read.length > 0 ||
    home.most_commented.length > 0;
  const showMain =
    featured.length > 0 || moreVideos.length > 0 || showRail;

  return (
    <div className="space-y-8">
      {lead && (
        <HeroBlock
          lead={lead}
          side={side}
          locale={locale}
          readMore={locale === "tr" ? "Haberin devamı" : "Read more"}
        />
      )}

      {showMain && (
        <section
          className={
            showRail
              ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-7"
              : undefined
          }
        >
          <div className="space-y-8">
            {featured.length > 0 && (
              <div>
                <SectionHead
                  title={locale === "tr" ? "Öne Çıkanlar" : "Featured"}
                  href="/news?region=TR&sort=recent"
                  seeAll={seeAll}
                />
                <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
                  {featured.map((e) => (
                    <EventCard key={e.slug} event={e} locale={locale} />
                  ))}
                </div>
              </div>
            )}

            {moreVideos.length > 0 && (
              <div>
                <SectionHead title={t.section.video} href="/videos" seeAll={seeAll} />
                <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                  {moreVideos.map((v) => (
                    <VideoCard key={v.youtube_id} video={v} locale={locale} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {showRail && (
            <aside className={`space-y-4 ${featured.length > 0 ? "lg:pt-11" : ""}`}>
              <p className="hidden text-[11px] font-bold uppercase tracking-[0.12em] text-muted lg:block">
                {locale === "tr" ? "Gündemdekiler" : "Trending now"}
              </p>
              {home.trending.length > 0 && <TrendsCard trends={home.trending} t={t} />}
              <RankedNewsList
                title={locale === "tr" ? "En çok okunan" : "Most read"}
                href="/news?sort=views"
                items={home.most_read}
                locale={locale}
                metric="views"
                seeAll={seeAll}
                limit={4}
              />
              <RankedNewsList
                title={locale === "tr" ? "En çok yorumlanan" : "Most discussed"}
                href="/news?sort=comments"
                items={home.most_commented}
                locale={locale}
                metric="comments"
                seeAll={seeAll}
                limit={4}
              />
            </aside>
          )}
        </section>
      )}
    </div>
  );
}
