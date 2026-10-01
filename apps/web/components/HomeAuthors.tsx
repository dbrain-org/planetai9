import Link from "next/link";
import { ArrowRight, PenLine } from "lucide-react";
import { dateLabel } from "@/lib/format";
import type { AuthorRef, ColumnCardLite } from "@/lib/types";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function HomeAuthors({
  authors,
  columns,
  locale,
}: {
  authors: AuthorRef[];
  columns: ColumnCardLite[];
  locale: "tr" | "en";
}) {
  if (authors.length === 0) return null;
  const tr = locale === "tr";
  const latest = new Map<string, ColumnCardLite>();
  for (const c of columns) if (!latest.has(c.author_slug)) latest.set(c.author_slug, c);

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="sec-title">{tr ? "Yazarlar" : "Columnists"}</h2>
        <Link
          href="/yazarlar"
          className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-ink transition-colors hover:text-ink-2 dark:text-d-ink dark:hover:text-d-ink-2"
        >
          {tr ? "Tüm köşe yazıları" : "All columns"} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {authors.map((a) => {
          const col = latest.get(a.slug);
          return (
            <div key={a.slug} className="card flex gap-4 p-5">
              <Link
                href={`/yazarlar/${a.slug}`}
                className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-[18px] font-black text-white ring-2 ring-line dark:bg-white dark:text-ink dark:ring-d-line"
              >
                {a.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.avatar_url} alt={a.name} className="h-full w-full object-cover" />
                ) : (
                  initials(a.name)
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/yazarlar/${a.slug}`}
                  className="block text-[16px] font-extrabold tracking-tight2 text-ink hover:text-accent dark:text-d-ink"
                >
                  {a.name}
                </Link>
                {a.role && <p className="text-[12.5px] text-ink-2 dark:text-d-ink-2">{a.role}</p>}
                {col ? (
                  <Link href={`/kose/${col.slug}`} className="group mt-3 block border-t border-line pt-3 dark:border-d-line">
                    <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-muted">
                      <PenLine className="h-3 w-3" />
                      {tr ? "Son yazısı" : "Latest column"} · {dateLabel(col.published_at, locale)}
                    </span>
                    <span className="mt-1 block text-[15px] font-bold leading-snug text-ink group-hover:text-accent dark:text-d-ink">
                      {col.title}
                    </span>
                  </Link>
                ) : (
                  <p className="mt-3 border-t border-line pt-3 text-[13px] text-muted dark:border-d-line">
                    {tr ? "İlk köşe yazısı çok yakında." : "First column coming soon."}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
