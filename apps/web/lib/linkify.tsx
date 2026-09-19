import Link from "next/link";
import type { ReactNode } from "react";
import { entityHref } from "@/lib/entity";
import type { EntityRef } from "@/lib/types";

/** Turn known entity names inside plain text into links (longest name first). */
export function linkifyEntities(text: string, entities: EntityRef[]): ReactNode[] {
  if (!text || entities.length === 0) return [text];

  // Prefer people, then longer names — avoids "OpenAI" eating "OpenAI Codex" wrong way
  // when both exist; longest-first still wins for multi-word people.
  const ranked = [...entities].sort((a, b) => {
    const pa = a.type === "person" ? 1 : 0;
    const pb = b.type === "person" ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return b.name.length - a.name.length;
  });

  const names = [
    ...new Map(
      ranked
        .map((e) => e.name.trim())
        .filter((n) => n.length >= 3)
        .map((n) => [n.toLowerCase(), n] as const),
    ).values(),
  ].sort((a, b) => b.length - a.length);

  if (names.length === 0) return [text];

  const byLower = new Map(entities.map((e) => [e.name.toLowerCase(), e]));
  const pattern = new RegExp(
    `(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
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
      parts.push(
        <Link
          key={`${ent.slug}-${i++}`}
          href={entityHref(ent)}
          className={
            isPerson
              ? "font-semibold text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
              : "font-semibold text-accent hover:text-accent-ink"
          }
        >
          {raw}
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
