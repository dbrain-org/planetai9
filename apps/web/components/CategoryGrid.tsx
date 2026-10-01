import Link from "next/link";
import { ArrowRight, Bot, Code2, Cpu, ShieldCheck, Sparkles } from "lucide-react";
import { bucketLabel, CATEGORY_BUCKET } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import type { CategoryCount } from "@/lib/types";

type Card = {
  bucket: string;
  icon: typeof Bot;
  cats: string[];
  desc: { tr: string; en: string };
};

const CARDS: Card[] = [
  {
    bucket: "AI",
    icon: Sparkles,
    cats: Object.keys(CATEGORY_BUCKET).filter((c) => CATEGORY_BUCKET[c] === "AI"),
    desc: {
      tr: "Modeller, şirketler, ajanlar ve üretken yapay zekâ.",
      en: "Models, companies, agents and generative AI.",
    },
  },
  {
    bucket: "Robotics",
    icon: Bot,
    cats: ["Robotics"],
    desc: { tr: "Otonom sistemler ve robotik teknolojileri.", en: "Autonomous systems and robotics." },
  },
  {
    bucket: "Coding",
    icon: Code2,
    cats: ["AICoding"],
    desc: { tr: "Yapay zekâ destekli yazılım geliştirme.", en: "AI-assisted software development." },
  },
  {
    bucket: "Security",
    icon: ShieldCheck,
    cats: ["AISafety"],
    desc: { tr: "Yapay zekâ güvenliği, hizalanma ve riskler.", en: "AI safety, alignment and risk." },
  },
  {
    bucket: "Regulation",
    icon: Cpu,
    cats: ["Regulation"],
    desc: { tr: "Yasa, düzenleme ve politika gelişmeleri.", en: "Law, regulation and policy." },
  },
];

export function CategoryGrid({
  counts,
  locale,
  seeAll,
}: {
  counts: CategoryCount[];
  locale: Locale;
  seeAll: string;
}) {
  const total = (cats: string[]) =>
    counts.filter((c) => cats.includes(c.category)).reduce((s, c) => s + c.events_total, 0);

  return (
    <section>
      <div className="mb-6 flex items-end justify-between">
        <h2 className="sec-title">{locale === "tr" ? "Kategoriler" : "Categories"}</h2>
        <Link href="/news" className="flex items-center gap-1 text-[13px] font-semibold text-ink transition-colors hover:text-ink-2 dark:text-d-ink dark:hover:text-d-ink-2">
          {seeAll} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {CARDS.map((card) => {
          return (
            <Link
              key={card.bucket}
              href={`/news?bucket=${card.bucket}`}
              className="card card-hover group p-5"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent dark:bg-accent/15">
                <card.icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <h3 className="mt-4 text-[15px] font-bold tracking-tight2 text-ink group-hover:text-accent dark:text-d-ink">
                {bucketLabel(card.bucket, locale)}
              </h3>
              <p className="mt-0.5 text-[12px] font-semibold text-accent">
                {total(card.cats)} {locale === "tr" ? "haber" : "stories"}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-2 dark:text-d-ink-2">
                {card.desc[locale]}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
