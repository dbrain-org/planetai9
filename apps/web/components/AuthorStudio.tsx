"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, Check, ExternalLink, FileText, LogOut, PenLine, Plus, RotateCcw, X } from "lucide-react";
import type { Studio, StudioColumn } from "@/lib/author";
import type { QueueApp, QueueSubmission } from "@/lib/types";

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
            : "Kaydedilemedi — başlık en az 4, metin en az birkaç cümle olmalı.",
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
              placeholder="Spot cümle — opsiyonel"
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

/* ------------------------------------------------------- marketplace queue --- */

const MKT_STATUS_LABEL: Record<string, string> = {
  pending: "Beklemede",
  approved: "Yayında",
  rejected: "Reddedildi",
};
const MKT_STATUS_STYLE: Record<string, string> = {
  pending: "bg-accent-soft text-accent dark:bg-accent/15",
  approved: "bg-[#EAF7EF] text-success dark:bg-success/15",
  rejected: "bg-wash text-ink-2 dark:bg-d-wash dark:text-d-ink-2",
};

function QueueRow({ app, onAction }: { app: QueueApp; onAction: (slug: string, status: string) => Promise<void> }) {
  const [pending, setPending] = useState(false);
  const act = async (status: string) => {
    setPending(true);
    try {
      await onAction(app.slug, status);
    } finally {
      setPending(false);
    }
  };
  let host = app.url;
  try {
    host = new URL(app.url).hostname.replace(/^www\./, "");
  } catch {
    /* keep raw */
  }
  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${MKT_STATUS_STYLE[app.status]}`}
            >
              {MKT_STATUS_LABEL[app.status]}
            </span>
            <span className="text-[11px] uppercase tracking-wide text-muted">{app.category_label}</span>
            {app.is_turkish_dev && (
              <span className="rounded bg-[#EAF7EF] px-1.5 py-0.5 text-[10px] font-bold text-success dark:bg-success/15">
                🇹🇷 Türk geliştirici (beyan)
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-[15px] font-bold text-ink dark:text-d-ink">{app.name}</h3>
          <p className="mt-0.5 text-[13px] text-ink-2 dark:text-d-ink-2">{app.tagline}</p>
        </div>
        <a
          href={app.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[12px] text-ink-2 hover:text-accent dark:text-d-ink-2"
        >
          {host} <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {app.description && (
        <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {app.description}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
        <span>Geliştirici: {app.author_name}</span>
        {app.repo_url && (
          <a href={app.repo_url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
            Kaynak kod ↗
          </a>
        )}
        {app.submitter_email && <span>{app.submitter_email}</span>}
        <span>{fmtDate(app.created_at)}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {app.status !== "approved" && (
          <button
            onClick={() => act("approved")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Onayla
          </button>
        )}
        {app.status !== "rejected" && (
          <button
            onClick={() => act("rejected")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-live hover:text-live disabled:opacity-50 dark:border-d-line dark:text-d-ink-2"
          >
            <X className="h-3.5 w-3.5" /> Reddet
          </button>
        )}
        {app.status !== "pending" && (
          <button
            onClick={() => act("pending")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:text-ink disabled:opacity-50 dark:border-d-line dark:text-d-ink-2"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Beklemeye al
          </button>
        )}
      </div>
    </li>
  );
}

function MarketplaceQueue({ queue }: { queue: QueueApp[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function onAction(slug: string, status: string) {
    const res = await fetch("/api/yazar/marketplace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, status }),
    });
    if (res.ok) startTransition(() => router.refresh());
  }

  const pending = queue.filter((a) => a.status === "pending");
  const decided = queue.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="sec-title mb-4">Bekleyen başvurular</h2>
        {pending.length === 0 ? (
          <p className="text-[13px] text-muted">Bekleyen başvuru yok.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((a) => (
              <QueueRow key={a.slug} app={a} onAction={onAction} />
            ))}
          </ul>
        )}
      </section>
      {decided.length > 0 && (
        <section>
          <h2 className="sec-title mb-4">Karar verilenler</h2>
          <ul className="space-y-3">
            {decided.map((a) => (
              <QueueRow key={a.slug} app={a} onAction={onAction} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* --------------------------------------------------------- news submissions --- */

const NEWS_STATUS_LABEL: Record<string, string> = {
  pending: "Beklemede",
  approved: "Yayında",
  rejected: "Reddedildi",
};
const NEWS_STATUS_STYLE: Record<string, string> = {
  pending: "bg-accent-soft text-accent dark:bg-accent/15",
  approved: "bg-[#EAF7EF] text-success dark:bg-success/15",
  rejected: "bg-wash text-ink-2 dark:bg-d-wash dark:text-d-ink-2",
};

function NewsRow({
  s,
  onAction,
}: {
  s: QueueSubmission;
  onAction: (id: string, status: string) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const act = async (status: string) => {
    setPending(true);
    try {
      await onAction(s.id, status);
    } finally {
      setPending(false);
    }
  };
  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${NEWS_STATUS_STYLE[s.status]}`}
            >
              {NEWS_STATUS_LABEL[s.status]}
            </span>
            <span className="text-[11px] uppercase tracking-wide text-muted">{s.category}</span>
          </div>
          <h3 className="mt-1.5 text-[15px] font-bold text-ink dark:text-d-ink">{s.title}</h3>
          {s.summary && <p className="mt-0.5 text-[13px] text-ink-2 dark:text-d-ink-2">{s.summary}</p>}
        </div>
        {s.url && (
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] text-ink-2 hover:text-accent dark:text-d-ink-2"
          >
            link <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {s.description && (
        <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {s.description}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
        {s.submitter_name && <span>Gönderen: {s.submitter_name}</span>}
        {s.submitter_email && <span>{s.submitter_email}</span>}
        <span>{fmtDate(s.created_at)}</span>
        {s.event_slug && (
          <a href={`/news/${s.event_slug}`} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
            Yayındaki haber ↗
          </a>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {s.status !== "approved" && (
          <button
            onClick={() => act("approved")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Onayla
          </button>
        )}
        {s.status !== "rejected" && (
          <button
            onClick={() => act("rejected")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-live hover:text-live disabled:opacity-50 dark:border-d-line dark:text-d-ink-2"
          >
            <X className="h-3.5 w-3.5" /> Reddet
          </button>
        )}
        {s.status !== "pending" && (
          <button
            onClick={() => act("pending")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:text-ink disabled:opacity-50 dark:border-d-line dark:text-d-ink-2"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Beklemeye al
          </button>
        )}
      </div>
    </li>
  );
}

function NewsQueue({ queue }: { queue: QueueSubmission[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function onAction(id: string, status: string) {
    const res = await fetch("/api/yazar/news-submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) startTransition(() => router.refresh());
  }

  const pending = queue.filter((s) => s.status === "pending");
  const decided = queue.filter((s) => s.status !== "pending");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="sec-title mb-4">Bekleyen haberler</h2>
        {pending.length === 0 ? (
          <p className="text-[13px] text-muted">Bekleyen haber gönderisi yok.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((s) => (
              <NewsRow key={s.id} s={s} onAction={onAction} />
            ))}
          </ul>
        )}
      </section>
      {decided.length > 0 && (
        <section>
          <h2 className="sec-title mb-4">Karar verilenler</h2>
          <ul className="space-y-3">
            {decided.map((s) => (
              <NewsRow key={s.id} s={s} onAction={onAction} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------ Türkiye link cards --- */

type Curated = {
  id: string;
  name: string;
  url: string;
  kind: string;
  note_tr: string | null;
  note_en: string | null;
  sort_order: number;
  enabled: boolean;
};

type CuratedCollection = "tr_data" | "tr_ecosystem";

const CURATED_KINDS: Record<CuratedCollection, string[]> = {
  tr_data: ["portal", "istatistik", "nlp", "akademik", "yerel"],
  tr_ecosystem: ["kurum", "lab", "şirket", "model", "girişim", "topluluk"],
};

const COLLECTION_LABEL: Record<CuratedCollection, string> = {
  tr_data: "Açık Veri Kaynakları",
  tr_ecosystem: "Ekosistem",
};

function TurkiyeLinks() {
  const [collection, setCollection] = useState<CuratedCollection>("tr_data");
  const [items, setItems] = useState<Curated[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Curated> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async (c: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/yazar/curated?collection=${c}`);
      setItems(res.ok ? await res.json() : []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load(collection);
  }, [collection]);

  async function save(form: Partial<Curated>) {
    setBusy(true);
    setErr("");
    try {
      const editingRow = Boolean(form.id);
      const res = await fetch(`/api/yazar/curated?collection=${collection}`, {
        method: editingRow ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(typeof b.detail === "string" ? b.detail : "Kaydedilemedi");
      }
      setEditing(null);
      await load(collection);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Bu kartı silmek istediğine emin misin?")) return;
    await fetch(`/api/yazar/curated?collection=${collection}&id=${id}`, { method: "DELETE" });
    await load(collection);
  }

  if (editing) {
    return (
      <CuratedEditor
        collection={collection}
        initial={editing}
        busy={busy}
        err={err}
        onCancel={() => {
          setEditing(null);
          setErr("");
        }}
        onSave={save}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-line bg-wash p-0.5 dark:border-d-line dark:bg-d-wash">
          {(Object.keys(COLLECTION_LABEL) as CuratedCollection[]).map((c) => (
            <button
              key={c}
              onClick={() => setCollection(c)}
              className={`rounded-md px-2.5 py-1 text-[12.5px] font-medium ${
                collection === c
                  ? "bg-paper text-ink shadow-soft dark:bg-d-paper dark:text-d-ink"
                  : "text-ink-2 dark:text-d-ink-2"
              }`}
            >
              {COLLECTION_LABEL[c]}
            </button>
          ))}
        </div>
        <button onClick={() => setEditing({})} className="btn-dark">
          <Plus className="h-4 w-4" /> Yeni kart
        </button>
      </div>
      <p className="text-[12px] text-muted">
        Bu kartlar Türkiye sayfasında "{COLLECTION_LABEL[collection]}" bölümünde görünür. Sıra
        numarası küçük olan önce gelir.
      </p>

      {loading ? (
        <p className="text-[13px] text-muted">Yükleniyor…</p>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-muted">Bu listede kart yok.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="card flex flex-wrap items-start justify-between gap-3 p-3.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] tabular-nums text-muted">#{it.sort_order}</span>
                  {it.kind && <span className="badge">{it.kind}</span>}
                  {!it.enabled && (
                    <span className="rounded bg-wash px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-2 dark:bg-d-wash dark:text-d-ink-2">
                      gizli
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[14px] font-bold text-ink dark:text-d-ink">{it.name}</p>
                <p className="truncate text-[11.5px] text-muted">{it.url}</p>
                {it.note_tr && (
                  <p className="mt-0.5 line-clamp-2 text-[12px] text-ink-2 dark:text-d-ink-2">
                    {it.note_tr}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(it)}
                  className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:text-ink dark:border-d-line dark:text-d-ink-2"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => remove(it.id)}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-live hover:text-live dark:border-d-line dark:text-d-ink-2"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CuratedEditor({
  collection,
  initial,
  busy,
  err,
  onCancel,
  onSave,
}: {
  collection: CuratedCollection;
  initial: Partial<Curated>;
  busy: boolean;
  err: string;
  onCancel: () => void;
  onSave: (f: Partial<Curated>) => void;
}) {
  const [f, setF] = useState({
    id: initial.id,
    name: initial.name ?? "",
    url: initial.url ?? "",
    kind: initial.kind ?? "",
    note_tr: initial.note_tr ?? "",
    note_en: initial.note_en ?? "",
    sort_order: initial.sort_order ?? 0,
    enabled: initial.enabled ?? true,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({
      ...s,
      [k]: k === "sort_order" ? Number(e.target.value) || 0 : e.target.value,
    }));

  return (
    <div className="space-y-4">
      <button
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-2 hover:text-ink dark:text-d-ink-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Listeye dön
      </button>
      <div className="card space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-ink-2 dark:text-d-ink-2">İsim</span>
            <input value={f.name} onChange={set("name")} className="field" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-ink-2 dark:text-d-ink-2">Tür</span>
            <input
              value={f.kind}
              onChange={set("kind")}
              list="curated-kinds"
              placeholder={CURATED_KINDS[collection].join(" / ")}
              className="field"
            />
            <datalist id="curated-kinds">
              {CURATED_KINDS[collection].map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-2 dark:text-d-ink-2">URL</span>
          <input value={f.url} onChange={set("url")} placeholder="https://…" className="field" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-2 dark:text-d-ink-2">Açıklama (TR)</span>
          <textarea value={f.note_tr} onChange={set("note_tr")} rows={2} className="field" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-2 dark:text-d-ink-2">Açıklama (EN)</span>
          <textarea value={f.note_en} onChange={set("note_en")} rows={2} className="field" />
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-ink-2 dark:text-d-ink-2">Sıra</span>
            <input
              type="number"
              value={f.sort_order}
              onChange={set("sort_order")}
              className="field w-24"
            />
          </label>
          <label className="mt-5 flex items-center gap-2 text-[13px] text-ink dark:text-d-ink">
            <input
              type="checkbox"
              checked={f.enabled}
              onChange={(e) => setF((s) => ({ ...s, enabled: e.target.checked }))}
            />
            Sitede göster
          </label>
        </div>
        {err && <p className="text-[12px] text-live">{err}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => onSave(f)}
            disabled={busy || !f.name || !f.url}
            className="rounded-lg bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-accent-ink disabled:opacity-40"
          >
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border border-line px-3.5 py-2 text-[12.5px] font-semibold text-ink-2 dark:border-d-line dark:text-d-ink-2"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- studio --- */

export function AuthorStudio({
  authed,
  studio,
  queue = [],
  newsQueue = [],
}: {
  authed: boolean;
  studio: Studio | null;
  queue?: QueueApp[];
  newsQueue?: QueueSubmission[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Partial<StudioColumn> | null>(null);
  const [tab, setTab] = useState<"columns" | "marketplace" | "news" | "turkiye">("columns");

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

  const { author, columns, is_moderator } = studio;
  const published = columns.filter((c) => c.status === "published").length;
  const drafts = columns.length - published;
  const pendingApps = queue.filter((a) => a.status === "pending").length;
  const pendingNews = newsQueue.filter((s) => s.status === "pending").length;

  return (
    <div className="space-y-7">
      {/* author card */}
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

      {is_moderator && (
        <div className="flex gap-1 border-b border-line dark:border-d-line">
          {(
            [
              ["columns", "Köşe Yazıları", null],
              ["marketplace", "Marketplace Başvuruları", pendingApps || null],
              ["news", "Haber Başvuruları", pendingNews || null],
              ["turkiye", "Türkiye", null],
            ] as const
          ).map(([id, label, badge]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors ${
                tab === id
                  ? "border-ink text-ink dark:border-d-ink dark:text-d-ink"
                  : "border-transparent text-ink-2 hover:text-ink dark:text-d-ink-2"
              }`}
            >
              {label}
              {badge != null && (
                <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {is_moderator && tab === "marketplace" ? (
        <MarketplaceQueue queue={queue} />
      ) : is_moderator && tab === "news" ? (
        <NewsQueue queue={newsQueue} />
      ) : is_moderator && tab === "turkiye" ? (
        <TurkiyeLinks />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
