import type { ReactNode } from "react";

/** Editorial section header — quiet meta row, accent as punctuation. */
export function SectionHeader({
  index,
  kicker,
  title,
  action,
  className = "",
}: {
  index?: string;
  kicker?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-8 flex items-end justify-between gap-4 border-b border-line/70 pb-5 dark:border-d-line/70 ${className}`}
    >
      <div>
        <div className="flex items-center gap-2.5">
          {index && (
            <span className="font-mono text-[12px] font-bold tabular-nums tracking-wide text-accent">
              {index}
            </span>
          )}
          {index && kicker && (
            <span aria-hidden className="h-px w-3 bg-accent/35" />
          )}
          {kicker && (
            <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted">
              {kicker}
            </span>
          )}
        </div>
        <h2 className="mt-2 text-[26px] font-extrabold leading-[1.05] tracking-tight3 text-ink dark:text-d-ink sm:text-[30px]">
          {title}
        </h2>
      </div>
      {action && (
        <div className="shrink-0 pb-0.5 text-[12px] font-semibold text-accent">{action}</div>
      )}
    </div>
  );
}
