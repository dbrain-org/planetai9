import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleEngagement } from "@/components/ArticleEngagement";
import { api } from "@/lib/api";
import { dateLabel } from "@/lib/format";
import { getDict, getLocale } from "@/lib/i18n";
import type { ColumnDetail } from "@/lib/types";

export const revalidate = 300;

export default async function ColumnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getDict();
  let post: ColumnDetail;
  try {
    post = await api<ColumnDetail>(`/columns/${slug}`, { revalidate: 300 });
  } catch {
    notFound();
  }

  const paragraphs = post.body.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);

  return (
    <article className="mx-auto max-w-2xl py-4">
      <p className="kicker">{t.authors.kicker}</p>
      <h1 className="headline mt-2 text-[2.4rem] leading-[1.1]">{post.title}</h1>
      {post.dek && <p className="mt-4 text-xl leading-relaxed text-ink-2">{post.dek}</p>}
      <div className="mt-5 flex items-center gap-3 border-y border-line py-3 text-sm">
        <Link href={`/yazarlar/${post.author.slug}`} className="font-bold text-ink hover:text-accent">
          {post.author.name}
        </Link>
        {post.author.role && <span className="text-muted">{post.author.role}</span>}
        <span className="ml-auto text-muted">{dateLabel(post.published_at, locale)}</span>
      </div>
      <ArticleEngagement slug={post.slug} locale={locale} kind="column" />

      {post.hero_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.hero_image_url} alt="" className="mt-6 w-full rounded-lg" />
      )}

      <div className="prose-column mt-8">
        {paragraphs.map((p, i) =>
          p.startsWith("## ") ? <h2 key={i}>{p.slice(3)}</h2> : <p key={i}>{p}</p>,
        )}
      </div>

      <div className="mt-10 border-t-2 border-ink pt-4">
        <Link href="/yazarlar" className="text-sm link-accent">
          {t.authors.allColumns}
        </Link>
      </div>
    </article>
  );
}
