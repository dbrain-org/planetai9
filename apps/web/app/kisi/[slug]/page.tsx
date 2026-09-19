import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
  ImageIcon,
  Newspaper,
  PenLine,
  Play,
} from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { VideoCard } from "@/components/VideoCard";
import { api } from "@/lib/api";
import { entityHref } from "@/lib/entity";
import { dateLabel } from "@/lib/format";
import { getLocale } from "@/lib/i18n";
import type { EntityDetail } from "@/lib/types";

export const revalidate = 180;

const REL_LABEL: Record<string, { tr: string; en: string }> = {
  develops: { tr: "geliştirir", en: "develops" },
  owns: { tr: "sahibi", en: "owns" },
  based_on: { tr: "temeli", en: "based on" },
  competes_with: { tr: "rakip", en: "competes with" },
  powers: { tr: "güç verir", en: "powers" },
  works_at: { tr: "çalışır", en: "works at" },
  published_by: { tr: "yayınlayan", en: "published by" },
  successor_of: { tr: "ardılı", en: "successor of" },
  integrates: { tr: "entegre", en: "integrates" },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const entity = await api<EntityDetail>(`/entities/${slug}`, { revalidate: 180 });
    return {
      title: entity.name,
      description: entity.description ?? undefined,
    };
  } catch {
    return {};
  }
}

export default async function KisiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const tr = locale === "tr";
  let entity: EntityDetail;
  try {
    entity = await api<EntityDetail>(`/entities/${slug}`, { revalidate: 180 });
  } catch {
    notFound();
  }

  if (entity.type !== "person") {
    redirect(`/entities/${entity.slug}`);
  }

  const columns = entity.columns ?? [];
  const images = entity.images ?? [];
  const worksAt = entity.relations.find(
    (r) => r.relation === "works_at" && r.direction === "out",
  );

  return (
    <div className="mx-auto max-w-content">
      <Link
        href="/kisiler"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-accent dark:text-d-ink-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {tr ? "Tüm kişiler" : "All people"}
      </Link>

      <header className="flex flex-col gap-6 border-b border-line pb-8 dark:border-d-line sm:flex-row sm:items-end">
        {entity.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entity.logo_url}
            alt=""
            className="h-24 w-24 shrink-0 rounded-full object-cover bg-wash ring-2 ring-line dark:bg-d-wash dark:ring-d-line sm:h-28 sm:w-28"
          />
        ) : (
          <span className="inline-flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[28px] font-extrabold text-accent dark:bg-accent/20 sm:h-28 sm:w-28 sm:text-[32px]">
            {initials(entity.name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-accent">
            {tr ? "Kişi sayfası" : "Person page"}
          </p>
          <h1 className="mt-1 text-[32px] font-extrabold leading-tight tracking-tight3 text-ink dark:text-d-ink sm:text-[40px]">
            {entity.name}
          </h1>
          {worksAt && (
            <p className="mt-2 text-[15px] text-ink-2 dark:text-d-ink-2">
              {tr ? "Bağlı olduğu kurum:" : "Affiliation:"}{" "}
              <Link href={entityHref(worksAt.entity)} className="font-semibold link-accent">
                {worksAt.entity.name}
              </Link>
            </p>
          )}
          {entity.description && (
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
              {entity.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-1.5 text-[12px] font-semibold text-ink-2 dark:border-d-line dark:bg-d-canvas dark:text-d-ink-2">
              <Newspaper className="h-3.5 w-3.5 text-accent" />
              {entity.event_count ?? entity.latest_events.length} {tr ? "haber" : "news"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-1.5 text-[12px] font-semibold text-ink-2 dark:border-d-line dark:bg-d-canvas dark:text-d-ink-2">
              <Play className="h-3.5 w-3.5 text-accent" />
              {entity.video_count ?? entity.videos.length} {tr ? "video" : "videos"}
            </span>
            {(entity.column_count ?? columns.length) > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-1.5 text-[12px] font-semibold text-ink-2 dark:border-d-line dark:bg-d-canvas dark:text-d-ink-2">
                <PenLine className="h-3.5 w-3.5 text-accent" />
                {entity.column_count ?? columns.length} {tr ? "yazı" : "columns"}
              </span>
            )}
            {entity.website_url && (
              <a
                href={entity.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-1.5 text-[12px] font-semibold text-accent hover:border-accent dark:border-d-line dark:bg-d-canvas"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {tr ? "Web sitesi" : "Website"}
              </a>
            )}
            {entity.author_slug && (
              <Link
                href={`/yazarlar/${entity.author_slug}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-1.5 text-[12px] font-semibold text-accent hover:border-accent dark:border-d-line dark:bg-d-canvas"
              >
                <PenLine className="h-3.5 w-3.5" />
                {tr ? "Yazar profili" : "Author profile"}
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
        <div className="space-y-12">
          <section>
            <h2 className="sec-title mb-5">{tr ? "Haberler" : "News"}</h2>
            {entity.latest_events.length === 0 ? (
              <p className="text-[14px] text-muted">
                {tr ? "Bu kişiyle ilişkili haber yok." : "No related news yet."}
              </p>
            ) : (
              <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2">
                {entity.latest_events.map((e) => (
                  <EventCard key={e.slug} event={e} locale={locale} />
                ))}
              </div>
            )}
          </section>

          {entity.videos.length > 0 && (
            <section>
              <h2 className="sec-title mb-5">{tr ? "Videolar" : "Videos"}</h2>
              <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2">
                {entity.videos.map((v) => (
                  <VideoCard key={v.youtube_id} video={v} locale={locale} />
                ))}
              </div>
            </section>
          )}

          {columns.length > 0 && (
            <section>
              <h2 className="sec-title mb-5">{tr ? "Köşe yazıları" : "Columns"}</h2>
              <div className="space-y-3">
                {columns.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/kose/${c.slug}`}
                    className="card group flex gap-4 p-4 transition-colors hover:border-accent sm:p-5"
                  >
                    {c.hero_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.hero_image_url}
                        alt=""
                        className="hidden h-20 w-28 shrink-0 rounded-lg object-cover sm:block"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-bold leading-snug text-ink group-hover:text-accent dark:text-d-ink">
                        {c.title}
                      </span>
                      {c.dek && (
                        <span className="mt-1 line-clamp-2 block text-[13px] text-ink-2 dark:text-d-ink-2">
                          {c.dek}
                        </span>
                      )}
                      <span className="mt-2 block text-[11px] text-muted">
                        {dateLabel(c.published_at, locale)}
                      </span>
                    </span>
                    <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {images.length > 0 && (
            <section>
              <h2 className="sec-title mb-5 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-accent" />
                {tr ? "Görseller" : "Images"}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img) => {
                  const inner = (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.url}
                      alt={img.caption ?? entity.name}
                      className="aspect-[4/3] w-full rounded-xl object-cover bg-wash dark:bg-d-wash"
                    />
                  );
                  return img.event_slug ? (
                    <Link
                      key={img.url}
                      href={`/news/${img.event_slug}`}
                      className="block overflow-hidden rounded-xl ring-1 ring-line transition hover:ring-accent dark:ring-d-line"
                      title={img.caption ?? undefined}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div
                      key={img.url}
                      className="overflow-hidden rounded-xl ring-1 ring-line dark:ring-d-line"
                    >
                      {inner}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:pt-1">
          <div className="card p-5">
            <h2 className="mb-3 text-[15px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
              {tr ? "İlişkiler" : "Relations"}
            </h2>
            <div className="divide-y divide-line dark:divide-d-line">
              {entity.relations.length === 0 ? (
                <p className="py-2 text-[13px] text-muted">
                  {tr ? "İlişki tanımlı değil." : "No relations."}
                </p>
              ) : (
                entity.relations.map((r, i) => (
                  <Link
                    key={`${r.entity.slug}-${r.relation}-${i}`}
                    href={entityHref(r.entity)}
                    className="flex items-center gap-2 py-2.5 text-[13px] hover:text-accent"
                  >
                    <span className="text-[11px] uppercase tracking-wide text-muted">
                      {r.direction === "in" ? "← " : ""}
                      {REL_LABEL[r.relation]?.[locale] ?? r.relation}
                    </span>
                    <span className="ml-auto font-semibold text-ink dark:text-d-ink">
                      {r.entity.name}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
