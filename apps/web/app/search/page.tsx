import Link from "next/link";
import { EventCard } from "@/components/EventCard";
import { Page } from "@/components/Page";
import { VideoCard } from "@/components/VideoCard";
import { apiSafe } from "@/lib/api";
import { entityHref } from "@/lib/entity";
import { getDict, getLocale } from "@/lib/i18n";
import type { SearchResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const EMPTY: SearchResult = {
  query: "",
  entities: [],
  events: { data: [], next_cursor: null, count: 0 },
  videos: [],
  research: { data: [], next_cursor: null, count: 0 },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const locale = await getLocale();
  const t = await getDict();
  const q = (await searchParams).q?.trim() ?? "";
  const result =
    q.length >= 2 ? await apiSafe<SearchResult>(`/search?q=${encodeURIComponent(q)}`, EMPTY) : EMPTY;

  const empty =
    q.length >= 2 &&
    result.entities.length === 0 &&
    result.events.data.length === 0 &&
    result.videos.length === 0;

  const tr = locale === "tr";

  return (
    <Page title={q ? `"${q}"` : tr ? "Arama" : "Search"}>
      {q.length < 2 && (
        <p className="text-sm text-muted">
          {tr ? "En az iki karakter yazın." : "Type at least two characters."}
        </p>
      )}

      <div className="space-y-10">
        {result.entities.length > 0 && (
          <section>
            <p className="eyebrow mb-2">{tr ? "Kavramlar" : "Entities"}</p>
            <div className="flex flex-wrap gap-2">
              {result.entities.map((e) => (
                <Link key={e.slug} href={entityHref(e)} className="pill bg-accent text-white hover:bg-accent-ink">
                  {e.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {result.events.data.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-black tracking-tight text-ink">
              {t.nav.news} · {result.events.count}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.events.data.map((e) => (
                <EventCard key={e.slug} event={e} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {result.research.data.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-black tracking-tight text-ink">
              {tr ? "Araştırma" : "Research"} · {result.research.count}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.research.data.map((e) => (
                <EventCard key={e.slug} event={e} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {result.videos.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-black tracking-tight text-ink">
              {t.nav.video} · {result.videos.length}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {result.videos.map((v) => (
                <VideoCard key={v.youtube_id} video={v} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {empty && (
          <p className="text-sm text-muted">
            {tr ? `"${q}" için sonuç bulunamadı.` : `No results for "${q}".`}{" "}
            <Link href="/news" className="link-accent">
              {tr ? "Haberlere göz atın →" : "Browse the news →"}
            </Link>
          </p>
        )}
      </div>
    </Page>
  );
}
