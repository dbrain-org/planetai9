"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import type { Locale } from "@/lib/i18n";

const CATEGORIES: Record<string, { tr: string; en: string }> = {
  mcp: { tr: "MCP Sunucusu", en: "MCP Server" },
  llm: { tr: "LLM", en: "LLM" },
  stt: { tr: "Konuşma → Metin (STT)", en: "Speech → Text (STT)" },
  tts: { tr: "Metin → Konuşma (TTS)", en: "Text → Speech (TTS)" },
  agent: { tr: "Ajan", en: "Agent" },
  tool: { tr: "Araç", en: "Tool" },
  other: { tr: "Diğer", en: "Other" },
};

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-[12px] font-semibold text-ink-2 dark:text-d-ink-2">
        {label}
      </span>
      {children}
    </label>
  );
}

export function MarketplaceForm({
  locale,
  labels,
}: {
  locale: Locale;
  labels: { submitted: string; send: string; sending: string };
}) {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");
  const tr = locale === "tr";
  const L = (a: string, b: string) => (tr ? a : b);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.detail ? JSON.stringify(b.detail) : `HTTP ${res.status}`);
      }
      setState("ok");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : L("Bir hata oluştu", "Something went wrong"));
    }
  }

  const steps = [
    {
      t: L("Formu doldur", "Fill the form"),
      d: L("Uygulamanın adı, linki ve kısa açıklaması yeterli.", "Name, link and a short description is enough."),
    },
    {
      t: L("İnceleme", "Review"),
      d: L("Ekip gönderiyi kısa sürede kontrol eder.", "The team reviews the submission shortly."),
    },
    {
      t: L("Yayında", "Published"),
      d: L("Onaylanınca Marketplace'te ve ana sayfada görünür.", "Once approved it appears on the Marketplace and home page."),
    },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <div className="card p-6">
        {state === "ok" ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
            <p className="max-w-sm text-[14px] text-ink-2 dark:text-d-ink-2">{labels.submitted}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field label={L("Uygulama adı", "App name")}>
              <input name="name" required minLength={2} className="field" />
            </Field>
            <Field label={L("Kategori", "Category")}>
              <select name="category" required defaultValue="" className="field">
                <option value="" disabled>
                  {L("Seçiniz", "Select")}
                </option>
                {Object.entries(CATEGORIES).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l[locale]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={L("Tek cümlelik açıklama", "One-line description")} full>
              <input name="tagline" required minLength={8} maxLength={240} className="field" />
            </Field>
            <Field label={L("Web sitesi / uygulama linki", "Website / app link")}>
              <input name="url" type="url" required placeholder="https://" className="field" />
            </Field>
            <Field label={L("Kaynak kod (GitHub) — zorunlu, açık kaynak", "Source code (GitHub) — required, open source")}>
              <input
                name="repo_url"
                type="url"
                required
                placeholder="https://github.com/"
                className="field"
              />
            </Field>
            <Field label={L("Detaylı açıklama", "Detailed description")} full>
              <textarea name="description" rows={3} maxLength={4000} className="field resize-y" />
            </Field>
            <Field label={L("Geliştirici / ekip", "Developer / team")}>
              <input name="author_name" required minLength={2} className="field" />
            </Field>
            <Field label={L("Geliştirici linki", "Developer link")}>
              <input name="author_url" type="url" placeholder="https://" className="field" />
            </Field>
            <Field label={L("E-posta (yayınlanmaz)", "Email (not published)")} full>
              <input name="submitter_email" type="email" className="field" />
            </Field>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={state === "sending"}
                className="btn-dark disabled:opacity-50"
              >
                {state === "sending" ? labels.sending : labels.send} <Send className="h-4 w-4" />
              </button>
              {state === "error" && <p className="mt-2 text-[12px] text-live">{msg}</p>}
            </div>
          </form>
        )}
      </div>

      <div className="card h-fit p-5">
        <h3 className="text-[14px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {L("Nasıl çalışır?", "How it works")}
        </h3>
        <ol className="mt-4 space-y-4">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-bold text-accent dark:bg-accent/15">
                {i + 1}
              </span>
              <span>
                <span className="block text-[13px] font-bold text-ink dark:text-d-ink">{s.t}</span>
                <span className="block text-[12px] leading-relaxed text-ink-2 dark:text-d-ink-2">
                  {s.d}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
