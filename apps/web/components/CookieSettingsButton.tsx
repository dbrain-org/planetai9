"use client";

import { openCookiePreferences } from "@/components/CookieConsent";

export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={openCookiePreferences}
      className="mt-4 inline-flex rounded-lg border border-line px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-wash dark:border-d-line dark:text-d-ink dark:hover:bg-d-wash"
    >
      {label}
    </button>
  );
}
