import type { Metadata } from "next";
import { api, apiSafe } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import type { HfShare, LlmDeveloperDetail } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Building2, ExternalLink, UserRound } from "lucide-react";
import { CommentSection } from "@/components/CommentSection";

export const revalidate = 180;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await apiSafe<LlmDeveloperDetail | null>(
    `/turkiye-llm/developers/${slug}`,
    null,
    { revalidate: 180 },
  );
  if (!detail) {
    return { title: "Üretici — Türkiye LLM" };
  }
  const desc = detail.bio?.slice(0, 160) || `${detail.display_name} — Türkiye LLM üreticisi`;
  return {
    title: `${detail.display_name} — Türkiye LLM`,
    description: desc,
    openGraph: {
      title: `${detail.display_name} | Türkiye LLM`,
      description: desc,
      url: `/turkiye-llm/ureticiler/${detail.slug}`,
    },
  };
}

function ShareRows({ items, tr }: { items: HfShare[]; tr: boolean }) {
  return (
    <div className="mt-3 divide-y divide-line border-y border-line dark:divide-d-line dark:border-d-line">
      {items.map((item) => (
        <a
          key={item.url}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block hover:bg-wash/60 dark:hover:bg-d-wash/40"
        >
          <div className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-ink dark:text-d-ink">{item.name}</p>
              <p className="text-[12px] text-muted">
                {item.pipeline ? item.pipeline : "Hugging Face"}
                {item.downloads > 0
                  ? ` · ${item.downloads.toLocaleString(tr ? "tr-TR" : "en")} DL`
                  : ""}
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-accent" />
          </div>
        </a>
      ))}
    </div>
  );
}

function HfShares({ detail, tr }: { detail: LlmDeveloperDetail; tr: boolean }) {
  const hf = detail.hf ?? { llm: [], tts: [], datasets: [] };
  const groups = [
    { key: "llm", title: "LLM", items: hf.llm },
    { key: "tts", title: "TTS", items: hf.tts },
    { key: "data", title: tr ? "Veri" : "Data", items: hf.datasets },
  ].filter((g) => g.items.length > 0);
  if (groups.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-ink-2 dark:text-d-ink-2">
        {tr ? "Hugging Face paylaşımları" : "Hugging Face shares"}
      </h2>
      <p className="mt-2 text-[13px] text-muted">
        {tr
          ? "Bu üreticinin açık model, ses ve veri setleri."
          : "This producer’s public models, speech, and datasets."}
      </p>
      <div className="mt-6 space-y-8">
        {groups.map((g) => (
          <div key={g.key}>
            <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
              {g.title} · {g.items.length}
            </h3>
            <ShareRows items={g.items} tr={tr} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function UreticiDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const tr = locale === "tr";

  let detail: LlmDeveloperDetail;
  try {
    detail = await api<LlmDeveloperDetail>(`/turkiye-llm/developers/${slug}`, { revalidate: 180 });
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto grid max-w-content gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <article className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          <Link href="/turkiye-llm" className="hover:underline">
            Türkiye LLM
          </Link>
          {" · "}
          <Link href="/turkiye-llm/ureticiler" className="hover:underline">
            {tr ? "Üreticiler" : "Producers"}
          </Link>
        </p>
        <div className="mt-4 flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent dark:bg-accent/15">
            {detail.kind === "person" ? <UserRound className="h-7 w-7" /> : <Building2 className="h-7 w-7" />}
          </span>
          <div>
            <h1 className="text-[30px] font-extrabold tracking-tight3 text-ink dark:text-d-ink sm:text-[36px]">
              {detail.display_name}
            </h1>
            <p className="mt-1 text-[13px] text-muted">
              {detail.kind === "person" ? (tr ? "Kişi" : "Person") : tr ? "Kurum" : "Organization"}
              {detail.city ? ` · ${detail.city}` : ""}
              {` · ${detail.model_count} ${tr ? "model" : "models"}`}
            </p>
          </div>
        </div>

        {detail.bio && (
          <p className="mt-6 text-[16px] leading-relaxed text-ink-2 dark:text-d-ink-2">{detail.bio}</p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          {(() => {
            const web = detail.website_url?.trim() || null;
            const hf = detail.hf_url?.trim() || null;
            const linkedin = detail.linkedin_url?.trim() || null;
            const github = detail.github_url?.trim() || null;
            const same = Boolean(web && hf && web === hf);
            return (
              <>
                {web && (
                  <a
                    href={web}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost inline-flex items-center gap-1.5 text-[13px]"
                  >
                    {same || (web.includes("huggingface.co") && !hf)
                      ? "Hugging Face"
                      : "Web"}{" "}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {hf && !same && (
                  <a
                    href={hf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost inline-flex items-center gap-1.5 text-[13px]"
                  >
                    Hugging Face <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {github && (
                  <a
                    href={github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost inline-flex items-center gap-1.5 text-[13px]"
                  >
                    GitHub <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {linkedin && (
                  <a
                    href={linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost inline-flex items-center gap-1.5 text-[13px]"
                  >
                    LinkedIn <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </>
            );
          })()}
        </div>

        <HfShares detail={detail} tr={tr} />

        <section className="mt-10">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-ink-2 dark:text-d-ink-2">
            {tr ? "Modeller (LLM Radar)" : "Models (LLM Radar)"}
          </h2>
          {detail.models.length > 0 ? (
            <div className="mt-3 divide-y divide-line border-y border-line dark:divide-d-line dark:border-d-line">
              {detail.models.map((m, i) => {
                const href = m.source_url || m.website_url;
                const key = href || `${m.name}-${i}`;
                const row = (
                  <div className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink dark:text-d-ink">{m.name}</p>
                      <p className="text-[12px] text-muted">
                        {m.technique || (tr ? "Teknik belirtilmemiş" : "Technique n/a")}
                        {m.downloads > 0 ? ` · ${m.downloads.toLocaleString(tr ? "tr-TR" : "en")} DL` : ""}
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-accent" />
                  </div>
                );
                return href ? (
                  <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="block hover:bg-wash/60 dark:hover:bg-d-wash/40">
                    {row}
                  </a>
                ) : (
                  <div key={key}>{row}</div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-muted">
              {tr
                ? "Bu üreticiye bağlı model satırı yok. Tam liste için LLM Radar’a bakın."
                : "No model rows for this producer. Check LLM Radar for the full list."}
            </p>
          )}
        </section>

        <section className="mt-12">
          {detail.curated ? (
            <CommentSection slug={detail.slug} locale={locale} kind="developer" />
          ) : (
            <p className="text-[13px] text-muted">
              {tr
                ? "Yorumlar yalnızca kayıtlı üretici sayfalarında açık."
                : "Comments are open on curated producer pages only."}
            </p>
          )}
        </section>
      </article>

      <aside className="lg:pt-2">
        <div className="rounded-card border border-line bg-canvas p-5 dark:border-d-line dark:bg-d-canvas">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
            {tr ? "Detay" : "Details"}
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2 dark:text-d-ink-2">
            {tr
              ? "Skor, teknik not ve tam liste LLM Radar’da."
              : "Scores, tech notes, and the full list are on LLM Radar."}
          </p>
          <a
            href="https://llmradar.planetai9.com/#turkish"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline"
          >
            LLM Radar <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </aside>
    </div>
  );
}
