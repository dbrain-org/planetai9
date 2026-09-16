import { ArrowUpRight } from "lucide-react";
import { DataShareForm } from "@/components/DataShareForm";
import { SectionHeader } from "@/components/SectionHeader";
import { apiSafe } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { DATA_KIND_LABEL, kindLabel } from "@/lib/turkey";
import type { CuratedLink } from "@/lib/types";

export const revalidate = 60;

export default async function TurkiyePage() {
  const locale = await getLocale();
  const tr = locale === "tr";

  const [trData, trShare] = await Promise.all([
    apiSafe<CuratedLink[]>("/curated/tr_data", []),
    apiSafe<CuratedLink[]>("/curated/tr_share", []),
  ]);

  const note = (l: CuratedLink) => (tr ? l.note_tr : l.note_en) ?? "";

  return (
    <div className="space-y-16">
      <header className="max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          {tr ? "Açık veri" : "Open data"}
        </p>
        <h1 className="mt-3 text-[36px] font-extrabold leading-[1.03] tracking-tight3 text-ink dark:text-d-ink sm:text-[48px]">
          VeriVatan
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Türkiye'deki açık veri kaynakları ve Türkçe veri setleri."
            : "Open data sources and Turkish datasets from Türkiye."}
        </p>
      </header>

      <section>
        <SectionHeader
          index="01"
          kicker={tr ? "Kaynaklar" : "Sources"}
          title={tr ? "Açık Veri Kaynakları" : "Open Data Sources"}
        />
        <p className="-mt-3 mb-7 max-w-2xl text-[14px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Kamu portalları, istatistik servisleri ve açık araştırma veri setleri."
            : "Public portals, statistics services and open research datasets."}
        </p>

        {trData.length > 0 ? (
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
        ) : (
          <p className="text-[13px] text-muted">{tr ? "Henüz kart yok." : "No cards yet."}</p>
        )}
      </section>

      <section>
        <SectionHeader
          index="02"
          kicker={tr ? "Topluluk" : "Community"}
          title={tr ? "Türkçe veri paylaşımı" : "Turkish data sharing"}
        />
        <p className="-mt-3 mb-7 max-w-2xl text-[14px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Türkçe veri seti ve corpus paylaşımlarını sen de öner — editörlerimiz inceledikten sonra burada yayınlanır."
            : "Suggest Turkish datasets and corpora — they appear here after our editors review them."}
        </p>

        {trShare.length > 0 && (
          <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trShare.map((o) => (
              <a
                key={o.id}
                href={o.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card card-hover group p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="badge">{tr ? "Paylaşım" : "Shared"}</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-accent" />
                </div>
                <h4 className="mt-2 text-[15px] font-bold tracking-tight2 text-ink group-hover:text-accent dark:text-d-ink">
                  {o.name}
                </h4>
                {note(o) && (
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-2 dark:text-d-ink-2">
                    {note(o)}
                  </p>
                )}
              </a>
            ))}
          </div>
        )}

        <DataShareForm locale={locale} />
      </section>
    </div>
  );
}
