"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

const CONTACT = "https://oppy.dbrain.tech/#contact";

type Slide = {
  image: string;
  alt: string;
  kicker: string;
  title: string;
  body: string;
  points?: string[];
};

const SLIDES: Record<Locale, Slide[]> = {
  tr: [
    {
      image: "/ads/oppy/hero.jpg",
      alt: "Tablette Oppy çalışma alanı",
      kicker: "Oppy",
      title: "Yapay zekâ iş gücünüz için sahne",
      body: "Asistanlardan iş akışına, bilgiden entegrasyona. Kurumunuzun tek parça çalışması için gereken her şey.",
    },
    {
      image: "/ads/oppy/assists.jpg",
      alt: "Oppy asistan ekranı",
      kicker: "Modüller",
      title: "Tek platform, dört yetenek",
      body: "Bağlamı anlar, eylem önerir, onayınızla uygular.",
      points: ["Assists", "Knows", "Acts", "Governs"],
    },
    {
      image: "/ads/oppy/sales.jpg",
      alt: "Satış ekibi",
      kicker: "Sales & GTM",
      title: "Satış, çalıştığı sistemin içinde",
      body: "Hesap bağlamı, ürün yanıtları ve takip notları, temsilcilerin zaten kullandığı yerden.",
    },
    {
      image: "/ads/oppy/hr.jpg",
      alt: "İnsan kaynakları",
      kicker: "İnsan Kaynakları",
      title: "İşe alım ve politika, yetkiyle",
      body: "Oryantasyon, politika ve vaka yönetimi. İK sistemlerine yalnızca izin verilen erişim.",
    },
    {
      image: "/ads/oppy/ops.jpg",
      alt: "Operasyon",
      kicker: "Operasyon",
      title: "Sonraki adım önerilir",
      body: "Talep planı, tedarik zinciri ve süreç. Önerilen eylemle birlikte.",
    },
    {
      image: "/ads/oppy/marketing.jpg",
      alt: "Pazarlama",
      kicker: "Pazarlama",
      title: "Yalnızca onaylı kaynaktan",
      body: "Kampanya araştırması, konumlandırma ve içerik. Onaylanmamış malzemeye dayanmaz.",
    },
    {
      image: "/ads/oppy/finance.jpg",
      alt: "Finans",
      kicker: "Finans",
      title: "Her adımın izi durur",
      body: "Rapor, kontrol ve sapma analizi. Tam bir denetim kaydıyla.",
    },
  ],
  en: [
    {
      image: "/ads/oppy/hero.jpg",
      alt: "Oppy workspace shown on a tablet",
      kicker: "Oppy",
      title: "The stage for your AI workforce",
      body: "From AI assistants to workflows, knowledge, and integrations. Everything your organization needs to perform as one.",
    },
    {
      image: "/ads/oppy/assists.jpg",
      alt: "Oppy assistant",
      kicker: "Modules",
      title: "One platform, four capabilities",
      body: "Understands context, recommends action, and executes with your approval.",
      points: ["Assists", "Knows", "Acts", "Governs"],
    },
    {
      image: "/ads/oppy/sales.jpg",
      alt: "Sales team",
      kicker: "Sales & GTM",
      title: "Selling inside the systems reps already use",
      body: "Account context, product answers and follow-ups, drafted from the tools already on the desk.",
    },
    {
      image: "/ads/oppy/hr.jpg",
      alt: "Human resources",
      kicker: "Human Resources",
      title: "Onboarding and policy, with permission",
      body: "Onboarding, policy and case handling. Access to HR systems stays permission-aware.",
    },
    {
      image: "/ads/oppy/ops.jpg",
      alt: "Operations",
      kicker: "Operations",
      title: "A recommended next action",
      body: "Demand planning, supply chain and process execution, with the next step attached.",
    },
    {
      image: "/ads/oppy/marketing.jpg",
      alt: "Marketing",
      kicker: "Marketing",
      title: "Built only on approved sources",
      body: "Campaign research, positioning and content operations. Nothing outside what you approved.",
    },
    {
      image: "/ads/oppy/finance.jpg",
      alt: "Finance",
      kicker: "Finance",
      title: "An audit trail on every step",
      body: "Reporting, controls and variance analysis, with a record of what changed.",
    },
  ],
};

/** Sponsored Oppy carousel, placed after the PlanetAI9 channel block. */
export function OppyAd({ locale }: { locale: Locale }) {
  const slides = SLIDES[locale];
  const tr = locale === "tr";
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, [paused, slides.length]);

  const go = (next: number) => setIndex((next + slides.length) % slides.length);

  return (
    <aside
      aria-roledescription="carousel"
      aria-label={tr ? "Reklam: Oppy" : "Advertisement: Oppy"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="overflow-hidden rounded-card border border-line bg-paper shadow-raise dark:border-d-line dark:bg-d-canvas">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <article
              key={slide.kicker}
              className="grid w-full shrink-0 md:grid-cols-2"
              aria-hidden={i !== index}
            >
              <div className="flex flex-col justify-between px-6 py-6 sm:px-8 sm:py-8">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
                    {tr ? "Reklam" : "Ad"} · {slide.kicker}
                  </p>
                  <h2 className="mt-3 max-w-md text-[28px] font-extrabold leading-[1.08] tracking-tight3 text-ink dark:text-d-ink sm:text-[34px]">
                    {slide.title}
                  </h2>
                  <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
                    {slide.body}
                  </p>
                  {slide.points && (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {slide.points.map((point) => (
                        <li
                          key={point}
                          className="rounded-full border border-line px-3 py-1 text-[12px] font-semibold text-ink dark:border-d-line dark:text-d-ink"
                        >
                          {point}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <a
                  href={CONTACT}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-ink/90 dark:bg-d-ink dark:text-d-paper"
                >
                  {tr ? "Strateji görüşmesi" : "Book a strategy call"}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="relative min-h-[220px] md:min-h-[340px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.image} alt={slide.alt} className="absolute inset-0 h-full w-full object-cover" />
              </div>
            </article>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 dark:border-d-line sm:px-6">
          <div className="flex items-center gap-1.5" role="tablist">
            {slides.map((slide, i) => (
              <button
                key={slide.kicker}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={slide.kicker}
                onClick={() => go(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-ink dark:bg-d-ink" : "w-1.5 bg-line dark:bg-d-line"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={tr ? "Önceki" : "Previous"}
              onClick={() => go(index - 1)}
              className="grid h-8 w-8 place-items-center rounded-full text-ink hover:bg-wash dark:text-d-ink dark:hover:bg-d-wash"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={tr ? "Sonraki" : "Next"}
              onClick={() => go(index + 1)}
              className="grid h-8 w-8 place-items-center rounded-full text-ink hover:bg-wash dark:text-d-ink dark:hover:bg-d-wash"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
