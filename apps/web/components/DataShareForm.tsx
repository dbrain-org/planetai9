"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Database, Send } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { KvkkConsent } from "@/components/KvkkConsent";

export function DataShareForm({ locale }: { locale: Locale }) {
  const tr = locale === "tr";
  const L = (a: string, b: string) => (tr ? a : b);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const url = String(fd.get("url") ?? "").trim();
    const submitter = String(fd.get("submitter_name") ?? "").trim();
    if (name.length < 2 || url.length < 8 || submitter.length < 2) {
      setState("error");
      setMsg(L("Ad, bağlantı ve gönderen adı zorunlu.", "Name, URL and submitter name are required."));
      return;
    }
    setState("sending");
    setMsg("");
    try {
      const res = await fetch("/api/verivatan/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          url,
          kind: String(fd.get("kind") ?? "genel"),
          note: String(fd.get("note") ?? "").trim() || undefined,
          submitter_name: submitter,
          submitter_email: String(fd.get("submitter_email") ?? "").trim() || undefined,
          license: String(fd.get("license") ?? "").trim() || undefined,
          data_format: String(fd.get("data_format") ?? "").trim() || undefined,
          organization: String(fd.get("organization") ?? "").trim() || undefined,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.detail ? JSON.stringify(b.detail) : `HTTP ${res.status}`);
      }
      setState("ok");
      form.reset();
      setOpen(false);
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : L("Bir hata oluştu", "Something went wrong"));
    }
  }

  if (state === "ok") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[22px] border border-line bg-paper px-6 py-10 text-center dark:border-d-line dark:bg-d-paper">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <p className="max-w-sm text-[14px] text-ink-2 dark:text-d-ink-2">
          {L(
            "Teşekkürler. Önerin inceleme kuyruğuna alındı.",
            "Thanks. Your suggestion is in the review queue.",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[22px] border border-line bg-paper dark:border-d-line dark:bg-d-paper">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-5 text-left transition hover:bg-wash/60 sm:px-7 dark:hover:bg-d-wash/40"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink text-white dark:bg-white dark:text-ink">
          <Database className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-extrabold tracking-tight3 text-ink dark:text-d-ink sm:text-[18px]">
            {L(
              "Türkçe veri seti veya corpus önermek ister misiniz?",
              "Want to suggest a Turkish dataset or corpus?",
            )}
          </span>
          <span className="mt-0.5 block text-[13px] text-ink-2 dark:text-d-ink-2">
            {open ? L("Formu kapat", "Close form") : L("Paylaşım formunu aç", "Open submission form")}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <form onSubmit={onSubmit} className="grid gap-4 border-t border-line px-5 py-6 sm:grid-cols-2 sm:px-7 dark:border-d-line">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[13px] font-semibold">
                {L("Veri kaynağı / proje adı", "Dataset / project name")} *
              </span>
              <input name="name" required minLength={2} maxLength={200} className="field" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[13px] font-semibold">URL *</span>
              <input name="url" type="url" required className="field" placeholder="https://" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[13px] font-semibold">{L("Sınıf", "Class")} *</span>
              <select name="kind" className="field" defaultValue="genel">
                <option value="kurumsal">{L("Kurumsal", "Institutional")}</option>
                <option value="corpus">{L("LLM corpus", "LLM corpus")}</option>
                <option value="sft">{L("Finetuning / SFT", "Finetuning / SFT")}</option>
                <option value="finans">{L("Finans", "Finance")}</option>
                <option value="medya">{L("Medya & haber", "Media & news")}</option>
                <option value="hukuk">{L("Hukuk", "Legal")}</option>
                <option value="guvenlik">{L("Güvenlik", "Security")}</option>
                <option value="sektorel">{L("Diğer sektörel", "Other sectoral")}</option>
                <option value="genel">{L("Genel", "General")}</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">{L("Lisans", "License")}</span>
              <input name="license" maxLength={120} placeholder="CC BY, MIT, Apache-2.0..." className="field" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">{L("Format", "Format")}</span>
              <input name="data_format" maxLength={120} placeholder="CSV, JSON, Parquet..." className="field" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[13px] font-semibold">
                {L("Kurum / ekip", "Organization / team")}
              </span>
              <input name="organization" maxLength={160} className="field" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[13px] font-semibold">
                {L("Kısa açıklama", "Short note")}
              </span>
              <textarea name="note" rows={3} maxLength={600} className="field resize-y" required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">{L("Adın", "Your name")} *</span>
              <input name="submitter_name" required minLength={2} maxLength={120} className="field" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">E-posta</span>
              <input name="submitter_email" type="email" className="field" />
            </label>
            <KvkkConsent locale={locale} className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={state === "sending"}
                className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-ink"
              >
                <Send className="h-4 w-4" />
                {state === "sending" ? L("Gönderiliyor…", "Sending…") : L("Öner", "Suggest")}
              </button>
              {state === "error" && <p className="mt-2 text-[12px] text-live">{msg}</p>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
