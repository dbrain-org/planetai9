import Link from "next/link";
import type { ReactNode } from "react";
import { entityHref } from "@/lib/entity";
import type { EntityRef } from "@/lib/types";

/** Turn known entity names inside plain text into links (longest name first). */
export function linkifyEntities(text: string, entities: EntityRef[]): ReactNode[] {
  if (!text || entities.length === 0) return [text];

  const names = [
    ...new Map(
      entities
        .flatMap((e) => [e.name])
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
        .map((n) => [n.toLowerCase(), n] as const),
    ).values(),
  ];
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
      parts.push(
        <Link
          key={`${ent.slug}-${i++}`}
          href={entityHref(ent)}
          className="font-semibold text-accent hover:text-accent-ink"
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
  return parts;
}
