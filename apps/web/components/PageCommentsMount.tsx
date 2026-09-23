"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { CommentSection } from "@/components/CommentSection";

/** Stable page keys for catalog-style comments (not news articles / producers). */
function pageKeyFromPath(pathname: string, search: string): string | null {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";

  // Auth / studio / admin — no public comments
  if (/^\/(giris|yazar|yonetim)(\/|$)/.test(path)) return null;

  // Already have dedicated comment threads
  if (/^\/news\/[^/]+$/.test(path)) return null;
  if (/^\/turkiye-llm\/ureticiler\/[^/]+$/.test(path)) return null;

  if (path === "/") return "home";
  if (path === "/turkiye") return "verivatan";
  if (path === "/universite") return "universite";
  if (path === "/news") {
    const region = new URLSearchParams(search).get("region");
    return region === "world" ? "news-world" : "news";
  }

  const key = path
    .replace(/^\//, "")
    .replace(/\//g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return key.length > 0 ? key : null;
}

function PageCommentsInner({ locale }: { locale: "tr" | "en" }) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";

  const pageKey = useMemo(() => pageKeyFromPath(pathname, search), [pathname, search]);
  if (!pageKey) return null;

  return (
    <div className="mt-16 border-t border-line pt-10 dark:border-d-line">
      <CommentSection slug={pageKey} locale={locale} kind="page" />
    </div>
  );
}

/** Site-wide page comments under main content (skips article/producer/admin routes). */
export function PageCommentsMount({ locale = "tr" }: { locale?: "tr" | "en" }) {
  return (
    <Suspense fallback={null}>
      <PageCommentsInner locale={locale} />
    </Suspense>
  );
}
