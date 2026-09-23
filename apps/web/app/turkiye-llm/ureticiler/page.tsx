import type { Metadata } from "next";
import { ArrowUpRight, Building2, UserRound } from "lucide-react";
import { DeveloperDirectory } from "@/components/DeveloperDirectory";
import { apiSafe } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import type { LlmDeveloperCard } from "@/lib/types";
import Link from "next/link";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Üreticiler. Türkiye LLM",
  description: "Türkçe dil modeli üreticileri.",
  openGraph: {
    title: "Üreticiler. Türkiye LLM | PlanetAI9",
    description: "Türkçe dil modeli üreticileri.",
    url: "/turkiye-llm/ureticiler",
  },
};

export default async function UreticilerPage() {
  const locale = await getLocale();
  const tr = locale === "tr";
  const developers = await apiSafe<LlmDeveloperCard[]>("/turkiye-llm/developers", [], {
    revalidate: 60,
  });

  return (
    <div className="space-y-10">
      <header className="max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          <Link href="/turkiye-llm" className="hover:underline">
            {tr ? "Türkiye LLM" : "Türkiye LLM"}
          </Link>
        </p>
        <h1 className="mt-3 text-[32px] font-extrabold tracking-tight3 text-ink dark:text-d-ink sm:text-[40px]">
          {tr ? "Üreticiler" : "Producers"}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-ink-2 dark:text-d-ink-2">
          {tr
            ? `${developers.length} üretici. LLM Radar’daki Türkçe modellerden.`
            : `${developers.length} producers from Turkish-signal models on LLM Radar.`}
        </p>
      </header>

      <DeveloperDirectory initial={developers} locale={locale} />

      <p className="flex items-center gap-2 text-[13px] text-muted">
        {tr ? (
          <>
            <Building2 className="h-3.5 w-3.5" /> Kurum · <UserRound className="h-3.5 w-3.5" /> Kişi
          </>
        ) : (
          <>
            <Building2 className="h-3.5 w-3.5" /> Org · <UserRound className="h-3.5 w-3.5" /> Person
          </>
        )}
        <a
            href="https://llmradar.planetai9.com/#turkish"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 font-semibold text-accent hover:underline"
        >
          LLM Radar <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </p>
    </div>
  );
}
