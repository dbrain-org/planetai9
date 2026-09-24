import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { entityHref } from "@/lib/entity";
import type { EntityRef } from "@/lib/types";

/** Only people + firms/institutions — never models/products or junk auto-people. */
const LINKABLE_TYPES = new Set(["person", "company", "institution"]);

const JUNK_LAST = new Set([
  "çağrı",
  "çağrısı",
  "cagri",
  "cagrisi",
  "merkezi",
  "platform",
  "program",
  "island",
  "group",
  "fund",
  "labs",
  "mode",
  "cloud",
  "holding",
  "services",
  "commission",
  "court",
  "command",
  "video",
  "ads",
  "router",
  "karnesi",
]);

const JUNK_ANY = new Set([
  "kuantum",
  "quantum",
  "veri",
  "merkez",
  "merkezi",
  "platform",
  "program",
  "hit",
  "dynamic",
  "island",
  "business",
  "pace",
  "car",
  "çağrı",
  "çağrısı",
  "cagri",
  "cagrisi",
]);

function looksLikePersonName(name: string): boolean {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return false;
  if (name.length < 5 || name.length > 60) return false;
  const last = parts[parts.length - 1]!.toLowerCase().replace(/^[''`-]+|[''`-]+$/g, "");
  if (JUNK_LAST.has(last)) return false;
  if (/(çağrısı|cagrisi|merkezi|platformu|programı|programi)$/i.test(last)) return false;
  for (const p of parts) {
    const low = p.toLowerCase().replace(/^[''`-]+|[''`-]+$/g, "");
    if (JUNK_ANY.has(low) || low.length < 2) return false;
    if (p[0] !== p[0]!.toUpperCase()) return false;
  }
  return true;
}

function isLinkable(entity: EntityRef): boolean {
  if (!LINKABLE_TYPES.has(entity.type)) return false;
  if (entity.type === "person" && !looksLikePersonName(entity.name)) return false;
  return true;
}

type PhraseHit = { phrase: string; entity: EntityRef };

/** Collect name + aliases for matching; longest phrases first. */
function phrasesFor(entities: EntityRef[]): PhraseHit[] {
  const seen = new Set<string>();
  const out: PhraseHit[] = [];
  for (const entity of entities.filter(isLinkable)) {
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
  return out.sort((a, b) => {
    if (b.phrase.length !== a.phrase.length) return b.phrase.length - a.phrase.length;
    const rank = (e: EntityRef) => (e.type === "person" ? 2 : 1);
    return rank(b.entity) - rank(a.entity);
  });
}

/** Turn known person / company / institution names inside plain text into links.
 *  Each entity is linked at most once (first hit). Pass the same `linked` Set across
 *  paragraphs so an article doesn't re-link the same name 50 times. */
export function linkifyEntities(
  text: string,
  entities: EntityRef[],
  linked?: Set<string>,
): ReactNode[] {
  if (!text || entities.length === 0) return [text];

  const ranked = phrasesFor(entities);
  if (ranked.length === 0) return [text];

  const used = linked ?? new Set<string>();
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
    if (ent && !used.has(ent.slug)) {
      used.add(ent.slug);
      const isPerson = ent.type === "person";
      const isOrg = ent.type === "company" || ent.type === "institution";
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
