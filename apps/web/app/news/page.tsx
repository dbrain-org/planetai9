import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { Page } from "@/components/Page";
import { apiSafe } from "@/lib/api";
import { bucketLabel, getDict, getLocale } from "@/lib/i18n";
import type { Page as PageT } from "@/lib/types";

export const revalidate = 60;

const WINDOWS = ["", "24h", "7d"] as const;
const REGIONS = ["", "world", "TR"] as const;
const BUCKETS = ["", "AI", "Robotics", "Coding", "Security", "Regulation"] as const;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string; category?: string; sort?: string; window?: string; region?: string }>;
}) {
  const locale = await getLocale();
  const t = await getDict();
  const tr = locale === "tr";
  const sp = await searchParams;
  const bucket = sp.bucket ?? "";
  const SORTS = ["recent", "importance", "views", "comments", "likes"] as const;
  const sort = SORTS.includes(sp.sort as (typeof SORTS)[number])
    ? (sp.sort as (typeof SORTS)[number])
    : "recent";
  const win = WINDOWS.includes(sp.window as (typeof WINDOWS)[number]) ? (sp.window as string) : "";
  const region = REGIONS.includes(sp.region as (typeof REGIONS)[number]) ? (sp.region as string) : "";

  const qs = new URLSearchParams({ limit: "48", sort });
  if (bucket) qs.set("bucket", bucket);
  else if (sp.category) qs.set("category", sp.category);
  if (win) qs.set("window", win);
  if (region) qs.set("region", region);
  const page = await apiSafe<PageT>(`/events?${qs}`, { data: [], next_cursor: null, count: 0 });

  const title = bucket
    ? bucketLabel(bucket, locale)
    : region === "world"
      ? t.nav.world
      : region === "TR"
        ? "Türkiye"
        : t.nav.news;

  // a link that keeps every other filter intact
  const linkWith = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const merged = { bucket, sort, window: win, region, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/news${p.toString() ? `?${p}` : ""}`;
  };

  const activeCount =
    (bucket ? 1 : 0) +
    (region ? 1 : 0) +
    (win ? 1 : 0) +
    (sort !== "recent" ? 1 : 0);

  const Item = ({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) => (
    <Link
      href={href}
      className={`block rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
        on
          ? "bg-ink font-semibold text-white dark:bg-white dark:text-ink"
          : "text-ink-2 hover:bg-wash hover:text-ink dark:text-d-ink-2 dark:hover:bg-d-wash"
      }`}
    >
      {children}
    </Link>
  );

  const Group = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <p className="mb-1.5 px-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );

  const filters = (
    <div className="space-y-6">
      <Group label={tr ? "Kategori" : "Category"}>
        {BUCKETS.map((b) => (
          <li key={b || "all"}>
            <Item href={linkWith({ bucket: b })} on={bucket === b}>
              {b ? bucketLabel(b, locale) : t.common.all}
            </Item>
          </li>
        ))}
      </Group>
      <Group label={tr ? "Bölge" : "Region"}>
        {(
          [
            ["", t.common.all],
            ["world", tr ? "Dünya" : "World"],
            ["TR", "Türkiye"],
          ] as const
        ).map(([r, lbl]) => (
          <li key={r || "both"}>
            <Item href={linkWith({ region: r })} on={region === r}>
              {lbl}
            </Item>
          </li>
        ))}
      </Group>
      <Group label={tr ? "Zaman" : "Time"}>
        {(
          [
            ["", t.common.all],
            ["24h", tr ? "Son 24 saat" : "Last 24h"],
            ["7d", tr ? "Bu hafta" : "This week"],
          ] as const
        ).map(([w, lbl]) => (
          <li key={w || "any"}>
            <Item href={linkWith({ window: w })} on={win === w}>
              {lbl}
            </Item>
          </li>
        ))}
      </Group>
      <Group label={tr ? "Sıralama" : "Sort"}>
        {(
          [
            ["recent", t.common.latestSort],
            ["importance", t.common.importanceSort],
            ["views", tr ? "En çok okunan" : "Most read"],
            ["comments", tr ? "En çok yorum" : "Most commented"],
            ["likes", tr ? "En çok beğeni" : "Most liked"],
          ] as const
        ).map(([s, lbl]) => (
          <li key={s}>
            <Item href={linkWith({ sort: s })} on={sort === s}>
              {lbl}
            </Item>
          </li>
        ))}
      </Group>
    </div>
  );

  return (
    <Page title={title}>
      <div className="grid gap-8 lg:grid-cols-[208px_1fr] lg:gap-12">
        <aside>
          {/* mobile: collapsible */}
          <details className="card mb-2 p-3 lg:hidden">
            <summary className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-ink dark:text-d-ink">
              <SlidersHorizontal className="h-4 w-4" />
              {tr ? "Filtreler" : "Filters"}
              {activeCount > 0 && (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {activeCount}
                </span>
              )}
            </summary>
            <div className="mt-3 border-t border-line pt-3 dark:border-d-line">{filters}</div>
          </details>
          {/* desktop: sticky sidebar */}
          <div className="hidden lg:block lg:sticky lg:top-24">{filters}</div>
        </aside>

        <div>
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {page.data.map((e) => (
              <EventCard key={e.slug} event={e} locale={locale} />
            ))}
          </div>
          {page.data.length === 0 && <p className="text-sm text-ink-2">{t.common.noNews}</p>}
        </div>
      </div>
    </Page>
  );
}
