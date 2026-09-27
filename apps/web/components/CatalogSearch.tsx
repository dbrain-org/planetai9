"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

const FOLD: Record<string, string> = { ı: "i", ş: "s", ğ: "g", ü: "u", ö: "o", ç: "c" };

/** "Makine Öğrenmesi", "makine ogrenmesi" and "Yapay Zekâ" / "yapay zeka" compare equal. */
function fold(text: string): string {
  return text
    .toLocaleLowerCase("tr")
    .replace(/[ışğüöç]/g, (ch) => FOLD[ch])
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Filters cards marked data-catalog-item inside #catalog. */
export function CatalogSearch({
  placeholder,
  empty,
}: {
  placeholder: string;
  empty: string;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const root = document.getElementById("catalog");
    if (!root) return;
    const needle = query.trim();
    const words = fold(needle).split(/\s+/).filter(Boolean);
    const cards = [...root.querySelectorAll<HTMLElement>("[data-catalog-item]")];
    let shown = 0;
    for (const card of cards) {
      const hay = fold(card.textContent || "");
      const match = words.every((word) => hay.includes(word));
      card.classList.toggle("hidden", !match);
      if (match) shown += 1;
    }
    for (const section of root.querySelectorAll<HTMLElement>("[data-catalog-section]")) {
      const any = [...section.querySelectorAll<HTMLElement>("[data-catalog-item]")].some(
        (card) => !card.classList.contains("hidden"),
      );
      section.classList.toggle("hidden", Boolean(needle) && !any);
    }
    const emptyEl = document.getElementById("catalog-empty");
    if (emptyEl) emptyEl.classList.toggle("hidden", !needle || shown > 0);
  }, [query]);

  return (
    <form role="search" className="relative" onSubmit={(e) => e.preventDefault()}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-full border border-line bg-paper pl-11 pr-4 text-[15px] text-ink shadow-soft outline-none transition-shadow placeholder:text-muted focus:border-accent focus:shadow-raise dark:border-d-line dark:bg-d-paper dark:text-d-ink"
      />
      <p id="catalog-empty" className="mt-4 hidden text-[14px] text-muted">
        {empty}
      </p>
    </form>
  );
}
