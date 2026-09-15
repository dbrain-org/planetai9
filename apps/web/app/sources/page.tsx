import { apiSafe } from "@/lib/api";
import { getDict, getLocale } from "@/lib/i18n";
import type { SourceRef } from "@/lib/types";

export const revalidate = 3600;

export const metadata = {
  title: "Kaynaklar & Güven",
  description:
    "PlanetAI9 haber kaynakları ve güven ağırlıkları — her haber orijinal yayıncıya bağlanır.",
};

const TYPE_LABEL: Record<string, { tr: string; en: string }> = {
  primary: { tr: "Birincil kaynak", en: "Primary source" },
  official_announcement: { tr: "Resmî duyuru", en: "Official announcement" },
  major_news: { tr: "Büyük haber kuruluşu", en: "Major news outlet" },
  research_paper: { tr: "Araştırma", en: "Research" },
  community: { tr: "Topluluk", en: "Community" },
  social: { tr: "Sosyal medya", en: "Social media" },
};

export default async function SourcesPage() {
  const locale = await getLocale();
  const t = await getDict();
  const sources = await apiSafe<SourceRef[]>("/sources", []);
  const sorted = [...sources].sort((a, b) => b.trust_weight - a.trust_weight);

  return (
    <div className="mx-auto max-w-[980px]">
      <header className="max-w-2xl">
        <h1 className="text-[36px] font-extrabold tracking-tight3 text-ink dark:text-d-ink sm:text-[44px]">
          {t.sources.title}
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {t.sources.lead}
        </p>
      </header>

      <div className="mt-10 overflow-hidden rounded-card border border-line bg-paper shadow-soft dark:border-d-line dark:bg-d-canvas">
        <ul className="divide-y divide-line dark:divide-d-line">
          {sorted.map((s) => {
            const typeLabel = TYPE_LABEL[s.source_type]?.[locale] ?? s.source_type;
            return (
              <li key={s.slug}>
                <a
                  href={s.homepage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-canvas dark:hover:bg-d-wash/40 sm:flex-nowrap sm:px-6"
                >
                  <span className="min-w-0 flex-1 text-[15px] font-bold tracking-tight2 text-ink group-hover:text-accent dark:text-d-ink">
                    {s.name}
                  </span>
                  <span className="rounded-full bg-wash px-3 py-1 text-[12px] font-medium text-ink-2 dark:bg-d-wash dark:text-d-ink-2">
                    {typeLabel}
                  </span>
                  <span className="w-full text-left text-[12px] tabular-nums text-muted sm:w-24 sm:text-right">
                    {t.sources.trust} {s.trust_weight.toFixed(2)}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
