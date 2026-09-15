import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { HeroBlock, type HeroSideEntry } from "@/components/HeroBlock";
import { TrendsCard } from "@/components/HomeRail";
import { VideoCard } from "@/components/VideoCard";
import { apiSafe } from "@/lib/api";
import { getDict, getLocale } from "@/lib/i18n";
import type { HomePayload, Page as PageT } from "@/lib/types";

export const revalidate = 60;

const EMPTY: HomePayload = {
  top_signals: [],
  latest_news: [],
  popular: [],
  trending: [],
  videos: [],
  timeline: [],
  columns: [],
  sections: {},
};

function SectionHead({ title, href, seeAll }: { title: string; href?: string; seeAll: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
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
    apiSafe<PageT>("/events?origin=submitted&limit=8&sort=recent", {
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
  const score = (e: (typeof pool)[number]) =>
    (e.top_source?.source_type === "major_news" || e.top_source?.source_type === "official_announcement"
      ? 4
      : 0) +
    (e.image_url ? 3 : 0) +
    Math.min(e.source_count, 3) +
    e.importance / 10;
  const ranked = [...pool].sort((a, b) => score(b) - score(a));

  // Prefer a PlanetAI9 (submitted) story as the lead when available.
  const own = submitted.data;
  const lead = own[0] ?? ranked[0];
  const used = new Set<string>(lead ? [lead.slug] : []);

  const ownSide = own.filter((e) => !used.has(e.slug)).slice(0, 4);
  ownSide.forEach((e) => used.add(e.slug));

  const side: HeroSideEntry[] = ownSide.map((event) => ({ kind: "news" as const, event }));
  for (const video of home.videos) {
    if (side.length >= 4) break;
    side.push({ kind: "video", video });
  }

  const featured = ranked.filter((e) => !used.has(e.slug)).slice(0, 6);
  const seeAll = locale === "tr" ? "Tümünü gör" : "See all";
  const sideVideoIds = new Set(
    side.filter((s): s is Extract<HeroSideEntry, { kind: "video" }> => s.kind === "video").map(
      (s) => s.video.youtube_id,
    ),
  );
  const moreVideos = home.videos.filter((v) => !sideVideoIds.has(v.youtube_id)).slice(0, 4);

  return (
    <div className="space-y-10 sm:space-y-12">
      {lead && (
        <HeroBlock
          lead={lead}
          side={side}
          locale={locale}
          readMore={locale === "tr" ? "Haberin devamı" : "Read more"}
        />
      )}

      {(featured.length > 0 || home.trending.length > 0) && (
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-10">
          {featured.length > 0 && (
            <div>
              <SectionHead
                title={locale === "tr" ? "Öne Çıkanlar" : "Featured"}
                href="/news?region=TR&sort=importance"
                seeAll={seeAll}
              />
              <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
                {featured.map((e) => (
                  <EventCard key={e.slug} event={e} locale={locale} />
                ))}
              </div>
            </div>
          )}
          {home.trending.length > 0 && (
            <div className={featured.length > 0 ? "lg:pt-11" : undefined}>
              <TrendsCard trends={home.trending} t={t} />
            </div>
          )}
        </section>
      )}

      {moreVideos.length > 0 && (
        <section>
          <SectionHead title={t.section.video} href="/videos" seeAll={seeAll} />
          <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
            {moreVideos.map((v) => (
              <VideoCard key={v.youtube_id} video={v} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
