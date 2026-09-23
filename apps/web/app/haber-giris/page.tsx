import { Send } from "lucide-react";
import { NewsSubmissionForm } from "@/components/NewsSubmissionForm";
import { getDict, getLocale } from "@/lib/i18n";

export const metadata = { title: "Haber Gönder" };

export default async function HaberGirisPage() {
  const locale = await getLocale();
  const t = await getDict();
  const tr = locale === "tr";

  return (
    <div className="relative mx-auto max-w-2xl">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-16 -z-10 h-64 w-64 rounded-full bg-accent/10 blur-3xl dark:bg-accent/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-24 -z-10 h-56 w-56 rounded-full bg-[#7C3AED]/10 blur-3xl dark:bg-[#7C3AED]/15"
      />

      <header className="relative mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[12px] font-semibold text-accent dark:bg-accent/15">
          <Send className="h-3.5 w-3.5 -rotate-45" />
          {tr ? "Sen de haberini paylaş" : "Share your own story"}
        </span>

        {/* hand-drawn style annotation */}
        <div className="pointer-events-none absolute -right-2 top-0 hidden -rotate-6 flex-col items-end text-accent/70 sm:flex">
          <span className="font-serif text-[13px] italic" style={{ fontFamily: "Georgia, serif" }}>
            {tr ? "Haberin önemli, paylaş!" : "Your story matters. Share it!"}
          </span>
          <svg width="64" height="46" viewBox="0 0 64 46" className="mt-1" fill="none">
            <path
              d="M54 4 C 24 2, 8 22, 12 42"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              strokeLinecap="round"
            />
            <path d="M6 36 L12 44 L20 38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
        </div>

        <h1 className="mt-4 text-[34px] font-extrabold leading-none tracking-tight3 sm:text-[42px]">
          <span className="text-ink dark:text-d-ink">{tr ? "Haber " : "Submit "}</span>
          <span className="bg-gradient-to-r from-accent to-[#7C3AED] bg-clip-text text-transparent">
            {tr ? "Gönder" : "News"}
          </span>
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {t.newsSubmission.lead}
        </p>
      </header>

      <NewsSubmissionForm
        locale={locale}
        labels={{
          submitted: t.newsSubmission.submitted,
          send: t.newsSubmission.send,
          sending: t.newsSubmission.sending,
        }}
      />
    </div>
  );
}
