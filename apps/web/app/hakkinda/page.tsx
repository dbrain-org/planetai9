import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Code2,
  Cpu,
  FileText,
  Globe2,
  Instagram,
  Linkedin,
  Play,
  Shield,
  Users,
  Youtube,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { getLocale } from "@/lib/i18n";

export const revalidate = 86400;

export const metadata = {
  title: "Biz Kimiz",
  description:
    "PlanetAI9 — Türkiye'nin yapay zekâ medya platformu. Haberler, model takibi, açık kaynak ve teknoloji politikaları.",
};

const FEATURES = [
  { icon: FileText, tr: "AI Haberleri", en: "AI News" },
  { icon: Cpu, tr: "Model Takibi", en: "Model Tracking" },
  { icon: Code2, tr: "Açık Kaynak", en: "Open Source" },
  { icon: Shield, tr: "Teknoloji Politikaları", en: "Tech Policy" },
] as const;

const STATS = [
  {
    icon: Play,
    href: "https://www.youtube.com/@planetai9",
    external: true,
    valueTr: "Yeni İçerikler",
    valueEn: "New Videos",
    labelTr: "YouTube Kanalında",
    labelEn: "On YouTube",
  },
  {
    icon: Users,
    href: "https://www.youtube.com/@planetai9",
    external: true,
    valueTr: "1K+",
    valueEn: "1K+",
    labelTr: "Geniş Topluluk",
    labelEn: "Growing Community",
  },
  {
    icon: CalendarDays,
    href: "#baglantilar",
    external: false,
    valueTr: "7+",
    valueEn: "7+",
    labelTr: "Farklı Platform",
    labelEn: "Platforms",
  },
  {
    icon: Globe2,
    href: "/news",
    external: false,
    valueTr: "Daha Fazlası",
    valueEn: "Explore More",
    labelTr: "Gündeme git",
    labelEn: "Go to news",
  },
] as const;

type LinkItem = {
  label: string;
  href: string;
  display: string;
  hue: string;
  Icon: typeof Youtube;
};

const LINKS: LinkItem[] = [
  {
    label: "YouTube",
    href: "https://www.youtube.com/@planetai9",
    display: "youtube.com/@planetai9",
    hue: "#FF0000",
    Icon: Youtube,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/showcase/planetai9media",
    display: "linkedin.com/showcase/planetai9media",
    hue: "#0A66C2",
    Icon: Linkedin,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/planetai9media",
    display: "instagram.com/planetai9media",
    hue: "#E4405F",
    Icon: Instagram,
  },
  {
    label: "Spotify",
    href: "https://open.spotify.com/show/033ICMyCiAQh4Ynsx9vkg5",
    display: "open.spotify.com/show/033ICMyCiAQh4Ynsx9vkg5",
    hue: "#1DB954",
    Icon: Play,
  },
  {
    label: "LLMRadar",
    href: "https://llmradar.planetai9.com",
    display: "llmradar.planetai9.com",
    hue: "#1D4ED8",
    Icon: Globe2,
  },
  {
    label: "Digital Brain",
    href: "https://dbrain.tech",
    display: "dbrain.tech",
    hue: "#7C3AED",
    Icon: Cpu,
  },
  {
    label: "Oppy",
    href: "https://oppy.dbrain.tech",
    display: "oppy.dbrain.tech",
    hue: "#111827",
    Icon: Shield,
  },
];

function NetworkGlobe() {
  return (
    <figure className="relative mx-auto w-full max-w-[400px] lg:max-w-none lg:justify-self-end">
      <div className="relative aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/about-globe.png"
          alt=""
          className="h-full w-full object-contain"
        />
      </div>
    </figure>
  );
}

export default async function AboutPage() {
  const locale = await getLocale();
  const tr = locale === "tr";

  const p1 = tr
    ? "Türkiye'nin ve Türkçe konuşan izleyicinin penceresinden yapay zekâ, açık kaynak modeller, veri egemenliği ve teknoloji politikaları. PlanetAI9; haberleri, model duyurularını, araçları ve sektördeki kırılma noktalarını tek bir yerde toplar."
    : "AI, open-source models, data sovereignty and tech policy — from the perspective of Türkiye and the Turkish-speaking audience. PlanetAI9 brings together the news, model announcements, tools and the industry's inflection points in one place.";
  const p2 = tr
    ? "Yeni içerikler için PlanetAI9 YouTube kanalına abone olmayı unutmayın."
    : "Subscribe to the PlanetAI9 YouTube channel for new content.";

  return (
    <div className="mx-auto max-w-[1100px]">
      {/* Hero */}
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:gap-10">
        <div className="max-w-xl">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-muted dark:text-d-ink-2">
            {tr ? "Hakkımızda" : "About"}
          </p>
          <h1 className="mt-3 text-[40px] font-extrabold tracking-tight3 text-ink dark:text-d-ink sm:text-[48px]">
            {tr ? "Biz Kimiz" : "Who We Are"}
          </h1>
          <p className="mt-5 text-[16px] leading-relaxed text-ink-2 dark:text-d-ink-2">{p1}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-muted dark:text-d-ink-2">{p2}</p>
        </div>
        <NetworkGlobe />
      </section>

      {/* Identity card */}
      <section className="mt-12 overflow-hidden rounded-card-lg border border-line bg-paper shadow-soft dark:border-d-line dark:bg-d-canvas">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
          <div>
            <div className="flex items-center gap-3">
              <LogoMark className="h-12 w-12 rounded-xl" />
              <div>
                <p className="text-[22px] font-black tracking-tight3 text-ink dark:text-d-ink">PlanetAI9</p>
                <p className="text-[13px] font-medium text-ink-2 dark:text-d-ink-2">
                  {tr ? "Yapay Zekâ Medya Platformu" : "AI Media Platform"}
                </p>
              </div>
            </div>
            <p className="mt-5 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">{p1}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {FEATURES.map(({ icon: Icon, tr: labelTr, en: labelEn }) => (
              <div
                key={labelTr}
                className="flex flex-col items-start gap-2.5 rounded-2xl border border-line bg-canvas/80 px-4 py-4 dark:border-d-line dark:bg-d-wash/50"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent dark:bg-accent/15 dark:text-blue-300">
                  <Icon className="h-4.5 w-4.5" strokeWidth={2.1} />
                </span>
                <span className="text-[13px] font-bold tracking-tight2 text-ink dark:text-d-ink">
                  {tr ? labelTr : labelEn}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid border-t border-line dark:border-d-line sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => {
            const content = (
              <>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-wash text-ink-2 dark:bg-d-wash dark:text-d-ink-2">
                  <s.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold tracking-tight2 text-ink dark:text-d-ink">
                    {tr ? s.valueTr : s.valueEn}
                    {(s.href.includes("youtube") || s.href === "/news") && (
                      <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 text-muted" />
                    )}
                  </span>
                  <span className="block text-[12px] text-muted dark:text-d-ink-2">
                    {tr ? s.labelTr : s.labelEn}
                  </span>
                </span>
              </>
            );
            const className =
              "flex items-center gap-3 px-5 py-4 transition-colors hover:bg-canvas dark:hover:bg-d-wash/40 sm:border-r sm:border-line sm:last:border-r-0 dark:sm:border-d-line";
            return s.external ? (
              <a
                key={s.valueTr}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                {content}
              </a>
            ) : (
              <Link key={s.valueTr} href={s.href} className={className}>
                {content}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Links */}
      <section id="baglantilar" className="mt-14 scroll-mt-24">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id="iletisim" className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
            {tr ? "Bağlantılar & İletişim" : "Links & Contact"}
          </h2>
          <Link
            href="/news"
            className="shrink-0 text-[13px] font-semibold text-accent hover:text-accent-ink"
          >
            {tr ? "Tüm İçerikler" : "All Content"} →
          </Link>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LINKS.map(({ label, href, display, hue, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full items-center gap-3 rounded-2xl border border-line bg-paper px-3.5 py-3.5 shadow-soft transition-all duration-250 hover:-translate-y-0.5 hover:shadow-raise dark:border-d-line dark:bg-d-canvas"
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
                  style={{ backgroundColor: hue }}
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold tracking-tight2 text-ink dark:text-d-ink">
                    {label}
                  </span>
                  <span className="block truncate text-[11px] text-muted dark:text-d-ink-2">{display}</span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted transition-colors group-hover:text-accent" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
