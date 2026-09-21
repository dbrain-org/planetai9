import Link from "next/link";
import { getDict, getLocale } from "@/lib/i18n";
import { AuthMenu } from "./AuthMenu";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";
import { LogoMark } from "./Logo";

export async function Masthead() {
  const locale = await getLocale();
  const t = await getDict();

  const nav: { label: string; href: string; external?: boolean }[] = [
    { label: t.nav.news, href: "/" },
    { label: t.nav.world, href: "/news?region=world" },
    { label: t.nav.turkey, href: "/turkiye" },
    { label: t.nav.turkeyLlm, href: "/turkiye-llm" },
    { label: "LLMRadar", href: "https://llmradar.planetai9.com", external: true },
    { label: t.nav.authors, href: "/yazarlar" },
    { label: t.nav.marketplace, href: "/marketplace" },
    { label: t.nav.video, href: "/videos" },
    { label: t.nav.submitNews, href: "/haber-giris" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/80 backdrop-blur-xl dark:border-d-line dark:bg-d-paper/80">
      <div className="mx-auto flex h-[72px] max-w-content items-center gap-4 px-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <LogoMark className="h-8 w-8" />
          <span className="leading-none">
            <span className="block text-[17px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
              PlanetAI9
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-muted sm:block">
              {t.tagline}
            </span>
          </span>
        </Link>

        <nav className="mx-auto hidden min-w-0 items-center gap-0 overflow-x-auto text-[13px] font-medium lg:flex">
          {nav.map((it) =>
            it.external ? (
              <a
                key={it.label}
                href={it.href}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-ink-2 transition-colors hover:bg-wash hover:text-ink dark:text-d-ink-2 dark:hover:bg-d-wash dark:hover:text-d-ink"
              >
                {it.label}
              </a>
            ) : (
              <Link
                key={it.label}
                href={it.href}
                className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-ink-2 transition-colors hover:bg-wash hover:text-ink dark:text-d-ink-2 dark:hover:bg-d-wash dark:hover:text-d-ink"
              >
                {it.label}
              </Link>
            ),
          )}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2.5 lg:ml-0">
          <AuthMenu locale={locale} />
          <LangToggle locale={locale} />
          <ThemeToggle />
        </div>
      </div>

      {/* mobile: single scrollable nav row */}
      <nav className="flex gap-1 overflow-x-auto border-t border-line px-5 py-2 text-[13px] font-medium lg:hidden dark:border-d-line">
        {nav.map((it) =>
          it.external ? (
            <a
              key={it.label}
              href={it.href}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap rounded-lg px-2.5 py-1 text-ink-2 dark:text-d-ink-2"
            >
              {it.label}
            </a>
          ) : (
            <Link
              key={it.label}
              href={it.href}
              className="whitespace-nowrap rounded-lg px-2.5 py-1 text-ink-2 dark:text-d-ink-2"
            >
              {it.label}
            </Link>
          ),
        )}
      </nav>
    </header>
  );
}
