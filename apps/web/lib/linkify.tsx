import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { entityHref } from "@/lib/entity";
import type { EntityRef } from "@/lib/types";

const ORG_TYPES = new Set(["company", "institution"]);

type PhraseHit = { phrase: string; entity: EntityRef };

/** Collect name + aliases for matching; longest phrases first. */
function phrasesFor(entities: EntityRef[]): PhraseHit[] {
  const seen = new Set<string>();
  const out: PhraseHit[] = [];
  for (const entity of entities) {
    const candidates = [entity.name, ...(entity.aliases ?? [])]
      .map((p) => p.trim())
      .filter((p) => p.length >= 3);
    for (const phrase of candidates) {
      const key = phrase.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ phrase, entity });
    }
  }
  // People/orgs slightly ahead of same-length product names; longest still wins.
  return out.sort((a, b) => {
    if (b.phrase.length !== a.phrase.length) return b.phrase.length - a.phrase.length;
    const rank = (e: EntityRef) =>
      e.type === "person" ? 3 : ORG_TYPES.has(e.type) ? 2 : 1;
    return rank(b.entity) - rank(a.entity);
  });
}

/** Turn known entity names (and aliases) inside plain text into links. */
export function linkifyEntities(text: string, entities: EntityRef[]): ReactNode[] {
  if (!text || entities.length === 0) return [text];

  const ranked = phrasesFor(entities);
  if (ranked.length === 0) return [text];

  const byLower = new Map(ranked.map((h) => [h.phrase.toLowerCase(), h.entity]));
  const pattern = new RegExp(
    `(${ranked.map((h) => h.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );

  const parts: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const raw = match[0] ?? "";
    if (start > last) parts.push(text.slice(last, start));
    const ent = byLower.get(raw.toLowerCase());
    if (ent) {
      const isPerson = ent.type === "person";
      const isOrg = ORG_TYPES.has(ent.type);
      parts.push(
        <Link
          key={`${ent.slug}-${i++}`}
          href={entityHref(ent)}
          className={
            isPerson
              ? "font-semibold text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
              : isOrg
                ? "inline-flex items-baseline gap-0.5 font-semibold text-accent underline decoration-accent/35 underline-offset-2 hover:decoration-accent"
                : "font-semibold text-accent underline decoration-accent/25 underline-offset-2 hover:decoration-accent"
          }
        >
          {raw}
          {isOrg && (
            <span
              aria-hidden
              className="relative top-px inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-current/40 text-current"
            >
              <ArrowUpRight className="h-2.5 w-2.5" strokeWidth={2.5} />
            </span>
          )}
        </Link>,
      );
    } else {
      parts.push(raw);
    }
    last = start + raw.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : [text];
}
