import { Suspense } from "react";
import Link from "next/link";
import { getDict, getLocale } from "@/lib/i18n";
import { AuthMenu } from "./AuthMenu";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";
import { LogoMark } from "./Logo";
import { NavLinks, type NavItem } from "./NavLinks";

export async function Masthead() {
  const locale = await getLocale();
  const t = await getDict();

  const submit: NavItem = { label: t.nav.submitNews, href: "/haber-giris" };
  const nav: NavItem[] = [
    { label: t.nav.news, href: "/" },
    { label: t.nav.world, href: "/news?region=world" },
    { label: t.nav.turkey, href: "/turkiye" },
    { label: t.nav.turkeyLlm, href: "/turkiye-llm" },
    { label: "LLMRadar", href: "https://llmradar.planetai9.com", external: true },
    { label: t.nav.authors, href: "/yazarlar" },
    { label: t.nav.marketplace, href: "/marketplace" },
    { label: t.nav.university, href: "/universite" },
    { label: t.nav.video, href: "/videos" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-paper/85 backdrop-blur-xl dark:border-d-line/80 dark:bg-d-paper/85">
      <div className="mx-auto flex h-[72px] max-w-content items-center gap-5 px-4 sm:gap-6 sm:px-5 xl:px-8">
        <Link href="/" className="group relative z-10 flex shrink-0 items-center gap-2.5">
          <LogoMark className="h-8 w-8 transition-transform duration-300 group-hover:scale-[1.04]" />
          <span className="leading-none">
            <span className="block text-[17px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
              PlanetAI9
            </span>
            <span className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-muted sm:block">
              {t.tagline}
            </span>
          </span>
        </Link>

        <nav className="hidden shrink-0 items-center lg:flex">
          <Suspense fallback={null}>
            <NavLinks items={[...nav, submit]} />
          </Suspense>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2.5 lg:ml-0">
          <AuthMenu locale={locale} />
          <LangToggle locale={locale} />
          <ThemeToggle />
        </div>
      </div>

      <nav className="flex flex-wrap gap-x-0.5 gap-y-1 border-t border-line/80 px-3 py-2 lg:hidden dark:border-d-line/80">
        <Suspense fallback={null}>
          <NavLinks items={[...nav, submit]} mobile />
        </Suspense>
      </nav>
    </header>
  );
}
