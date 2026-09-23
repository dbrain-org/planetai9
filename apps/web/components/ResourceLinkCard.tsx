import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

/** Split "Provider · Title" / "Provider - Title" into meta + headline when present. */
export function splitResourceTitle(name: string): { meta?: string; title: string } {
  const parts = name.split(/\s+[—–·•-]\s+/);
  if (parts.length >= 2 && parts[0]!.trim().length > 0 && parts[0]!.trim().length <= 28) {
    return { meta: parts[0]!.trim(), title: parts.slice(1).join(" · ").trim() };
  }
  return { title: name };
}

export function ResourceLinkCard({
  href,
  name,
  note,
  badge,
  meta,
  footer,
}: {
  href: string;
  name: string;
  note?: string;
  /** Explicit badge (e.g. kind label). Overrides auto-split meta. */
  badge?: string;
  /** Extra meta under the title row (e.g. producer link text). */
  meta?: ReactNode;
  footer?: ReactNode;
}) {
  const split = splitResourceTitle(name);
  const eyebrow = badge ?? split.meta;
  const title = badge ? name : split.title;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line/90 bg-gradient-to-b from-paper to-[#F6F8FB] p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-raise dark:border-d-line dark:from-d-paper dark:to-[#12161c]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-accent transition-transform duration-300 group-hover:scale-y-100"
      />
      <div className="flex items-start justify-between gap-3">
        {eyebrow ? (
          <span className="inline-flex max-w-[85%] items-center rounded-md bg-accent-soft px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.1em] text-accent dark:bg-accent/15 dark:text-blue-300">
            {eyebrow}
          </span>
        ) : (
          <span />
        )}
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
      </div>
      <h3 className="mt-3.5 text-[15.5px] font-bold leading-snug tracking-tight2 text-ink transition-colors group-hover:text-accent dark:text-d-ink">
        {title}
      </h3>
      {meta && (
        <div className="mt-1.5 text-[12px] font-medium text-muted">{meta}</div>
      )}
      {note ? (
        <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {note}
        </p>
      ) : (
        <span className="flex-1" />
      )}
      {footer && <div className="mt-3 pt-3 text-[12px] text-muted">{footer}</div>}
    </a>
  );
}
