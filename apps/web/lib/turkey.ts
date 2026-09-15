// Editorial reference data for the "Türkiye'de Yapay Zekâ" page.
// The link cards (open-data resources + ecosystem) now live in the DB
// (curated_links) and are edited from the /yazar studio. Only the facts grid
// and the kind→label maps stay here.

import type { Locale } from "@/lib/i18n";

const label = (tr: string, en: string) => ({ tr, en });

export const DATA_KIND_LABEL: Record<string, { tr: string; en: string }> = {
  portal: label("Portal", "Portal"),
  istatistik: label("İstatistik", "Statistics"),
  nlp: label("Türkçe NLP", "Turkish NLP"),
  akademik: label("Akademik", "Academic"),
  yerel: label("Yerel yönetim", "Local government"),
};

export const KIND_LABEL: Record<string, { tr: string; en: string }> = {
  kurum: label("Kurum", "Institution"),
  lab: label("Laboratuvar", "Lab"),
  şirket: label("Şirket", "Company"),
  model: label("Model", "Model"),
  girişim: label("Girişim", "Startup"),
  topluluk: label("Topluluk", "Community"),
};

/** kind slug → display label, with a graceful fallback to the raw slug. */
export function kindLabel(
  map: Record<string, { tr: string; en: string }>,
  kind: string,
  locale: Locale,
): string {
  return map[kind]?.[locale] ?? kind;
}

export const TR_FACTS: { label: { tr: string; en: string }; value: { tr: string; en: string } }[] = [
  {
    label: label("Ulusal Strateji", "National Strategy"),
    value: label("2021–2025 Ulusal Yapay Zekâ Stratejisi", "2021–2025 National AI Strategy"),
  },
  {
    label: label("Koordinasyon", "Coordination"),
    value: label(
      "Cumhurbaşkanlığı Dijital Dönüşüm Ofisi + Sanayi ve Teknoloji Bakanlığı",
      "Presidency's Digital Transformation Office + Ministry of Industry & Technology",
    ),
  },
  {
    label: label("Türkçe LLM", "Turkish LLM"),
    value: label(
      "T3 AI, Kumru, Trendyol ve TÜBİTAK açık Türkçe modeller yayınlıyor",
      "T3 AI, Kumru, Trendyol and TÜBİTAK release open Turkish models",
    ),
  },
  {
    label: label("Etkinlik", "Event"),
    value: label("TEKNOFEST yapay zekâ yarışmaları", "TEKNOFEST AI competitions"),
  },
  {
    label: label("Veri koruma", "Data protection"),
    value: label("KVKK (6698 sayılı Kanun) çerçevesi", "KVKK (Law 6698) framework"),
  },
  {
    label: label("Açık veri", "Open data"),
    value: label("data.gov.tr ve TÜİK veri portalları", "data.gov.tr and TÜİK data portals"),
  },
];
