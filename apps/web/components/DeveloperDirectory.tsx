"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, UserRound } from "lucide-react";
import type { LlmDeveloperCard } from "@/lib/types";

export function DeveloperDirectory({
  initial,
  locale = "tr",
}: {
  initial: LlmDeveloperCard[];
  locale?: "tr" | "en";
}) {
  const tr = locale === "tr";
  const [sort, setSort] = useState<"models" | "name">("models");

  const rows = useMemo(() => {
    return [...initial].sort((a, b) =>
      sort === "name"
        ? a.display_name.localeCompare(b.display_name, tr ? "tr" : "en")
        : b.model_count - a.model_count || a.display_name.localeCompare(b.display_name),
    );
  }, [initial, sort, tr]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "models" | "name")}
          className="field w-auto"
        >
          <option value="models">{tr ? "Modele göre" : "By models"}</option>
          <option value="name">{tr ? "İsme göre" : "By name"}</option>
        </select>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((d) => (
          <Link
            key={d.slug}
            href={`/turkiye-llm/ureticiler/${d.slug}`}
            className="card card-hover group flex flex-col gap-3 p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent dark:bg-accent/15">
                {d.kind === "person" ? <UserRound className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
              </span>
              <span className="badge">{d.kind === "person" ? (tr ? "Kişi" : "Person") : (tr ? "Kurum" : "Org")}</span>
            </div>
            <div>
              <h2 className="text-[16px] font-bold tracking-tight text-ink group-hover:text-accent dark:text-d-ink">
                {d.display_name}
              </h2>
              {d.bio && (
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-2 dark:text-d-ink-2">
                  {d.bio}
                </p>
              )}
            </div>
            <p className="mt-auto text-[12px] text-muted">
              {d.model_count} {tr ? "model" : "models"}
              {d.city ? ` · ${d.city}` : ""}
            </p>
          </Link>
        ))}
      </div>
      {rows.length === 0 && (
        <p className="mt-8 text-[13px] text-muted">{tr ? "Henüz üretici yok." : "No producers yet."}</p>
      )}
    </div>
  );
}
