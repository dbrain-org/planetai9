import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/components/CookieConsent";
import { Masthead } from "@/components/Masthead";
import { PageCommentsMount } from "@/components/PageCommentsMount";
import { SiteFooter } from "@/components/SiteFooter";
import { getLocale } from "@/lib/i18n";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

const SITE = process.env.PLANETAI_SITE_URL ?? "https://planetai9.com";

const SITE_DESCRIPTION =
  "PlanetAI9; Türkiye yapay zeka haberleri ve yapay zeka gündemi, Türkiye açık kaynak veriler, Türkçe açık kaynak LLM ve büyük dil modelleri ile Türkçe yapay zeka eğitimlerini bir araya getiren medya platformudur.";

const SITE_KEYWORDS = [
  "Türkiye yapay zeka haberleri",
  "Türkiye açık kaynak veriler",
  "Türkçe açık kaynak LLM",
  "büyük dil modelleri",
  "Türkçe yapay zeka eğitimleri",
  "Yapay zeka gündemi",
  "PlanetAI9",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "PlanetAI9. Türkiye Yapay Zeka Medya Platformu",
    template: "%s · PlanetAI9",
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: "PlanetAI9",
  openGraph: {
    type: "website",
    siteName: "PlanetAI9",
    locale: "tr_TR",
    url: SITE,
    title: "PlanetAI9. Türkiye Yapay Zeka Medya Platformu",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    site: "@planetai9",
    title: "PlanetAI9. Türkiye Yapay Zeka Medya Platformu",
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
  alternates: { types: { "application/rss+xml": `${SITE}/rss.xml` } },
};

const SITE_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "PlanetAI9",
  alternateName: "Türkiye Yapay Zeka Medya Platformu",
  url: SITE,
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS.join(", "),
  inLanguage: "tr-TR",
});

const THEME_INIT = `try{if(localStorage.getItem('planetai_theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SITE_JSON_LD }} />
      </head>
      <body className="min-h-screen bg-paper font-sans antialiased dark:bg-d-paper">
        <Masthead />
        <main className="mx-auto max-w-content px-5 py-8 sm:px-8 sm:py-12">
          {children}
          <PageCommentsMount locale={locale} />
        </main>
        <SiteFooter />
        <CookieConsent locale={locale} />
      </body>
    </html>
  );
}
