import { ArrowUpRight } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { apiSafe } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { DATA_KIND_LABEL, KIND_LABEL, TR_FACTS, kindLabel } from "@/lib/turkey";
import type { CuratedLink } from "@/lib/types";

export const revalidate = 60;

export default async function TurkiyePage() {
  const locale = await getLocale();
  const tr = locale === "tr";

  const [trData, trEcosystem] = await Promise.all([
    apiSafe<CuratedLink[]>("/curated/tr_data", []),
    apiSafe<CuratedLink[]>("/curated/tr_ecosystem", []),
  ]);

  const note = (l: CuratedLink) => (tr ? l.note_tr : l.note_en) ?? "";

  return (
    <div className="space-y-16">
      <header className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0A1020] via-[#111827] to-[#1B2A4A] px-6 py-10 text-white sm:px-10 sm:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#E30A17]/20 blur-3xl"
        />
        <p className="relative text-[11px] font-bold uppercase tracking-[0.2em] text-blue-300">
          {tr ? "Ekosistem Raporu" : "Ecosystem Report"}
        </p>
        <h1 className="relative mt-3 max-w-3xl text-[36px] font-extrabold leading-[1.03] tracking-tight3 sm:text-[48px]">
          {tr ? "Türkiye'de Yapay Zekâ" : "AI in Türkiye"}
        </h1>
        <p className="relative mt-4 max-w-2xl text-[15px] leading-relaxed text-white/65">
          {tr
            ? "Ulusal strateji, Türkçe dil modelleri ve üniversite laboratuvarları etrafında hızla şekillenen ekosistem — açık veri kaynakları ve kilit kurumlar tek sayfada."
            : "An ecosystem taking shape fast around a national strategy, Turkish language models and university labs — open-data resources and the key institutions on one page."}
        </p>

        <dl className="relative mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TR_FACTS.map((f) => (
            <div
              key={f.label.tr}
              className="rounded-xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm"
            >
              <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                {f.label[locale]}
              </dt>
              <dd className="mt-1.5 text-[13px] font-semibold leading-snug text-white/90">
                {f.value[locale]}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      {/* Türkiye Data */}
      <section className="rounded-[22px] border border-line bg-canvas p-6 sm:p-8 dark:border-d-line dark:bg-d-canvas">
        <SectionHeader
          index="01"
          kicker={tr ? "Veri" : "Data"}
          title="Türkiye Data"
        />
        <p className="-mt-3 mb-7 max-w-2xl text-[14px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Türkiye'den açık veri kaynakları — kamu portalları, istatistik servisleri ve Türkçe pre-training veri setleri."
            : "Open-data resources from Türkiye — public portals, statistics services and Turkish pre-training datasets."}
        </p>

        {trData.length > 0 && (
          <>
            <p className="eyebrow mb-4">{tr ? "Açık Veri Kaynakları" : "Open Data Resources"}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trData.map((d) => (
                <a
                  key={d.id}
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card card-hover group bg-paper p-5 dark:bg-d-paper"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="badge">{kindLabel(DATA_KIND_LABEL, d.kind, locale)}</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-accent" />
                  </div>
                  <h4 className="mt-2 text-[15px] font-bold tracking-tight2 text-ink group-hover:text-accent dark:text-d-ink">
                    {d.name}
                  </h4>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-2 dark:text-d-ink-2">
                    {note(d)}
                  </p>
                </a>
              ))}
            </div>
          </>
        )}
        <p className="mt-4 text-[12px] text-muted">
          {tr
            ? "Kaynak önerisi veya düzeltme için Biz Kimiz sayfasından ulaşabilirsiniz."
            : "Suggest a resource or a correction via the About page."}
        </p>
      </section>

      {/* Ekosistem */}
      <section>
        <SectionHeader
          index="02"
          kicker={tr ? "Kurumlar" : "Institutions"}
          title={tr ? "Ekosistem" : "The Ecosystem"}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trEcosystem.map((o) => (
            <a
              key={o.id}
              href={o.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card card-hover group p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="badge">{kindLabel(KIND_LABEL, o.kind, locale)}</span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-accent" />
              </div>
              <h3 className="mt-2 text-[15px] font-bold tracking-tight2 text-ink group-hover:text-accent dark:text-d-ink">
                {o.name}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2 dark:text-d-ink-2">
                {note(o)}
              </p>
            </a>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-muted">
          {tr
            ? "Liste PlanetAI9 editörlerince derlenmiştir; eksik ya da yanlış bir bilgi için Biz Kimiz sayfasından ulaşabilirsiniz."
            : "Curated by PlanetAI9 editors; reach us via the About page for corrections."}
        </p>
      </section>
    </div>
  );
}
