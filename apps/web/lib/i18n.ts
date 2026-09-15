import { cookies } from "next/headers";

export const LOCALES = ["tr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "tr";
export const LOCALE_COOKIE = "planetai_locale";

export async function getLocale(): Promise<Locale> {
  try {
    const v = (await cookies()).get(LOCALE_COOKIE)?.value;
    return v === "en" ? "en" : "tr";
  } catch {
    return DEFAULT_LOCALE;
  }
}

const tr = {
  tagline: "Türkiye Yapay Zeka Medya Platformu",
  live: "Canlı Yayın",
  searchPlaceholder: "Haberlerde ara…",
  nav: {
    home: "Ana Sayfa",
    news: "Gündem",
    world: "Dünya",
    turkey: "VeriVatan",
    analysis: "Analiz",
    robotics: "Robotik",
    coding: "Kodlama",
    safety: "Güvenlik",
    regulation: "Regülasyon",
    video: "PlanetAI9 Kanalı",
    marketplace: "TAKYAP",
    authors: "Yazarlar",
    submitNews: "Haber Gönder",
    about: "Biz Kimiz",
  },
  section: {
    latest: "Son Haberler",
    mostRead: "En Çok Okunan",
    trends: "Trendler",
    fromAuthors: "Yazarlardan",
    breaking: "Son Dakika",
    video: "PlanetAI9 Kanalı",
    marketplaceStrip: "TAKYAP — Topluluğun Araçları",
    related: "İlgili Haberler",
  },
  common: {
    seeAll: "Tümünü gör →",
    all: "Tümü",
    latestSort: "En yeni",
    importanceSort: "Önem sırası",
    sourceCount: "kaynak",
    noNews: "Henüz haber yok.",
    quiet: "Sakin.",
    noData: "Veri yok.",
    backHome: "Ana sayfaya dön →",
    notFound: "Sayfa bulunamadı",
    notFoundBody: "Aradığınız haber kaldırılmış veya taşınmış olabilir.",
    footer: "PlanetAI9 — Tek Gezegen. Her Yapay Zekâ Sinyali.",
    sourcesLink: "Kaynaklar & Güven",
  },
  home: {},
  marketplace: {
    title: "TAKYAP",
    lead: "Türk geliştiricilerin paylaştığı açık kaynak yapay zekâ araçları — MCP sunucuları, modeller, ses ve ajan projeleri. Sen de kendi projeni ekle.",
    suggest: "+ Uygulamanı öner",
    suggestTitle: "Uygulamanı öner",
    suggestBody:
      "Yaptığın yapay zekâ uygulamasını PlanetAI9 topluluğuyla paylaş. Gönderiler incelendikten sonra yayınlanır.",
    empty: "Bu kategoride henüz uygulama yok.",
    submitted: "Teşekkürler! Uygulaman inceleme kuyruğuna alındı.",
    send: "Gönder",
    sending: "Gönderiliyor…",
    source: "kaynak ↗",
  },
  newsSubmission: {
    title: "Haber Gönder",
    lead: "Kaçırdığımız bir gelişme mi var? Türkiye'den ya da dünyadan bir yapay zekâ haberini bize ilet — editörlerimiz onayladığında PlanetAI9'da yayınlanır.",
    submitted: "Teşekkürler! Haberin inceleme kuyruğuna alındı.",
    send: "Gönder",
    sending: "Gönderiliyor…",
  },
  authors: {
    title: "Yazarlar",
    lead: "PlanetAI9 köşe yazıları — sektörün kırılma noktaları ve Türkiye'nin yapay zekâ ekosistemi.",
    soon: "Köşe yazıları çok yakında yayında.",
    listLabel: "Yazarlar",
    noPosts: "Henüz köşe yazısı yok.",
    kicker: "Köşe Yazısı",
    allColumns: "← Tüm köşe yazıları",
  },
  event: {
    coveredBy: (n: number) => `${n} kaynak işledi`,
    primary: "Birincil",
    whyMatters: "Neden önemli?",
    score: "Önem puanı",
    relatedVideos: "İlgili PlanetAI9 videoları",
    factors: {
      source_reliability: "Kaynak güvenilirliği",
      independent_sources: "Bağımsız kaynak sayısı",
      entity_impact: "Aktör etkisi",
      novelty: "Yenilik",
      market_impact: "Pazar etkisi",
      velocity: "Yayılma hızı",
    } as Record<string, string>,
  },
  sources: {
    title: "Kaynaklar & Güven",
    lead: "PlanetAI9'daki her haber orijinal yayıncıya bağlanır. Güven ağırlığı, haberin önem puanını etkiler.",
    trust: "güven",
  },
  impact: { low: "düşük etki", medium: "orta etki", high: "yüksek etki", critical: "kritik" } as Record<string, string>,
};

export type DictT = typeof tr;

const en: DictT = {
  tagline: "Türkiye AI Media Platform",
  live: "Live",
  searchPlaceholder: "Search the news…",
  nav: {
    home: "Home",
    news: "News",
    world: "World",
    turkey: "VeriVatan",
    analysis: "Analysis",
    robotics: "Robotics",
    coding: "Coding",
    safety: "Safety",
    regulation: "Regulation",
    video: "PlanetAI9 Channel",
    marketplace: "TAKYAP",
    authors: "Columnists",
    submitNews: "Submit News",
    about: "About",
  },
  section: {
    latest: "Latest News",
    mostRead: "Most Read",
    trends: "Trends",
    fromAuthors: "From Our Columnists",
    breaking: "Breaking",
    video: "PlanetAI9 Channel",
    marketplaceStrip: "TAKYAP — Community Tools",
    related: "Related",
  },
  common: {
    seeAll: "See all →",
    all: "All",
    latestSort: "Newest",
    importanceSort: "By importance",
    sourceCount: "sources",
    noNews: "No news yet.",
    quiet: "Quiet.",
    noData: "No data.",
    backHome: "Back to home →",
    notFound: "Page not found",
    notFoundBody: "This story may have been removed or moved.",
    footer: "PlanetAI9 — One Planet. Every AI Signal.",
    sourcesLink: "Sources & Trust",
  },
  home: {},
  marketplace: {
    title: "TAKYAP",
    lead: "Open-source AI tools shared by Turkish developers — MCP servers, models, speech and agent projects. Add your own.",
    suggest: "+ Submit your app",
    suggestTitle: "Submit your app",
    suggestBody:
      "Share the AI app you built with the PlanetAI9 community. Submissions are published after review.",
    empty: "No apps in this category yet.",
    submitted: "Thanks! Your app is in the review queue.",
    send: "Submit",
    sending: "Sending…",
    source: "source ↗",
  },
  newsSubmission: {
    title: "Submit News",
    lead: "Spotted something we missed? Send us an AI story from Türkiye or the world — once an editor approves it, it goes live on PlanetAI9.",
    submitted: "Thanks! Your story is in the review queue.",
    send: "Submit",
    sending: "Sending…",
  },
  authors: {
    title: "Columnists",
    lead: "PlanetAI9 columns — inflection points in the industry and the AI ecosystem.",
    soon: "Columns coming very soon.",
    listLabel: "Columnists",
    noPosts: "No columns yet.",
    kicker: "Column",
    allColumns: "← All columns",
  },
  event: {
    coveredBy: (n: number) => `Covered by ${n} source${n === 1 ? "" : "s"}`,
    primary: "Primary",
    whyMatters: "Why it matters",
    score: "Importance score",
    relatedVideos: "Related PlanetAI9 videos",
    factors: {
      source_reliability: "Source reliability",
      independent_sources: "Independent sources",
      entity_impact: "Actor impact",
      novelty: "Novelty",
      market_impact: "Market impact",
      velocity: "Velocity",
    } as Record<string, string>,
  },
  sources: {
    title: "Sources & Trust",
    lead: "Every story on PlanetAI9 links back to its original publisher. Trust weight feeds the importance score.",
    trust: "trust",
  },
  impact: { low: "low impact", medium: "medium impact", high: "high impact", critical: "critical" },
};

const DICTS: Record<Locale, DictT> = { tr, en };

export async function getDict(): Promise<DictT> {
  return DICTS[await getLocale()];
}

export function dictFor(locale: Locale): DictT {
  return DICTS[locale];
}

// ---- category + impact labels -------------------------------------------------

// Internal categories collapse into a small, editorial display taxonomy.
export const CATEGORY_BUCKET: Record<string, string> = {
  Models: "AI",
  Companies: "AI",
  Agents: "AI",
  GenerativeAI: "AI",
  VoiceAI: "AI",
  ComputerVision: "AI",
  HealthcareAI: "AI",
  FinanceAI: "AI",
  Robotics: "Robotics",
  AICoding: "Coding",
  AISafety: "Security",
  Regulation: "Regulation",
  Research: "Research",
  Infrastructure: "Infra",
  OpenSource: "OpenSource",
};

const BUCKET_LABEL: Record<string, { tr: string; en: string }> = {
  AI: { tr: "Yapay Zekâ", en: "AI" },
  Robotics: { tr: "Robotik", en: "Robotics" },
  Coding: { tr: "Kodlama", en: "Coding" },
  Security: { tr: "Güvenlik", en: "Security" },
  Regulation: { tr: "Regülasyon", en: "Regulation" },
  Research: { tr: "Araştırma", en: "Research" },
  Infra: { tr: "Altyapı", en: "Infrastructure" },
  OpenSource: { tr: "Açık Kaynak", en: "Open Source" },
};

export function categoryBucket(c: string): string {
  return CATEGORY_BUCKET[c] ?? "AI";
}

export function categoryLabel(c: string, locale: Locale): string {
  return BUCKET_LABEL[categoryBucket(c)]?.[locale] ?? c;
}

export function bucketLabel(bucket: string, locale: Locale): string {
  return BUCKET_LABEL[bucket]?.[locale] ?? bucket;
}

export function impactLabel(i: string, locale: Locale): string {
  return DICTS[locale].impact[i] ?? i;
}
