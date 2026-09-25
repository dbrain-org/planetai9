import Link from "next/link";
import { LogoMark } from "./Logo";
import { getDict, getLocale } from "@/lib/i18n";
import { PRESENCE_LINKS } from "@/lib/presence";

export async function SiteFooter() {
  const locale = await getLocale();
  const t = await getDict();
  const tr = locale === "tr";

  const explore = [
    { label: tr ? "Gündem" : "News", href: "/" },
    { label: tr ? "Dünya" : "World", href: "/news?region=world" },
    { label: "VeriVatan", href: "/turkiye" },
    { label: tr ? "Türkiye LLM" : "Türkiye LLM", href: "/turkiye-llm" },
    { label: "TAKYAP", href: "/marketplace" },
    { label: tr ? "Üniversite" : "University", href: "/universite" },
    { label: tr ? "Yazarlar" : "Authors", href: "/yazarlar" },
    { label: tr ? "Kişiler" : "People", href: "/kisiler" },
  ];

  const company = [
    { label: tr ? "Biz Kimiz" : "About", href: "/hakkinda" },
    { label: tr ? "Kaynaklar & Güven" : "Sources & Trust", href: "/sources" },
    { label: tr ? "Gizlilik Politikası" : "Privacy Policy", href: "/gizlilik" },
    { label: tr ? "Çerez Politikası" : "Cookie Policy", href: "/cerezler" },
    { label: tr ? "KVKK" : "KVKK", href: "/kvkk" },
    { label: tr ? "Kullanım Şartları" : "Terms of Use", href: "/kullanim" },
    { label: tr ? "Haber Gönder" : "Submit news", href: "/haber-giris" },
  ];

  return (
    <footer className="mt-20 border-t border-line bg-canvas dark:border-d-line dark:bg-d-canvas">
      <div className="mx-auto max-w-content px-5 pt-14 pb-10 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr_1fr_auto]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <LogoMark className="h-9 w-9 rounded-lg" />
              <span className="leading-none">
                <span className="block text-[17px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
                  PlanetAI9
                </span>
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  {t.tagline}
                </span>
              </span>
            </Link>
            <p className="mt-4 text-[14px] leading-relaxed text-ink-2 dark:text-d-ink-2">
              {tr
                ? "Türkiye'nin yapay zekâ medya platformu. Haberler, modeller ve ekosistem sinyalleri tek yerde."
                : "Türkiye's AI media platform. News, models and ecosystem signals in one place."}
            </p>
            <p className="mt-4 text-[12px] leading-relaxed text-muted">
              {tr
                ? "PlanetAI9. Tek Gezegen. Her Yapay Zekâ Sinyali."
                : "PlanetAI9. One Planet. Every AI Signal."}
            </p>
            <p className="mt-4 text-[13px] leading-relaxed text-ink-2 dark:text-d-ink-2">
              {tr ? "Gizlilik soruları için " : "Privacy questions: "}
              <a href="mailto:info@dbrain.tech" className="font-semibold text-ink dark:text-d-ink">
                info@dbrain.tech
              </a>
            </p>
          </div>

          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
              {tr ? "Keşfet" : "Explore"}
            </p>
            <ul className="mt-4 space-y-2.5">
              {explore.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[14px] text-ink-2 transition-colors hover:text-ink dark:text-d-ink-2 dark:hover:text-d-ink"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
              {tr ? "Kurumsal" : "Company"}
            </p>
            <ul className="mt-4 space-y-2.5">
              {company.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[14px] text-ink-2 transition-colors hover:text-ink dark:text-d-ink-2 dark:hover:text-d-ink"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
              {tr ? "Bağlantılar" : "Links"}
            </p>
            <ul className="mt-4 space-y-3">
              {PRESENCE_LINKS.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2.5 text-[14px] font-medium text-ink transition-colors hover:text-ink dark:text-d-ink"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-ink dark:border-d-line dark:text-d-ink">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="text-ink-2 transition-colors group-hover:text-ink dark:text-d-ink-2 dark:group-hover:text-d-ink">
                      {label}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-[12px] text-muted dark:border-d-line sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} PlanetAI9.{" "}
            {tr ? "Tüm hakları saklıdır." : "All rights reserved."}
          </p>
          <p className="sm:text-right">
            {tr ? "Konum: Türkiye · Kuruluş: 2026" : "Based in Türkiye · Est. 2026"}
          </p>
        </div>
      </div>
    </footer>
  );
}
