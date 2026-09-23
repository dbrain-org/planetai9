// Editorial reference data for the "Türkiye'de Yapay Zekâ" page.
// The link cards (open-data resources + ecosystem) now live in the DB
// (curated_links) and are edited from the /yazar studio. Only the facts grid
// and the kind→label maps stay here.

import type { Locale } from "@/lib/i18n";

const label = (tr: string, en: string) => ({ tr, en });

export const DATA_KIND_LABEL: Record<string, { tr: string; en: string }> = {
  kurumsal: label("Kurumsal", "Institutional"),
  corpus: label("LLM corpus", "LLM corpus"),
  sft: label("Finetuning / SFT", "Finetuning / SFT"),
  finans: label("Finans", "Finance"),
  medya: label("Medya", "Media"),
  hukuk: label("Hukuk", "Legal"),
  guvenlik: label("Güvenlik", "Security"),
  sektorel: label("Sektörel", "Sectoral"),
  genel: label("Genel", "General"),
  // legacy
  siber_hukuk: label("Siber & hukuk", "Cyber & legal"),
  portal: label("Portal", "Portal"),
  istatistik: label("İstatistik", "Statistics"),
  nlp: label("Türkçe NLP", "Turkish NLP"),
  akademik: label("Akademik", "Academic"),
  yerel: label("Yerel yönetim", "Local government"),
};

/** VeriVatan section order — curated kind + open-dataset category */
export const DATA_CATEGORIES = [
  {
    key: "kurumsal",
    titleTr: "Kurumsal veriler",
    titleEn: "Institutional data",
    leadTr: "Kamu ve kurum portallarından resmi istatistik ve açık veri.",
    leadEn: "Official statistics and open data from public institutions.",
  },
  {
    key: "corpus",
    titleTr: "LLM corpus",
    titleEn: "LLM corpus",
    leadTr: "Pretraining ve dil modeli eğitimi için Türkçe corpus’lar.",
    leadEn: "Turkish corpora for pretraining and language-model training.",
  },
  {
    key: "sft",
    titleTr: "Finetuning / SFT",
    titleEn: "Finetuning / SFT",
    leadTr: "Instruction, etiketli ve supervised fine-tuning veri setleri.",
    leadEn: "Instruction, labeled, and supervised fine-tuning datasets.",
  },
  {
    key: "finans",
    titleTr: "Finans",
    titleEn: "Finance",
    leadTr: "Borsa, bankacılık ve finans odaklı Türkçe veri setleri.",
    leadEn: "Turkish datasets for markets, banking, and finance.",
  },
  {
    key: "medya",
    titleTr: "Medya & haber",
    titleEn: "Media & news",
    leadTr: "Haber, sınıflandırma ve medya içerik veri setleri.",
    leadEn: "News, classification, and media-content datasets.",
  },
  {
    key: "hukuk",
    titleTr: "Hukuk",
    titleEn: "Legal",
    leadTr: "Mevzuat, hukuki NLI ve hukuk LLM veri setleri.",
    leadEn: "Statutes, legal NLI, and law-domain LLM datasets.",
  },
  {
    key: "guvenlik",
    titleTr: "Güvenlik",
    titleEn: "Security",
    leadTr: "Siber güvenlik, CVE ve güvenlik eğitim veri setleri.",
    leadEn: "Cybersecurity, CVE, and security training datasets.",
  },
  {
    key: "sektorel",
    titleTr: "Diğer sektörel",
    titleEn: "Other sectoral",
    leadTr: "Sağlık, afet ve diğer dikey alanlara özel veri setleri.",
    leadEn: "Health, disaster, and other vertical-domain datasets.",
  },
  {
    key: "genel",
    titleTr: "Genel bilgiler",
    titleEn: "General catalogs",
    leadTr: "Kataloglar, depolar ve sınıflanamayan açık veri noktaları.",
    leadEn: "Catalogs, repositories, and uncategorizable open-data points.",
  },
] as const;

export const EDUCATION_KIND_LABEL: Record<string, { tr: string; en: string }> = {
  herkes: label("Herkes İçin AI", "AI for everyone"),
  derin: label("Derin eğitimler", "Deep tracks"),
  meslek: label("Meslekler değişiyor", "Jobs are changing"),
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
