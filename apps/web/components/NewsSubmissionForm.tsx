"use client";

import { useState } from "react";
import { AlignLeft, CheckCircle2, FileText, Image as ImageIcon, Link2, Mail, Send, Tag, User } from "lucide-react";
import type { Locale } from "@/lib/i18n";

// Mirrors lib/i18n.ts's BUCKET_LABEL — duplicated locally (like
// MarketplaceForm's CATEGORIES) so this client component doesn't pull in
// lib/i18n's `next/headers` (getLocale) import into the client bundle.
const BUCKETS: Record<string, { tr: string; en: string }> = {
  AI: { tr: "Yapay Zekâ", en: "AI" },
  Robotics: { tr: "Robotik", en: "Robotics" },
  Coding: { tr: "Kodlama", en: "Coding" },
  Security: { tr: "Güvenlik", en: "Security" },
  Regulation: { tr: "Regülasyon", en: "Regulation" },
  Research: { tr: "Araştırma", en: "Research" },
  Infra: { tr: "Altyapı", en: "Infrastructure" },
  OpenSource: { tr: "Açık Kaynak", en: "Open Source" },
};

function Field({
  label,
  icon: Icon,
  required,
  children,
  full,
}: {
  label: string;
  icon: typeof FileText;
  required?: boolean;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-ink dark:text-d-ink">
        <Icon className="h-3.5 w-3.5 text-muted" />
        {label}
        {required && <span className="text-live">*</span>}
      </span>
      {children}
    </label>
  );
}

export function NewsSubmissionForm({
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
    const form = e.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    if (!String(payload.url ?? "").trim() && !String(payload.description ?? "").trim()) {
      setState("error");
      setMsg(L("Link ya da açıklamadan birini doldur.", "Fill in either a link or a description."));
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/haber-giris", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.detail ? JSON.stringify(b.detail) : `HTTP ${res.status}`);
      }
      setState("ok");
      form.reset();
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : L("Bir hata oluştu", "Something went wrong"));
    }
  }

  return (
    <div className="card rounded-[22px] p-6 shadow-raise sm:p-8">
      {state === "ok" ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <p className="max-w-sm text-[14px] text-ink-2 dark:text-d-ink-2">{labels.submitted}</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
          <Field label={L("Başlık", "Title")} icon={FileText} required full>
            <input
              name="title"
              required
              minLength={8}
              maxLength={300}
              placeholder={L("Haber başlığını yazın…", "Type the news title…")}
              className="field"
            />
          </Field>
          <Field label={L("Kategori", "Category")} icon={Tag} required>
            <select name="category" required defaultValue="" className="field">
              <option value="" disabled>
                {L("Seçiniz", "Select")}
              </option>
              {Object.entries(BUCKETS).map(([b, label]) => (
                <option key={b} value={b}>
                  {label[locale]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={L("Haber linki", "News link")} icon={Link2} required>
            <input name="url" type="url" placeholder="https://" className="field" />
          </Field>
          <Field label={L("Görsel linki (opsiyonel)", "Image link (optional)")} icon={ImageIcon} full>
            <input name="image_url" type="url" placeholder="https://" className="field" />
          </Field>
          <Field label={L("Kısa özet", "Short summary")} icon={AlignLeft} required full>
            <input
              name="summary"
              maxLength={600}
              placeholder={L("Haberin kısa özetini yazın…", "Type a short summary…")}
              className="field"
            />
          </Field>
          <Field label={L("Detay (linkin yoksa gerekli)", "Details (required if no link)")} icon={FileText} full>
            <textarea
              name="description"
              rows={4}
              maxLength={4000}
              placeholder={L("Haberin detaylarını yazın…", "Type the news details…")}
              className="field resize-y"
            />
          </Field>
          <Field label={L("Adın (opsiyonel)", "Your name (optional)")} icon={User}>
            <input
              name="submitter_name"
              maxLength={120}
              placeholder={L("Adınız yazın…", "Type your name…")}
              className="field"
            />
          </Field>
          <Field label={L("E-posta (yayınlanmaz)", "Email (not published)")} icon={Mail}>
            <input
              name="submitter_email"
              type="email"
              placeholder={L("E-posta adresinizi yazın…", "Type your email…")}
              className="field"
            />
          </Field>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={state === "sending"}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-[#4F46E5] px-5 py-2.5 text-[13px] font-semibold text-white shadow-soft transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {state === "sending" ? labels.sending : labels.send}
              <span aria-hidden>→</span>
            </button>
            {state === "error" && <p className="mt-2 text-[12px] text-live">{msg}</p>}
          </div>
        </form>
      )}
    </div>
  );
}
