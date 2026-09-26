"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

export type NavItem = { label: string; href: string; external?: boolean };

function isActive(pathname: string, search: string, href: string): boolean {
  if (href.startsWith("http")) return false;
  const [path, qs] = href.split("?");
  if (path === "/") return pathname === "/";
  if (!pathname.startsWith(path!)) return false;
  if (!qs) {
    // Prefer exact section match; allow nested routes (e.g. /turkiye-llm/…)
    if (path === "/news") {
      const region = new URLSearchParams(search).get("region");
      return !region || region === "tr";
    }
    return true;
  }
  const want = new URLSearchParams(qs);
  const have = new URLSearchParams(search);
  for (const [k, v] of want) {
    if (have.get(k) !== v) return false;
  }
  return true;
}

const linkBase =
  "group relative whitespace-nowrap px-1 py-1.5 text-[11px] font-semibold tracking-tight2 transition-colors xl:px-2 xl:text-[12.5px]";

export function NavLinks({ items, mobile = false }: { items: NavItem[]; mobile?: boolean }) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";

  return (
    <>
      {items.map((it) => {
        const active = !it.external && isActive(pathname, search, it.href);
        const className = [
          linkBase,
          mobile ? "rounded-lg px-2.5 py-1.5 text-[12.5px]" : "",
          active
            ? "text-ink dark:text-d-ink"
            : "text-ink/70 hover:text-ink dark:text-d-ink/70 dark:hover:text-d-ink",
          it.external ? "inline-flex items-center gap-0.5" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const underline = !mobile && (
          <span
            aria-hidden
            className={[
              "pointer-events-none absolute inset-x-1 -bottom-0.5 h-[2px] rounded-full bg-ink transition-transform duration-300 origin-left dark:bg-d-ink xl:inset-x-2",
              active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
            ].join(" ")}
          />
        );

        if (it.external) {
          return (
            <a
              key={it.label}
              href={it.href}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
            >
              {it.label}
              <ArrowUpRight className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />
              {underline}
            </a>
          );
        }

        return (
          <Link key={it.label} href={it.href} className={className} aria-current={active ? "page" : undefined}>
            {it.label}
            {underline}
          </Link>
        );
      })}
    </>
  );
}
