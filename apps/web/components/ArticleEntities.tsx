import Link from "next/link";
import { Building2, UserRound } from "lucide-react";
import { entityHref } from "@/lib/entity";
import type { EntityRef } from "@/lib/types";

type EntityRow = { entity: EntityRef; role: string };

const ORG_TYPES = new Set(["company", "institution"]);

/** People (and other entities) linked under a news story or video. */
export function ArticleEntities({
  entities,
  locale = "tr",
  compact = false,
}: {
  entities: EntityRow[];
  locale?: "tr" | "en";
  compact?: boolean;
}) {
  if (!entities.length) return null;
  const tr = locale === "tr";
  const people = entities.filter((e) => e.entity.type === "person");
  const orgs = entities.filter((e) => ORG_TYPES.has(e.entity.type));
  const others = entities.filter(
    (e) => e.entity.type !== "person" && !ORG_TYPES.has(e.entity.type),
  );

  if (compact) {
    if (!people.length && !orgs.length && !others.length) return null;
    return (
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {people.length > 0 && (
          <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            {tr ? "Kişiler" : "People"}
          </span>
        )}
        {people.map(({ entity }) => (
          <Link
            key={entity.slug}
            href={entityHref(entity)}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-semibold text-accent transition-colors hover:bg-accent hover:text-white dark:bg-accent/15"
          >
            <UserRound className="h-3.5 w-3.5" />
            {entity.name}
          </Link>
        ))}
        {orgs.length > 0 && (
          <span className="ml-1 mr-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            {tr ? "Firmalar" : "Companies"}
          </span>
        )}
        {orgs.map(({ entity }) => (
          <Link
            key={entity.slug}
            href={entityHref(entity)}
            className="inline-flex items-center gap-1.5 rounded-full bg-wash px-3 py-1.5 text-[12px] font-semibold text-ink-2 transition-colors hover:bg-line dark:bg-d-wash dark:text-d-ink-2"
          >
            <Building2 className="h-3.5 w-3.5" />
            {entity.name}
          </Link>
        ))}
        {others.map(({ entity, role }) => (
          <Link
            key={entity.slug}
            href={entityHref(entity)}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
              role === "primary"
                ? "bg-ink text-white dark:bg-white dark:text-ink"
                : "bg-wash text-ink-2 hover:bg-line dark:bg-d-wash dark:text-d-ink-2"
            }`}
          >
            {entity.name}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <section className="mt-8 rounded-card border border-line bg-paper p-5 dark:border-d-line dark:bg-d-canvas">
      <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.1em] text-ink-2 dark:text-d-ink-2">
        <UserRound className="h-4 w-4 text-accent" />
        {tr ? "Bu haberde" : "In this story"}
      </h2>

      {people.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            {tr ? "Kişiler" : "People"}
          </p>
          <div className="flex flex-wrap gap-2">
            {people.map(({ entity }) => (
              <Link
                key={entity.slug}
                href={entityHref(entity)}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3.5 py-1.5 text-[13px] font-semibold text-accent transition-colors hover:bg-accent hover:text-white dark:bg-accent/15"
              >
                <UserRound className="h-3.5 w-3.5" />
                {entity.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {orgs.length > 0 && (
        <div className={people.length > 0 ? "mt-4" : "mt-3"}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            {tr ? "Firmalar" : "Companies"}
          </p>
          <div className="flex flex-wrap gap-2">
            {orgs.map(({ entity }) => (
              <Link
                key={entity.slug}
                href={entityHref(entity)}
                className="inline-flex items-center gap-1.5 rounded-full bg-wash px-3.5 py-1.5 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-line dark:bg-d-wash dark:text-d-ink-2"
              >
                <Building2 className="h-3.5 w-3.5" />
                {entity.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div className={people.length > 0 || orgs.length > 0 ? "mt-4" : "mt-3"}>
          {(people.length > 0 || orgs.length > 0) && (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              {tr ? "Ürün & teknoloji" : "Products & tech"}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {others.map(({ entity, role }) => (
              <Link
                key={entity.slug}
                href={entityHref(entity)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  role === "primary"
                    ? "bg-ink text-white hover:bg-accent dark:bg-white dark:text-ink"
                    : "bg-wash text-ink-2 hover:bg-line dark:bg-d-wash dark:text-d-ink-2"
                }`}
              >
                {entity.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
