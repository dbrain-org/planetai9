"use client";

import { Cookie, Settings2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

const STORAGE = "planetai_cookie_consent";
const OPEN_EVENT = "planetai-open-cookies";

type Choice = {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

const NONE: Choice = { functional: false, analytics: false, marketing: false };
const ALL: Choice = { functional: true, analytics: true, marketing: true };

function readSaved(): Choice | null {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Choice>;
    return {
      functional: Boolean(parsed.functional),
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
}

function persist(choice: Choice) {
  localStorage.setItem(STORAGE, JSON.stringify(choice));
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const COPY = {
  tr: {
    title: "Çerez tercihleri",
    lead: "Zorunlu çerezler sitenin çalışmasını sağlar. İşlevsel, analitik ve pazarlama çerezleri yalnızca sizin izninizle açılır.",
    policy: "Çerez Politikası",
    see: "Bkz. ",
    manage: "Tercihleri yönet",
    reject: "Reddet",
    save: "Seçimleri kaydet",
    accept: "Kabul et",
    note: "İzne bağlı kategoriler varsayılan olarak kapalıdır.",
    necessary: "Zorunlu çerezler",
    necessaryBody:
      "Sitenin güvenliğini sağlamak, temel işlevleri sürdürmek, formları korumak ve çerez tercihlerini saklamak için kullanılır.",
    functional: "İşlevsel çerezler",
    functionalBody:
      "Dil, bölge ve benzeri tercihleri hatırlayıp site deneyimini kişiselleştirmek için kullanılır.",
    analytics: "Performans ve analitik çerezler",
    analyticsBody:
      "Sayfa görüntülemelerini, trafik kaynaklarını ve kullanım istatistiklerini anlamak için kullanılır.",
    marketing: "Pazarlama çerezleri",
    marketingBody:
      "İlgi alanına yönelik içerik, kampanya ölçümü ve reklam performansı için kullanılabilir.",
  },
  en: {
    title: "Cookie Preferences",
    lead: "Strictly necessary cookies keep the website working. Functional, analytics, and marketing cookies are enabled only with your consent.",
    policy: "Cookie Policy",
    see: "See our ",
    manage: "Manage Preferences",
    reject: "Reject",
    save: "Save Choices",
    accept: "Accept",
    note: "Consent-based categories are off by default.",
    necessary: "Strictly Necessary Cookies",
    necessaryBody:
      "Used to keep the website secure, maintain essential functionality, protect forms, and store cookie preferences.",
    functional: "Functional Cookies",
    functionalBody:
      "Used to remember language, region, preference, and similar choices to personalize the website experience.",
    analytics: "Performance and Analytics Cookies",
    analyticsBody:
      "Used to understand page views, traffic sources, and usage statistics so we can improve the website.",
    marketing: "Marketing Cookies",
    marketingBody:
      "May be used for interest-based content, campaign measurement, and advertising performance.",
  },
};

export function CookieConsent({ locale }: { locale: Locale }) {
  const t = COPY[locale];
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const [choice, setChoice] = useState<Choice>(NONE);

  useEffect(() => {
    const saved = readSaved();
    if (saved) setChoice(saved);
    else setOpen(true);
    setReady(true);
    const show = () => {
      setChoice(readSaved() ?? NONE);
      setManage(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  if (!ready || !open) return null;

  const finish = (next: Choice) => {
    persist(next);
    setChoice(next);
    setOpen(false);
    setManage(false);
  };

  const toggle = (key: keyof Choice) => setChoice((c) => ({ ...c, [key]: !c[key] }));

  const categories = [
    { key: "necessary" as const, title: t.necessary, body: t.necessaryBody, locked: true, on: true },
    { key: "functional" as const, title: t.functional, body: t.functionalBody, locked: false, on: choice.functional },
    { key: "analytics" as const, title: t.analytics, body: t.analyticsBody, locked: false, on: choice.analytics },
    { key: "marketing" as const, title: t.marketing, body: t.marketingBody, locked: false, on: choice.marketing },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] p-3 sm:p-5">
      <div className="mx-auto max-w-4xl rounded-2xl border border-line bg-paper p-4 text-ink shadow-raise dark:border-d-line dark:bg-d-canvas dark:text-d-ink sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-wash text-ink dark:bg-d-wash dark:text-d-ink">
            <Cookie className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[16px] font-bold tracking-tight2">{t.title}</p>
              <button
                type="button"
                aria-label={locale === "tr" ? "Kapat" : "Close"}
                onClick={() => setOpen(false)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted hover:bg-wash hover:text-ink dark:hover:bg-d-wash dark:hover:text-d-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2 dark:text-d-ink-2">
              {t.lead} {t.see}
              <Link href="/cerezler" className="font-semibold text-ink underline decoration-ink/30 underline-offset-2 dark:text-d-ink">
                {t.policy}
              </Link>
              .
            </p>
          </div>
        </div>

        {manage && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {categories.map((item) => (
              <label
                key={item.title}
                className={`rounded-xl border border-line bg-canvas p-3 dark:border-d-line dark:bg-d-wash ${
                  item.locked ? "" : "cursor-pointer"
                }`}
              >
                <span className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={item.on}
                    disabled={item.locked}
                    onChange={() => {
                      if (!item.locked && item.key !== "necessary") toggle(item.key);
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-ink dark:accent-d-ink"
                  />
                  <span>
                    <span className="block text-[13px] font-semibold">{item.title}</span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-ink-2 dark:text-d-ink-2">{item.body}</span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => setManage((v) => !v)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px] font-semibold text-ink hover:bg-wash dark:border-d-line dark:text-d-ink dark:hover:bg-d-wash"
          >
            <Settings2 className="h-3.5 w-3.5" />
            {t.manage}
          </button>
          <button
            type="button"
            onClick={() => finish(NONE)}
            className="rounded-lg border border-line px-3 py-2 text-[13px] font-semibold text-ink hover:bg-wash dark:border-d-line dark:text-d-ink dark:hover:bg-d-wash"
          >
            {t.reject}
          </button>
          <button
            type="button"
            onClick={() => finish(choice)}
            className="rounded-lg border border-line bg-paper px-3 py-2 text-[13px] font-semibold text-ink hover:bg-wash dark:border-d-line dark:bg-d-wash dark:text-d-ink"
          >
            {t.save}
          </button>
          <button
            type="button"
            onClick={() => finish(ALL)}
            className="rounded-lg bg-ink px-3 py-2 text-[13px] font-semibold text-white hover:bg-ink/90 dark:bg-d-ink dark:text-d-paper"
          >
            {t.accept}
          </button>
        </div>
        <p className="mt-2 text-right text-[11px] text-muted">{t.note}</p>
      </div>
    </div>
  );
}
