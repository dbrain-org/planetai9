import { DataShareForm } from "@/components/DataShareForm";
import { ResourceLinkCard } from "@/components/ResourceLinkCard";
import { SectionHeader } from "@/components/SectionHeader";
import { apiSafe } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { DATA_CATEGORIES, DATA_KIND_LABEL, kindLabel } from "@/lib/turkey";
import type { CuratedLink, OpenDatasetCard } from "@/lib/types";

export const revalidate = 60;

/** Map legacy curated kinds onto current VeriVatan sections. */
function normalizeKind(kind: string): string {
  if (kind === "siber_hukuk") return "hukuk";
  if (kind === "portal" || kind === "istatistik" || kind === "yerel" || kind === "akademik") {
    return kind === "akademik" ? "genel" : "kurumsal";
  }
  if (kind === "nlp") return "corpus";
  return kind;
}

export default async function TurkiyePage() {
  const locale = await getLocale();
  const tr = locale === "tr";

  const [trData, trShare, producerData] = await Promise.all([
    apiSafe<CuratedLink[]>("/curated/tr_data", []),
    apiSafe<CuratedLink[]>("/curated/tr_share", []),
    apiSafe<OpenDatasetCard[]>("/turkiye-llm/open-datasets", [], { revalidate: 3600 }),
  ]);

  const note = (l: CuratedLink) => (tr ? l.note_tr : l.note_en) ?? "";
  const knownKeys = new Set<string>(DATA_CATEGORIES.map((c) => c.key));

  const curatedBy = (key: string) =>
    trData.filter((d) => normalizeKind(d.kind) === key);
  const openBy = (key: string) =>
    producerData.filter((d) => (d.category || "genel") === key);

  const otherCurated = trData.filter((d) => !knownKeys.has(normalizeKind(d.kind)));
  const otherOpen = producerData.filter((d) => !knownKeys.has(d.category || "genel"));

  let sectionIdx = 0;
  const nextIndex = () => String(++sectionIdx).padStart(2, "0");

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
            ? "Türkiye'deki açık veri kaynakları ve üretici veri setleri: kurumsal, corpus, SFT, finans, medya, hukuk, güvenlik."
            : "Open data and producer datasets from Türkiye: institutional, corpus, SFT, finance, media, legal, security."}
        </p>
      </header>

      {DATA_CATEGORIES.map((cat) => {
        const curated = curatedBy(cat.key);
        const open = openBy(cat.key);
        const total = curated.length + open.length;
        if (total === 0) return null;
        return (
          <section key={cat.key} id={cat.key}>
            <SectionHeader
              index={nextIndex()}
              kicker={tr ? "Sınıf" : "Class"}
              title={tr ? cat.titleTr : cat.titleEn}
              action={
                <span className="!font-medium tabular-nums !text-ink-2 dark:!text-d-ink-2">
                  {total} {tr ? "kaynak" : "resources"}
                </span>
              }
            />
            <p className="-mt-3 mb-8 max-w-2xl text-[14px] leading-relaxed text-ink-2 dark:text-d-ink-2">
              {tr ? cat.leadTr : cat.leadEn}
            </p>
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {curated.map((d) => (
                <ResourceLinkCard
                  key={d.id}
                  href={d.url}
                  name={d.name}
                  note={note(d)}
                  badge={kindLabel(DATA_KIND_LABEL, d.kind, locale)}
                />
              ))}
              {open.map((d) => (
                <ResourceLinkCard
                  key={d.url}
                  href={d.url}
                  name={d.name}
                  badge={tr ? "Üretici" : "Producer"}
                  meta={
                    d.downloads > 0
                      ? `${d.producer_name} · ${d.downloads.toLocaleString(tr ? "tr-TR" : "en")} DL`
                      : d.producer_name
                  }
                />
              ))}
            </div>
          </section>
        );
      })}

      {(otherCurated.length > 0 || otherOpen.length > 0) && (
        <section>
          <SectionHeader
            index={nextIndex()}
            kicker={tr ? "Sınıf" : "Class"}
            title={tr ? "Diğer" : "Other"}
            action={
              <span className="!font-medium tabular-nums !text-ink-2 dark:!text-d-ink-2">
                {otherCurated.length + otherOpen.length} {tr ? "kaynak" : "resources"}
              </span>
            }
          />
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {otherCurated.map((d) => (
              <ResourceLinkCard
                key={d.id}
                href={d.url}
                name={d.name}
                note={note(d)}
                badge={kindLabel(DATA_KIND_LABEL, d.kind, locale)}
              />
            ))}
            {otherOpen.map((d) => (
              <ResourceLinkCard
                key={d.url}
                href={d.url}
                name={d.name}
                badge={tr ? "Üretici" : "Producer"}
                meta={d.producer_name}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader
          index={nextIndex()}
          kicker={tr ? "Topluluk" : "Community"}
          title={tr ? "Türkçe veri paylaşımı" : "Turkish data sharing"}
        />
        <p className="-mt-3 mb-7 max-w-2xl text-[14px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Türkçe veri seti ve corpus paylaşımlarını sen de öner. Sınıf seçip gönder; editörlerimiz inceledikten sonra burada yayınlanır."
            : "Suggest Turkish datasets and corpora. Pick a class; they appear here after editors review."}
        </p>

        {trShare.length > 0 && (
          <div className="mb-10 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {trShare.map((o) => (
              <ResourceLinkCard
                key={o.id}
                href={o.url}
                name={o.name}
                note={note(o)}
                badge={kindLabel(DATA_KIND_LABEL, o.kind, locale)}
              />
            ))}
          </div>
        )}

        <DataShareForm locale={locale} />
      </section>
    </div>
  );
}
