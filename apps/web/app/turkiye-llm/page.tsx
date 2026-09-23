import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Building2, MapPin, UserRound } from "lucide-react";
import { Cover } from "@/components/Cover";
import { Meta } from "@/components/Meta";
import { SectionHeader } from "@/components/SectionHeader";
import { TurkeyLlmMap } from "@/components/TurkeyLlmMap";
import { apiSafe } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import type { EventCard, TurkiyeLlmOverview } from "@/lib/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Türkiye LLM",
  description: "Türkiye’de üretilen ve Türkçe için eğitilmiş dil modelleri.",
  openGraph: {
    title: "Türkiye LLM | PlanetAI9",
    description: "Türkiye’de üretilen ve Türkçe için eğitilmiş dil modelleri.",
    url: "/turkiye-llm",
  },
};

const emptyOverview: TurkiyeLlmOverview = {
  kpi: { models: 0, open_weight: 0, producers: 0, radar_ok: false },
  by_technique: [],
  by_year: [],
  by_base_model: [],
  top_producers: [],
  map_pins: [],
  news: [],
  radar_url: "https://llmradar.planetai9.com/#turkish",
};

function BarChart({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <ul className="space-y-3.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3 text-[13px]">
          <span className="w-28 shrink-0 truncate font-medium text-ink-2 dark:text-d-ink-2">
            {item.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent-soft dark:bg-accent/15">
            <div
              className="h-full rounded-full bg-accent/85 transition-[width] duration-700 ease-out"
              style={{ width: `${Math.round((item.count / max) * 100)}%` }}
            />
          </div>
          <span className="w-8 text-right tabular-nums font-semibold text-ink dark:text-d-ink">
            {item.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

function NewsLead({ event, locale, readMore }: { event: EventCard; locale: "tr" | "en"; readMore: string }) {
  return (
    <article className="group">
      <Link href={`/news/${event.slug}`} className="block">
        <Cover
          src={event.image_url}
          category={event.category}
          className="aspect-[16/10]"
          rounded="rounded-card"
          zoom
        />
        <Meta
          summary={event.summary}
          date={event.published_at}
          source={event.top_source?.name}
          locale={locale}
          className="mt-3"
        />
        <h3 className="mt-1.5 text-[22px] font-extrabold leading-[1.2] tracking-tight3 text-ink transition-colors group-hover:text-accent dark:text-d-ink sm:text-[26px]">
          {event.title}
        </h3>
        {event.summary && (
          <p className="mt-2 line-clamp-2 max-w-2xl text-[14px] leading-relaxed text-ink-2 dark:text-d-ink-2">
            {event.summary}
          </p>
        )}
        <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent">
          {readMore} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </article>
  );
}

function NewsTile({ event, locale }: { event: EventCard; locale: "tr" | "en" }) {
  return (
    <article className="group border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0 dark:border-d-line">
      <Link href={`/news/${event.slug}`} className="flex items-start gap-3.5">
        {event.image_url ? (
          <Cover
            src={event.image_url}
            category={event.category}
            className="h-[88px] w-[118px] shrink-0 sm:h-[96px] sm:w-[128px]"
            rounded="rounded-xl"
            zoom
          />
        ) : (
          <span
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 text-[16px] font-bold leading-snug tracking-tight2 text-ink transition-colors group-hover:text-accent dark:text-d-ink">
            {event.title}
          </h4>
          <Meta
            summary={event.summary}
            date={event.published_at}
            source={event.top_source?.name}
            locale={locale}
            className="mt-1.5"
          />
        </div>
      </Link>
    </article>
  );
}

export default async function TurkiyeLlmPage() {
  const locale = await getLocale();
  const tr = locale === "tr";
  const data = await apiSafe<TurkiyeLlmOverview>("/turkiye-llm/overview", emptyOverview, {
    revalidate: 60,
  });

  const yearItems = data.by_year.map((y) => ({
    label: String(y.year),
    count: y.count,
  }));

  const [lead, ...rest] = data.news;
  const sideNews = rest.slice(0, 5);

  return (
    <div className="space-y-20">
      <header className="max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">LLM Radar</p>
        <h1 className="mt-3 text-[40px] font-extrabold leading-[1.02] tracking-tight3 text-ink dark:text-d-ink sm:text-[56px]">
          Türkiye LLM
        </h1>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Türkiye’de üretilen ve Türkçe için eğitilmiş dil modelleri. Kim yaptı, kaç model var, nerede."
            : "Language models built in Türkiye or trained for Turkish. Who made them, how many, where."}
        </p>
        {!data.kpi.radar_ok && (
          <p className="mt-4 text-[13px] text-muted">
            {tr
              ? "Radar’a ulaşılamadı; yalnızca kayıtlı üreticiler ve haberler gösteriliyor."
              : "Couldn’t reach Radar; showing curated producers and news only."}
          </p>
        )}
      </header>

      {/* News top */}
      <section>
        <SectionHeader
          index="01"
          kicker={tr ? "Haberler" : "News"}
          title={tr ? "Dil modeli haberleri" : "Language-model news"}
          action={
            <a
              href={data.radar_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              LLM Radar <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          }
        />
        {lead ? (
          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start lg:gap-8">
            <NewsLead
              event={lead}
              locale={locale}
              readMore={tr ? "Haberi oku" : "Read story"}
            />
            <div className="rounded-card border border-line bg-paper px-4 py-3 dark:border-d-line dark:bg-d-paper sm:px-5 sm:py-4">
              <div>
                {sideNews.map((e) => (
                  <NewsTile key={e.slug} event={e} locale={locale} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-muted">
            {tr ? "Henüz ilgili haber yok." : "No related stories yet."}
          </p>
        )}
      </section>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-line bg-gradient-to-b from-paper to-[#F7F8FA] p-6 dark:border-d-line dark:from-d-paper dark:to-[#12161c] sm:p-7">
          <SectionHeader
            index="02"
            kicker={tr ? "Teknik" : "Technique"}
            title={tr ? "Tekniğe göre" : "By technique"}
            className="mb-6 border-0 pb-0"
          />
          {data.by_technique.length > 0 ? (
            <BarChart items={data.by_technique} />
          ) : (
            <p className="text-[13px] text-muted">{tr ? "Henüz veri yok." : "No data yet."}</p>
          )}
        </section>
        <section className="rounded-card border border-line bg-gradient-to-b from-paper to-[#F7F8FA] p-6 dark:border-d-line dark:from-d-paper dark:to-[#12161c] sm:p-7">
          <SectionHeader
            index="03"
            kicker={tr ? "Yıl" : "Year"}
            title={tr ? "2020’den beri" : "Since 2020"}
            className="mb-6 border-0 pb-0"
          />
          {yearItems.length > 0 ? (
            <BarChart items={yearItems} />
          ) : (
            <p className="text-[13px] text-muted">{tr ? "Henüz veri yok." : "No data yet."}</p>
          )}
        </section>
      </div>

      {/* Producers list */}
      <section>
        <SectionHeader
          index="04"
          kicker={tr ? "Üreticiler" : "Producers"}
          title={tr ? "En aktif üreticiler" : "Most active producers"}
          action={
            <Link href="/turkiye-llm/ureticiler" className="hover:underline">
              {tr ? "Tümü →" : "See all →"}
            </Link>
          }
        />
        <p className="-mt-3 mb-6 max-w-2xl text-[14px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Model sayısı ve açık veri katkısına göre sıralı. En çok üreten ve paylaşanlar üstte."
            : "Ranked by model count and open-data contribution. Top producers first."}
        </p>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {data.top_producers.map((p) => (
            <Link
              key={p.slug}
              href={`/turkiye-llm/ureticiler/${p.slug}`}
              className="group relative flex items-start gap-3.5 overflow-hidden rounded-card border border-line/90 bg-gradient-to-b from-paper to-[#F6F8FB] p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-raise dark:border-d-line dark:from-d-paper dark:to-[#12161c]"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-accent transition-transform duration-300 group-hover:scale-y-100"
              />
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent dark:bg-accent/15">
                {p.kind === "person" ? <UserRound className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-bold text-ink transition-colors group-hover:text-accent dark:text-d-ink">
                  {p.display_name}
                </span>
                <span className="mt-0.5 block text-[12px] text-muted">
                  {p.model_count} {tr ? "model" : "models"}
                  {(p.dataset_count ?? 0) > 0
                    ? ` · ${p.dataset_count} ${tr ? "veri" : "datasets"}`
                    : ""}
                  {p.city ? ` · ${p.city}` : ""}
                </span>
              </span>
            </Link>
          ))}
          {data.top_producers.length === 0 && (
            <p className="col-span-full text-[13px] text-muted">
              {tr ? "Henüz üretici yok." : "No producers yet."}
            </p>
          )}
        </div>
      </section>

      {/* Base models above map */}
      <section>
        <SectionHeader
          index="05"
          kicker={tr ? "Base model" : "Base model"}
          title={tr ? "Fine-tune için kullanılan base’ler" : "Bases used for fine-tuning"}
        />
        <p className="-mt-3 mb-6 max-w-2xl text-[14px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Türk üreticilerin modellerinde bildirilen base model aileleri (örn. Qwen, Llama, Gemma)."
            : "Base-model families declared on Turkish producers’ models (e.g. Qwen, Llama, Gemma)."}
        </p>
        {(data.by_base_model?.length ?? 0) > 0 ? (
          <div className="overflow-x-auto rounded-card border border-line dark:border-d-line">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead className="border-b border-line bg-wash/60 dark:border-d-line dark:bg-d-wash/40">
                <tr>
                  <th className="px-4 py-3 font-bold text-ink-2 dark:text-d-ink-2">
                    {tr ? "Aile" : "Family"}
                  </th>
                  <th className="px-4 py-3 font-bold text-ink-2 dark:text-d-ink-2">
                    {tr ? "Örnek base" : "Example base"}
                  </th>
                  <th className="px-4 py-3 text-right font-bold text-ink-2 dark:text-d-ink-2">
                    {tr ? "Model" : "Models"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-d-line">
                {(data.by_base_model ?? []).map((row) => (
                  <tr key={row.label} className="bg-paper dark:bg-d-paper">
                    <td className="px-4 py-3 font-semibold text-ink dark:text-d-ink">{row.label}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-ink-2 dark:text-d-ink-2">
                      {row.example || "·"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-ink dark:text-d-ink">
                      {row.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-muted">
            {tr ? "Base model bilgisi henüz yok." : "No base-model data yet."}
          </p>
        )}
      </section>

      {/* Map */}
      <section>
        <SectionHeader
          index="06"
          kicker={tr ? "Harita" : "Map"}
          title={tr ? "Nerede" : "Where"}
        />
        <TurkeyLlmMap pins={data.map_pins} locale={locale} />
        {data.map_pins.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {data.map_pins.map((p) => (
              <Link
                key={p.slug}
                href={`/turkiye-llm/ureticiler/${p.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent dark:border-d-line dark:bg-d-paper dark:text-d-ink-2 dark:hover:bg-accent/15 dark:hover:text-blue-300"
              >
                <MapPin className="h-3 w-3 text-accent" />
                {p.name}
                {p.city ? ` · ${p.city}` : ""}
              </Link>
            ))}
          </ul>
        )}
      </section>

      {/* CTA box bottom (same copy as original hero) */}
      <section className="relative overflow-hidden rounded-card border border-line bg-gradient-to-br from-[#EEF4FB] via-paper to-[#F5F7FA] px-6 py-10 dark:border-d-line dark:from-[#121820] dark:via-d-paper dark:to-[#0f141c] sm:px-10 sm:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl dark:bg-accent/20"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-[#94B8E0]/20 blur-3xl dark:bg-accent/10"
        />
        <div className="relative max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">LLM Radar</p>
          <h2 className="mt-3 text-[40px] font-extrabold leading-[1.02] tracking-tight3 text-ink dark:text-d-ink sm:text-[56px]">
            Türkiye LLM
          </h2>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-2 dark:text-d-ink-2">
            {tr
              ? "Türkiye’de üretilen ve Türkçe için eğitilmiş dil modelleri. Kim yaptı, kaç model var, nerede."
              : "Language models built in Türkiye or trained for Turkish. Who made them, how many, where."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/turkiye-llm/ureticiler" className="btn-dark">
              {tr ? "Üreticiler" : "Producers"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={data.radar_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-paper/80 px-4 py-2.5 text-[13px] font-semibold text-ink backdrop-blur transition-colors hover:border-accent hover:text-accent dark:border-d-line dark:bg-d-paper/70 dark:text-d-ink"
            >
              {tr ? "Tam katalog" : "Full catalogue"}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
          {!data.kpi.radar_ok && (
            <p className="mt-4 text-[13px] text-muted">
              {tr
                ? "Radar’a ulaşılamadı; yalnızca kayıtlı üreticiler ve haberler gösteriliyor."
                : "Couldn’t reach Radar; showing curated producers and news only."}
            </p>
          )}
        </div>

        <dl className="relative mt-10 grid gap-4 border-t border-line/70 pt-8 sm:grid-cols-3 dark:border-d-line/70">
          {[
            { label: tr ? "Model" : "Models", value: data.kpi.models },
            { label: "Open-weight", value: data.kpi.open_weight },
            { label: tr ? "Üretici" : "Producers", value: data.kpi.producers },
          ].map((k) => (
            <div key={k.label}>
              <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{k.label}</dt>
              <dd className="mt-1.5 text-[36px] font-extrabold tabular-nums tracking-tight text-ink dark:text-d-ink">
                {k.value.toLocaleString(tr ? "tr-TR" : "en-US")}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
