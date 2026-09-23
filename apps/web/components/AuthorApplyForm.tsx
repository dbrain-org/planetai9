"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, PenLine, Send } from "lucide-react";
import type { Locale } from "@/lib/i18n";

export function AuthorApplyForm({ locale }: { locale: Locale }) {
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
    const email = String(fd.get("email") ?? "").trim();
    if (name.length < 2 || email.length < 5) {
      setState("error");
      setMsg(L("Ad ve e-posta gerekli.", "Name and email are required."));
      return;
    }
    setState("sending");
    setMsg("");
    try {
      const res = await fetch("/api/yazarlik", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role: String(fd.get("role") ?? "").trim() || undefined,
          bio: String(fd.get("bio") ?? "").trim() || undefined,
          note: String(fd.get("note") ?? "").trim() || undefined,
        }),
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

  if (state === "ok") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[22px] border border-line bg-paper px-6 py-10 text-center dark:border-d-line dark:bg-d-paper">
        <CheckCircle2 className="h-10 w-10 text-success" />
        <p className="max-w-sm text-[14px] text-ink-2 dark:text-d-ink-2">
          {L("Başvurun alındı. Teşekkürler!", "Application received. Thank you!")}
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
          <PenLine className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-extrabold tracking-tight3 text-ink dark:text-d-ink sm:text-[18px]">
            {L("Siz de yazar olmak ister misiniz?", "Want to become a columnist too?")}
          </span>
          <span className="mt-0.5 block text-[13px] text-ink-2 dark:text-d-ink-2">
            {open
              ? L("Formu kapat", "Close form")
              : L("Başvurmak için dokunun", "Tap to apply")}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <form
            onSubmit={onSubmit}
            className="grid gap-4 border-t border-line px-5 py-6 sm:grid-cols-2 sm:px-7 dark:border-d-line"
          >
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">{L("Adın", "Your name")} *</span>
              <input name="name" required minLength={2} maxLength={160} className="field" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold">E-posta *</span>
              <input name="email" type="email" required className="field" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[13px] font-semibold">
                {L("Ünvan / rol (opsiyonel)", "Title / role (optional)")}
              </span>
              <input
                name="role"
                maxLength={160}
                className="field"
                placeholder={L("Örn. Araştırmacı", "e.g. Researcher")}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[13px] font-semibold">
                {L("Kısa bio (opsiyonel)", "Short bio (optional)")}
              </span>
              <textarea name="bio" rows={4} maxLength={4000} className="field resize-y" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[13px] font-semibold">
                {L("Neden yazmak istiyorsun? (opsiyonel)", "Why do you want to write? (optional)")}
              </span>
              <textarea name="note" rows={3} maxLength={2000} className="field resize-y" />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={state === "sending"}
                className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-ink"
              >
                <Send className="h-4 w-4" />
                {state === "sending" ? L("Gönderiliyor…", "Sending…") : L("Başvur", "Apply")}
              </button>
              {state === "error" && <p className="mt-2 text-[12px] text-live">{msg}</p>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
