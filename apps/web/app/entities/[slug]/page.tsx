import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EventCard } from "@/components/EventCard";
import { VideoCard } from "@/components/VideoCard";
import { Page } from "@/components/Page";
import { api } from "@/lib/api";
import { entityHref } from "@/lib/entity";
import { getDict, getLocale } from "@/lib/i18n";
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

export default async function EntityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getDict();
  let entity: EntityDetail;
  try {
    entity = await api<EntityDetail>(`/entities/${slug}`, { revalidate: 180 });
  } catch {
    notFound();
  }

  if (entity.type === "person") {
    redirect(`/kisi/${entity.slug}`);
  }

  const tr = locale === "tr";

  return (
    <Page title={entity.name} lead={entity.description ?? undefined}>
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-black tracking-tight text-ink">{t.section.latest}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {entity.latest_events.map((e) => (
                <EventCard key={e.slug} event={e} locale={locale} />
              ))}
              {entity.latest_events.length === 0 && (
                <p className="text-sm text-muted">{t.common.noNews}</p>
              )}
            </div>
          </section>

          {entity.videos.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-black tracking-tight text-ink">{t.section.video}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {entity.videos.map((v) => (
                  <VideoCard key={v.youtube_id} video={v} locale={locale} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside>
          <div className="card p-4">
            <h2 className="mb-2 text-[15px] font-black tracking-tight text-ink">
              {tr ? "İlişkiler" : "Relations"}
            </h2>
            <div className="divide-y divide-line">
              {entity.relations.map((r, i) => (
                <Link
                  key={i}
                  href={entityHref(r.entity)}
                  className="flex items-center gap-2 py-2.5 text-sm hover:text-accent"
                >
                  <span className="text-[11px] uppercase tracking-wide text-muted">
                    {r.direction === "out" ? "" : "← "}
                    {REL_LABEL[r.relation]?.[locale] ?? r.relation}
                  </span>
                  <span className="ml-auto font-semibold text-ink">{r.entity.name}</span>
                </Link>
              ))}
              {entity.relations.length === 0 && (
                <p className="py-2 text-sm text-muted">{tr ? "İlişki tanımlı değil." : "No relations."}</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </Page>
  );
}
