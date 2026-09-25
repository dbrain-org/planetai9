"use client";

import Link from "next/link";
import type { Locale } from "@/lib/i18n";

/** Required consent box. Blocks submit until checked. */
export function KvkkConsent({
  locale,
  className = "",
}: {
  locale: Locale;
  className?: string;
}) {
  const tr = locale === "tr";
  return (
    <label className={`flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-2 dark:text-d-ink-2 ${className}`}>
      <input
        type="checkbox"
        name="kvkk"
        required
        className="mt-0.5 h-4 w-4 shrink-0 accent-ink dark:accent-d-ink"
      />
      <span>
        {tr ? (
          <>
            <Link
              href="/kvkk"
              className="font-semibold text-ink underline decoration-ink/30 underline-offset-2 dark:text-d-ink"
              onClick={(e) => e.stopPropagation()}
            >
              KVKK Aydınlatma Metni
            </Link>
            ’ni okudum, kişisel verilerimin bu kapsamda işlenmesini kabul ediyorum.
          </>
        ) : (
          <>
            I have read the{" "}
            <Link
              href="/kvkk"
              className="font-semibold text-ink underline decoration-ink/30 underline-offset-2 dark:text-d-ink"
              onClick={(e) => e.stopPropagation()}
            >
              KVKK Privacy Notice
            </Link>{" "}
            and I consent to the processing of my personal data.
          </>
        )}
      </span>
    </label>
  );
}
