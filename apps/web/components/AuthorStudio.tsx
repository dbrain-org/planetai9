"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, FileText, LogOut, PenLine, Plus } from "lucide-react";
import type { Studio, StudioColumn } from "@/lib/author";

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif";

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

const STATUS_LABEL: Record<string, string> = { draft: "Taslak", published: "Yayında" };

/* ----------------------------------------------------------------- login --- */

function LoginForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [secret, setSecret] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/yazar/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: slug.trim(), secret: secret.trim() }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.detail ?? "Giriş yapılamadı");
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Giriş yapılamadı");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-white dark:bg-white dark:text-ink">
          <PenLine className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">PlanetAI9</p>
          <h1 className="text-[19px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
            Yazar Stüdyosu
          </h1>
        </div>
      </div>
      <form onSubmit={submit} className="card space-y-3 p-6">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-ink-2 dark:text-d-ink-2">
            Yazar kullanıcı adı
          </span>
          <input
            autoFocus
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ör. ayhan-demirci"
            className="field"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-ink-2 dark:text-d-ink-2">
            Yazar anahtarı
          </span>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="field"
          />
        </label>
        {err && <p className="text-[12px] text-live">{err}</p>}
        <button
          type="submit"
          disabled={busy || !slug || !secret}
          className="btn-dark w-full justify-center disabled:opacity-50"
        >
          {busy ? "Kontrol ediliyor…" : "Giriş yap"}
        </button>
      </form>
      <p className="mt-3 text-center text-[11.5px] text-muted">
        Anahtarını editöründen aldın. Sorun olursa PlanetAI9 ekibine yaz.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- editor --- */

const EMPTY: Partial<StudioColumn> = {};

function Editor({
  initial,
  onDone,
  onCancel,
}: {
  initial: Partial<StudioColumn>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    slug: initial.slug ?? "",
    title: initial.title ?? "",
    dek: initial.dek ?? "",
    hero_image_url: initial.hero_image_url ?? "",
    body: initial.body ?? "",
  });
  const [busy, setBusy] = useState<null | "draft" | "published">(null);
  const [err, setErr] = useState("");
  const editing = Boolean(initial.slug);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const stats = useMemo(() => {
    const words = form.body.trim() ? form.body.trim().split(/\s+/).length : 0;
    return { words, mins: Math.max(1, Math.round(words / 200)) };
  }, [form.body]);

  const canSave = form.title.trim().length >= 4 && form.body.trim().length >= 40;

  async function save(status: "draft" | "published") {
    setBusy(status);
    setErr("");
    try {
      const res = await fetch("/api/yazar/columns", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, status }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(
          typeof b.detail === "string"
            ? b.detail
            : "Kaydedilemedi. Başlık en az 4, metin en az birkaç cümle olmalı.",
        );
      }
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kaydedilemedi");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* toolbar */}
      <div className="sticky top-[73px] z-20 -mx-5 flex flex-wrap items-center gap-3 border-b border-line bg-paper/85 px-5 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8 dark:border-d-line dark:bg-d-paper/85">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2 hover:text-ink dark:text-d-ink-2"
        >
          <ArrowLeft className="h-4 w-4" /> Yazılara dön
        </button>
        <span className="text-[11.5px] text-muted">
          {stats.words} kelime · ~{stats.mins} dk
          {editing && (
            <>
              {" · "}
              <span className="font-semibold text-ink-2 dark:text-d-ink-2">
                {STATUS_LABEL[initial.status ?? "draft"]}
              </span>
            </>
          )}
        </span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => save("draft")}
            disabled={!canSave || busy !== null}
            className="rounded-lg border border-line px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-2 hover:text-ink disabled:opacity-40 dark:border-d-line dark:text-d-ink-2"
          >
            {busy === "draft" ? "…" : "Taslak kaydet"}
          </button>
          <button
            onClick={() => save("published")}
            disabled={!canSave || busy !== null}
            className="rounded-lg bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-accent-ink disabled:opacity-40"
          >
            {busy === "published" ? "Yayınlanıyor…" : "Yayınla"}
          </button>
        </div>
      </div>

      {err && (
        <p className="rounded-lg bg-live/10 px-3 py-2 text-[12.5px] font-medium text-live">{err}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        {/* document */}
        <div className="card overflow-hidden">
          {form.hero_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.hero_image_url}
              alt=""
              className="h-52 w-full border-b border-line object-cover dark:border-d-line"
            />
          )}
          <div className="px-6 py-7 sm:px-10 sm:py-9">
            <textarea
              value={form.title}
              onChange={set("title")}
              rows={1}
              placeholder="Başlık"
              className="w-full resize-none border-0 bg-transparent p-0 text-[30px] font-extrabold leading-tight tracking-tight3 text-ink outline-none placeholder:text-muted/50 dark:text-d-ink"
              style={{ fontFamily: SERIF }}
            />
            <textarea
              value={form.dek}
              onChange={set("dek")}
              rows={1}
              placeholder="Spot cümle (opsiyonel)"
              className="mt-3 w-full resize-none border-0 bg-transparent p-0 text-[16px] leading-snug text-ink-2 outline-none placeholder:text-muted/50 dark:text-d-ink-2"
              style={{ fontFamily: SERIF }}
            />
            <hr className="my-6 border-line dark:border-d-line" />
            <textarea
              value={form.body}
              onChange={set("body")}
              rows={18}
              placeholder="Yazına başla… Paragrafları boş bir satırla ayır."
              className="w-full resize-y border-0 bg-transparent p-0 text-[17px] leading-[1.85] text-ink outline-none placeholder:text-muted/50 dark:text-d-ink"
              style={{ fontFamily: SERIF }}
            />
          </div>
        </div>

        {/* settings rail */}
        <aside className="space-y-4 lg:pt-1">
          <div className="card p-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
              Kapak görseli
            </p>
            <input
              value={form.hero_image_url}
              onChange={set("hero_image_url")}
              placeholder="https://…"
              className="field text-[12px]"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Yazının üstünde ve listelerde görünür. Boş bırakabilirsin.
            </p>
          </div>
          <div className="card p-4 text-[12px] leading-relaxed text-ink-2 dark:text-d-ink-2">
            <p className="mb-1.5 font-bold text-ink dark:text-d-ink">İpucu</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Paragrafları <b>boş satır</b> ile ayır.</li>
              <li><b>Taslak</b> yalnızca sana görünür.</li>
              <li><b>Yayınla</b> dediğinde anında sitede çıkar.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- studio --- */

export function AuthorStudio({
  authed,
  studio,
}: {
  authed: boolean;
  studio: Studio | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Partial<StudioColumn> | null>(null);

  if (!authed || !studio) return <LoginForm />;

  async function logout() {
    await fetch("/api/yazar/login", { method: "DELETE" });
    router.refresh();
  }

  const done = () => {
    setEditing(null);
    router.refresh();
  };

  if (editing) return <Editor initial={editing} onDone={done} onCancel={() => setEditing(null)} />;

  const { author, columns } = studio;
  const published = columns.filter((c) => c.status === "published").length;
  const drafts = columns.length - published;

  return (
    <div className="space-y-7">
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-wash text-[16px] font-extrabold text-ink-2 dark:bg-d-wash dark:text-d-ink-2">
          {author.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            author.name.slice(0, 1)
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold tracking-tight2 text-ink dark:text-d-ink">
            {author.name}
          </p>
          <p className="text-[12.5px] text-ink-2 dark:text-d-ink-2">
            {author.role} · {published} yayında · {drafts} taslak
          </p>
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-2 hover:text-ink dark:text-d-ink-2"
        >
          <LogOut className="h-3.5 w-3.5" /> Çıkış
        </button>
      </div>

      <button onClick={() => setEditing(EMPTY)} className="btn-dark">
        <Plus className="h-4 w-4" /> Yeni köşe yazısı
      </button>

      {columns.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <FileText className="h-7 w-7 text-muted" />
          <p className="text-[13.5px] font-semibold text-ink dark:text-d-ink">Henüz yazın yok</p>
          <p className="max-w-xs text-[12.5px] text-muted">
            Yukarıdaki butondan ilk köşe yazına başla. Dilediğin kadar taslak tutabilirsin.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {columns.map((c) => (
            <li key={c.slug}>
              <button
                onClick={() => setEditing(c)}
                className="card card-hover flex w-full items-start gap-4 p-4 text-left"
              >
                <span className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-wash dark:bg-d-wash">
                  {c.hero_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.hero_image_url} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        c.status === "published"
                          ? "bg-[#EAF7EF] text-success dark:bg-success/15"
                          : "bg-wash text-ink-2 dark:bg-d-wash dark:text-d-ink-2"
                      }`}
                    >
                      {STATUS_LABEL[c.status]}
                    </span>
                    <span className="text-[11px] text-muted">{fmtDate(c.published_at)}</span>
                  </span>
                  <span className="mt-1 block truncate text-[15px] font-bold text-ink dark:text-d-ink">
                    {c.title}
                  </span>
                  {c.dek && (
                    <span className="mt-0.5 block truncate text-[12.5px] text-ink-2 dark:text-d-ink-2">
                      {c.dek}
                    </span>
                  )}
                </span>
                <PenLine className="mt-1 h-4 w-4 shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
