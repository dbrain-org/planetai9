import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Newspaper, Play, UserRound } from "lucide-react";
import { apiSafe } from "@/lib/api";
import { entityHref } from "@/lib/entity";
import { getLocale } from "@/lib/i18n";
import type { EntityListItem } from "@/lib/types";

export const revalidate = 180;

export const metadata: Metadata = {
  title: "Kişiler",
  description: "Haberi yapılan ve videoda konuşan isimler. Kişi bazlı arşiv.",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function KisilerPage() {
  const locale = await getLocale();
  const tr = locale === "tr";
  const people = await apiSafe<EntityListItem[]>("/entities?type=person&limit=200", []);
  const sorted = [...people].sort(
    (a, b) => (b.event_count ?? 0) + (b.video_count ?? 0) - ((a.event_count ?? 0) + (a.video_count ?? 0)),
  );

  return (
    <div className="mx-auto max-w-content">
      <header className="mb-10 max-w-2xl">
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-accent">
          {tr ? "Kişi arşivi" : "People archive"}
        </p>
        <h1 className="mt-2 text-[34px] font-extrabold tracking-tight3 text-ink dark:text-d-ink sm:text-[40px]">
          {tr ? "Kişiler" : "People"}
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Haberi yapılan, videoda konuşan veya köşe yazan isimler. Her kişinin sayfasında onunla ilgili haber, video, yazı ve görseller bir arada."
            : "People covered in news, featured in videos, or writing columns. All their PlanetAI9 content in one place."}
        </p>
      </header>

      {sorted.length === 0 ? (
        <p className="text-[15px] text-muted">
          {tr ? "Henüz kişi kaydı yok." : "No people yet."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p) => (
            <Link
              key={p.slug}
              href={entityHref(p)}
              className="card group flex gap-4 p-5 transition-colors hover:border-accent"
            >
              {p.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.logo_url}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-full object-cover bg-wash dark:bg-d-wash"
                />
              ) : (
                <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[15px] font-extrabold text-accent dark:bg-accent/20">
                  {initials(p.name)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[17px] font-extrabold tracking-tight2 text-ink group-hover:text-accent dark:text-d-ink">
                    {p.name}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
                {p.description && (
                  <span className="mt-1 line-clamp-2 block text-[13px] leading-snug text-ink-2 dark:text-d-ink-2">
                    {p.description}
                  </span>
                )}
                <span className="mt-2.5 flex flex-wrap gap-3 text-[11px] font-semibold text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Newspaper className="h-3 w-3" /> {p.event_count ?? 0}{" "}
                    {tr ? "haber" : "news"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Play className="h-3 w-3" /> {p.video_count ?? 0}{" "}
                    {tr ? "video" : "videos"}
                  </span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-10 inline-flex items-center gap-2 text-[13px] text-muted">
        <UserRound className="h-4 w-4" />
        {tr
          ? "Yeni kişiler haber ve videolardan otomatik toplanır."
          : "New people are collected automatically from news and videos."}
      </p>
    </div>
  );
}
