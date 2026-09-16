import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { MarketplaceCard } from "@/components/MarketplaceCard";
import { MarketplaceForm } from "@/components/MarketplaceForm";
import { apiSafe } from "@/lib/api";
import { getDict, getLocale } from "@/lib/i18n";
import type { MarketplaceApp } from "@/lib/types";

export const revalidate = 120;

const CATS: Record<string, { tr: string; en: string }> = {
  "": { tr: "Tümü", en: "All" },
  mcp: { tr: "MCP", en: "MCP" },
  llm: { tr: "LLM", en: "LLM" },
  stt: { tr: "Konuşma → Metin", en: "Speech → Text" },
  tts: { tr: "Metin → Konuşma", en: "Text → Speech" },
  agent: { tr: "Ajanlar", en: "Agents" },
  tool: { tr: "Araçlar", en: "Tools" },
  other: { tr: "Diğer", en: "Other" },
};

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const locale = await getLocale();
  const t = await getDict();
  const tr = locale === "tr";
  const category = (await searchParams).category ?? "";
  const all = await apiSafe<MarketplaceApp[]>("/marketplace", []);
  const apps = category ? all.filter((a) => a.category === category) : all;

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight3 text-ink dark:text-d-ink sm:text-[34px]">
            {t.marketplace.title}
          </h1>
          <p className="mt-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
            {tr ? "Türkiye Açık Kaynak Yapay Zekâ Projeleri" : "Türkiye Open-Source AI Projects"}
          </p>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
            {t.marketplace.lead}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[13px] text-ink-2 dark:text-d-ink-2">
            <span className="font-bold text-ink dark:text-d-ink">{all.length}</span>{" "}
            {tr ? "uygulama" : "apps"}
          </span>
          <Link
            href="#oner"
            className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent dark:bg-white dark:text-ink"
          >
            {t.marketplace.suggest.replace("+ ", "")} <ArrowDown className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <div className="mb-8 flex flex-wrap gap-1.5">
        {Object.entries(CATS).map(([slug, label]) => (
          <Link
            key={slug || "all"}
            href={`/marketplace${slug ? `?category=${slug}` : ""}`}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              category === slug
                ? "bg-ink text-white dark:bg-white dark:text-ink"
                : "bg-wash text-ink-2 hover:bg-line dark:bg-d-wash dark:text-d-ink-2"
            }`}
          >
            {label[locale]}
          </Link>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {apps.map((a) => (
          <MarketplaceCard key={a.slug} app={a} locale={locale} />
        ))}
      </div>
      {apps.length === 0 && <p className="text-sm text-ink-2">{t.marketplace.empty}</p>}

      <section id="oner" className="mt-16 scroll-mt-24">
        <div className="mb-6 border-t-2 border-ink pt-8 dark:border-d-ink">
          <p className="max-w-lg text-[14px] leading-relaxed text-ink-2 dark:text-d-ink-2">
            {t.marketplace.suggestBody}
          </p>
        </div>
        <MarketplaceForm
          locale={locale}
          labels={{
            submitted: t.marketplace.submitted,
            send: t.marketplace.send,
            sending: t.marketplace.sending,
          }}
        />
      </section>
    </div>
  );
}
