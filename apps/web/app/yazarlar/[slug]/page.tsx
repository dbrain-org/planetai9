import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Eye, Heart } from "lucide-react";
import { VideosCard } from "@/components/HomeRail";
import { api, apiSafe } from "@/lib/api";
import { dateLabel } from "@/lib/format";
import { getDict, getLocale } from "@/lib/i18n";
import type { AuthorDetail, ColumnCard, VideoCard } from "@/lib/types";

export const revalidate = 180;

const LINK_LABEL: Record<string, string> = {
  youtube: "YouTube",
  site: "Web",
  x: "X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  spotify: "Spotify",
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
    const { author } = await api<{ author: AuthorDetail }>(`/authors/${slug}`, { revalidate: 180 });
    return { title: author.name, description: author.role ?? undefined };
  } catch {
    return {};
  }
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getDict();
  const tr = locale === "tr";

  let data: { author: AuthorDetail; columns: ColumnCard[] };
  try {
    data = await api(`/authors/${slug}`, { revalidate: 180 });
  } catch {
    notFound();
  }
  const { author, columns } = data;
  const videos = await apiSafe<VideoCard[]>("/videos?limit=5", []);
  const links = Object.entries(author.links ?? {});

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/yazarlar"
        className="mb-6 inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-2 hover:text-ink dark:text-d-ink-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {tr ? "Yazarlar" : "Columnists"}
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        <div>
          <header className="flex flex-col gap-5 border-b border-line pb-8 dark:border-d-line sm:flex-row sm:items-start">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-[24px] font-black text-white dark:bg-white dark:text-ink">
              {author.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={author.avatar_url} alt={author.name} className="h-full w-full object-cover" />
              ) : (
                initials(author.name)
              )}
            </div>
            <div>
              <h1 className="text-[28px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
                {author.name}
              </h1>
              {author.role && (
                <p className="mt-0.5 text-[14px] font-semibold text-accent">{author.role}</p>
              )}
              {author.bio && (
                <p className="mt-3 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
                  {author.bio}
                </p>
              )}
              {links.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {links.map(([k, v]) => (
                    <a
                      key={k}
                      href={v}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pill hover:text-accent"
                    >
                      {LINK_LABEL[k] ?? k} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
          </header>

          <h2 className="sec-title mb-1 mt-8">{tr ? "Köşe yazıları" : "Columns"}</h2>
          {columns.length === 0 ? (
            <div className="card mt-4 p-6 text-[14px] text-ink-2 dark:text-d-ink-2">
              {tr
                ? "İlk köşe yazısı çok yakında. O zamana kadar PlanetAI9 videolarına göz atabilirsin."
                : "The first column is coming soon. In the meantime, browse the PlanetAI9 videos."}
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line dark:divide-d-line">
              {columns.map((c) => (
                <li key={c.slug} className="py-5">
                  <Link href={`/kose/${c.slug}`} className="group block">
                    <h3 className="headline text-xl leading-tight group-hover:text-accent">
                      {c.title}
                    </h3>
                    {c.dek && (
                      <p className="mt-1.5 text-[14px] text-ink-2 dark:text-d-ink-2">{c.dek}</p>
                    )}
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                      <span>{dateLabel(c.published_at, locale)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        <span className="tabular-nums">{c.view_count ?? 0}</span> {tr ? "okuma" : "views"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" />
                        <span className="tabular-nums">{c.like_count ?? 0}</span> {tr ? "beğeni" : "likes"}
                      </span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="space-y-6">
          {videos.length > 0 && (
            <VideosCard
              videos={videos}
              locale={locale}
              t={t}
              title={tr ? "PlanetAI9 videoları" : "PlanetAI9 videos"}
              limit={4}
            />
          )}
          <div className="card p-5">
            <h3 className="text-[14px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
              {tr ? "PlanetAI9 hakkında" : "About PlanetAI9"}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2 dark:text-d-ink-2">
              {tr
                ? "Türkiye'nin yapay zekâ medya platformu. Haberler, köşe yazıları, videolar ve topluluk araçları."
                : "Türkiye's AI media platform. News, columns, videos and community tools."}
            </p>
            <Link href="/hakkinda" className="mt-3 inline-block text-[12px] font-bold text-ink hover:text-ink-2 dark:text-d-ink dark:hover:text-d-ink-2">
              {tr ? "Biz kimiz →" : "About us →"}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
