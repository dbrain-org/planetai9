import Link from "next/link";
import { AuthorApplyForm } from "@/components/AuthorApplyForm";
import { Page } from "@/components/Page";
import { apiSafe } from "@/lib/api";
import { dateLabel } from "@/lib/format";
import { getDict, getLocale } from "@/lib/i18n";
import type { AuthorRef, ColumnCard } from "@/lib/types";

export const revalidate = 120;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function AuthorsPage() {
  const locale = await getLocale();
  const t = await getDict();
  const tr = locale === "tr";
  const [authors, columns] = await Promise.all([
    apiSafe<AuthorRef[]>("/authors", []),
    apiSafe<ColumnCard[]>("/columns?limit=40", []),
  ]);

  return (
    <Page title={t.authors.title} lead={t.authors.lead}>
      {authors.length > 0 && (
        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          {authors.map((a) => (
            <Link
              key={a.slug}
              href={`/yazarlar/${a.slug}`}
              className="card card-hover flex items-center gap-4 p-5"
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-[18px] font-black text-white dark:bg-white dark:text-ink">
                {a.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.avatar_url} alt={a.name} className="h-full w-full object-cover" />
                ) : (
                  initials(a.name)
                )}
              </span>
              <span>
                <span className="block text-[15px] font-bold text-ink dark:text-d-ink">{a.name}</span>
                {a.role && (
                  <span className="block text-[12px] text-ink-2 dark:text-d-ink-2">{a.role}</span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}

      <h2 className="sec-title mb-5">{tr ? "Son köşe yazıları" : "Latest columns"}</h2>
      {columns.length === 0 ? (
        <p className="text-sm text-muted">{t.authors.soon}</p>
      ) : (
        <ul className="mb-14 divide-y divide-line border-t-2 border-ink dark:divide-d-line dark:border-d-ink">
          {columns.map((c) => (
            <li key={c.slug} className="py-5">
              <Link href={`/kose/${c.slug}`} className="group block">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                  {c.author.name}
                  {c.author.role ? ` · ${c.author.role}` : ""}
                </p>
                <h3 className="headline mt-1 text-xl leading-tight group-hover:text-accent">
                  {c.title}
                </h3>
                {c.dek && <p className="mt-1.5 text-[14px] text-ink-2 dark:text-d-ink-2">{c.dek}</p>}
                <p className="mt-2 text-[11px] text-muted">{dateLabel(c.published_at, locale)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-14">
        <AuthorApplyForm locale={locale} />
      </section>
    </Page>
  );
}
