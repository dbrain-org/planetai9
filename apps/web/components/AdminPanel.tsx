"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, KeyRound, LogOut, Pencil, RotateCcw, X } from "lucide-react";
import type { AuthorApplication, CuratedShareItem, QueueApp, QueueSubmission } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  pending: "Beklemede",
  approved: "Yayında",
  rejected: "Reddedildi",
  active: "Aktif",
};
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-accent-soft text-accent dark:bg-accent/15 dark:text-blue-300",
  approved: "bg-[#EAF7EF] text-success dark:bg-success/15",
  active: "bg-[#EAF7EF] text-success dark:bg-success/15",
  rejected: "bg-wash text-ink-2 dark:bg-d-wash dark:text-d-ink-2",
};

const ACCEPT =
  "image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif,image/bmp,image/tiff,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp,.tif,.tiff,.heic,.heif";

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function LoginForm() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
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
    <form onSubmit={submit} className="card max-w-sm space-y-3 p-6">
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-ink-2 dark:text-d-ink-2">
          Yönetim anahtarı
        </span>
        <input
          type="password"
          autoFocus
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="field"
        />
      </label>
      {err && <p className="text-[12px] text-live">{err}</p>}
      <button type="submit" disabled={busy || !token} className="btn-dark disabled:opacity-50">
        {busy ? "Kontrol ediliyor…" : "Giriş"}
      </button>
    </form>
  );
}

function AppRow({
  app,
  onAction,
}: {
  app: QueueApp;
  onAction: (slug: string, status: string) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const act = async (status: string) => {
    setPending(true);
    try {
      await onAction(app.slug, status);
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
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLE[app.status]}`}
            >
              {STATUS_LABEL[app.status]}
            </span>
            <span className="text-[11px] uppercase tracking-wide text-muted">
              {app.category_label}
            </span>
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
          {new URL(app.url).hostname.replace(/^www\./, "")} <ExternalLink className="h-3 w-3" />
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

type NewsPatch = {
  title: string;
  summary: string;
  description: string;
  image_urls: string[];
  is_staff: boolean;
};

function NewsRow({
  item,
  onAction,
  onSave,
}: {
  item: QueueSubmission;
  onAction: (id: string, status: string) => Promise<void>;
  onSave: (id: string, patch: NewsPatch) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [summary, setSummary] = useState(item.summary ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [images, setImages] = useState<string[]>(item.image_urls ?? []);
  const [isStaff, setIsStaff] = useState(Boolean(item.is_staff));
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const act = async (status: string) => {
    setPending(true);
    try {
      await onAction(item.id, status);
    } finally {
      setPending(false);
    }
  };

  const save = async () => {
    setPending(true);
    try {
      await onSave(item.id, {
        title: title.trim(),
        summary: summary.trim(),
        description: description.trim(),
        image_urls: images,
        is_staff: isStaff,
      });
      setEditing(false);
    } finally {
      setPending(false);
    }
  };

  const resetEdit = () => {
    setEditing(false);
    setTitle(item.title);
    setSummary(item.summary ?? "");
    setDescription(item.description ?? "");
    setImages(item.image_urls ?? []);
    setIsStaff(Boolean(item.is_staff));
  };

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    try {
      const next = [...images];
      for (const file of Array.from(files)) {
        if (next.length >= 12) break;
        const up = new FormData();
        up.append("file", file);
        const res = await fetch("/api/haber-giris/upload", { method: "POST", body: up });
        if (!res.ok) continue;
        const data = (await res.json()) as { url: string };
        if (!next.includes(data.url)) next.push(data.url);
      }
      setImages(next);
    } finally {
      setUploading(false);
    }
  }

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLE[item.status]}`}
            >
              {STATUS_LABEL[item.status]}
            </span>
            {item.is_staff && (
              <span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-white dark:text-ink">
                PlanetAI9
              </span>
            )}
          </div>
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field mt-2"
              placeholder="Haber başlığı"
            />
          ) : (
            <h3 className="mt-1.5 text-[15px] font-bold text-ink dark:text-d-ink">{item.title}</h3>
          )}
        </div>
        {item.event_slug && (
          <a
            href={`/news/${item.event_slug}`}
            className="inline-flex items-center gap-1 text-[12px] text-accent"
          >
            Haberi gör <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {editing ? (
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          className="field mt-3 resize-y"
          placeholder="Alt başlık (1–2 cümle)"
        />
      ) : (
        item.summary && (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2 dark:text-d-ink-2">{item.summary}</p>
        )
      )}

      {editing ? (
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={14}
          className="field mt-3 resize-y min-h-[220px]"
          placeholder="Haber içeriği"
        />
      ) : (
        item.description && (
          <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-2 dark:text-d-ink-2">
            {item.description}
          </p>
        )
      )}

      {(editing || (item.image_urls?.length ?? 0) > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(editing ? images : item.image_urls ?? []).map((u) => (
            <div key={u} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="h-20 w-20 rounded-lg bg-wash object-contain dark:bg-d-wash" />
              {editing && (
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((x) => x !== u))}
                  className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/55 text-white"
                  aria-label="Kaldır"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {editing && images.length < 12 && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                multiple
                className="hidden"
                onChange={(e) => {
                  void addPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="grid h-20 w-20 place-items-center rounded-lg border border-dashed border-line text-[11px] text-muted disabled:opacity-50 dark:border-d-line"
              >
                {uploading ? "…" : "+ Foto"}
              </button>
            </>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
        {item.submitter_name && <span>Gönderen: {item.submitter_name}</span>}
        {item.submitter_profession && <span>Meslek: {item.submitter_profession}</span>}
        {item.submitter_company && <span>Şirket: {item.submitter_company}</span>}
        {item.submitter_email && <span>{item.submitter_email}</span>}
        {item.submitter_phone && <span>{item.submitter_phone}</span>}
        <span>{fmtDate(item.created_at)}</span>
      </div>

      {editing && (
        <label className="mt-3 flex items-center gap-2 text-[12px] text-ink-2 dark:text-d-ink-2">
          <input
            type="checkbox"
            checked={isStaff}
            onChange={(e) => setIsStaff(e.target.checked)}
          />
          Site ekibi haberi (kaynak: PlanetAI9 — Okuyucu Haberleri yazılmaz)
        </label>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {editing ? (
          <>
            <button
              onClick={save}
              disabled={
                pending ||
                title.trim().length < 4 ||
                summary.trim().length < 20 ||
                description.trim().length < 40
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-ink"
            >
              Kaydet
            </button>
            <button
              onClick={resetEdit}
              className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold dark:border-d-line"
            >
              Vazgeç
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2 dark:border-d-line dark:text-d-ink-2"
          >
            <Pencil className="h-3.5 w-3.5" /> Düzenle
          </button>
        )}
        {item.status !== "approved" && (
          <button
            onClick={() => act("approved")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Onayla & yayınla
          </button>
        )}
        {item.status !== "rejected" && (
          <button
            onClick={() => act("rejected")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-live hover:text-live disabled:opacity-50 dark:border-d-line dark:text-d-ink-2"
          >
            <X className="h-3.5 w-3.5" /> Reddet
          </button>
        )}
        {item.status !== "pending" && (
          <button
            onClick={() => act("pending")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2 disabled:opacity-50 dark:border-d-line dark:text-d-ink-2"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Beklemeye al
          </button>
        )}
      </div>
    </li>
  );
}

function AuthorRow({
  item,
  onStatus,
  onIssueKey,
}: {
  item: AuthorApplication;
  onStatus: (slug: string, status: string) => Promise<void>;
  onIssueKey: (slug: string) => Promise<string | null>;
}) {
  const [pending, setPending] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);

  const act = async (status: string) => {
    setPending(true);
    try {
      await onStatus(item.slug, status);
    } finally {
      setPending(false);
    }
  };

  const issue = async () => {
    setPending(true);
    try {
      const key = await onIssueKey(item.slug);
      if (key) setIssuedKey(key);
    } finally {
      setPending(false);
    }
  };

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLE[item.status] ?? STATUS_STYLE.pending}`}
            >
              {STATUS_LABEL[item.status] ?? item.status}
            </span>
            {item.has_key && <span className="text-[11px] text-muted">anahtar var</span>}
          </div>
          <h3 className="mt-1.5 text-[15px] font-bold text-ink dark:text-d-ink">{item.name}</h3>
          {item.role && <p className="text-[13px] text-ink-2 dark:text-d-ink-2">{item.role}</p>}
        </div>
        <span className="text-[11px] text-muted">{item.slug}</span>
      </div>
      {item.bio && (
        <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {item.bio}
        </p>
      )}
      {item.application_note && (
        <p className="mt-2 text-[12px] text-muted">Not: {item.application_note}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
        {item.email && <span>{item.email}</span>}
        <span>{fmtDate(item.created_at)}</span>
      </div>
      {issuedKey && (
        <p className="mt-3 break-all rounded-lg bg-wash px-3 py-2 font-mono text-[12px] text-ink dark:bg-d-wash dark:text-d-ink">
          {issuedKey}
          <span className="mt-1 block font-sans text-[11px] text-muted">
            Bu anahtarı bir kez gösteriyoruz — yazara ilet.
          </span>
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {item.status !== "active" && (
          <button
            onClick={() => act("active")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Onayla
          </button>
        )}
        <button
          onClick={issue}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2 disabled:opacity-50 dark:border-d-line dark:text-d-ink-2"
        >
          <KeyRound className="h-3.5 w-3.5" /> Anahtar ver
        </button>
        {item.status !== "rejected" && (
          <button
            onClick={() => act("rejected")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-live hover:text-live disabled:opacity-50 dark:border-d-line dark:text-d-ink-2"
          >
            <X className="h-3.5 w-3.5" /> Reddet
          </button>
        )}
        {item.status !== "pending" && (
          <button
            onClick={() => act("pending")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2 disabled:opacity-50 dark:border-d-line dark:text-d-ink-2"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Beklemeye al
          </button>
        )}
      </div>
    </li>
  );
}

export function AdminPanel({
  authed,
  apps,
  news,
  authors,
  shares = [],
}: {
  authed: boolean;
  apps: QueueApp[];
  news: QueueSubmission[];
  authors: AuthorApplication[];
  shares?: CuratedShareItem[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<"news" | "marketplace" | "authors" | "verivatan">("news");

  if (!authed) return <LoginForm />;

  async function onAppAction(slug: string, status: string) {
    const res = await fetch("/api/admin/moderate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, status }),
    });
    if (res.ok) startTransition(() => router.refresh());
  }

  async function onNewsAction(id: string, status: string) {
    const res = await fetch("/api/admin/news", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) startTransition(() => router.refresh());
  }

  async function onNewsSave(id: string, patch: NewsPatch) {
    const res = await fetch("/api/admin/news", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (res.ok) startTransition(() => router.refresh());
  }

  async function onAuthorStatus(slug: string, status: string) {
    const res = await fetch("/api/admin/authors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, status }),
    });
    if (res.ok) startTransition(() => router.refresh());
  }

  async function onAuthorKey(slug: string): Promise<string | null> {
    const res = await fetch("/api/admin/authors", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { key?: string };
    startTransition(() => router.refresh());
    return data.key ?? null;
  }

  async function onShareAction(id: string, enabled: boolean) {
    const res = await fetch("/api/admin/verivatan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
    if (res.ok) startTransition(() => router.refresh());
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.refresh();
  }

  const pendingApps = apps.filter((a) => a.status === "pending");
  const decidedApps = apps.filter((a) => a.status !== "pending");
  const pendingNews = news.filter((n) => n.status === "pending");
  const decidedNews = news.filter((n) => n.status !== "pending");
  const pendingAuthors = authors.filter((a) => a.status === "pending");
  const otherAuthors = authors.filter((a) => a.status !== "pending");
  const pendingShares = shares.filter((s) => !s.enabled);
  const approvedShares = shares.filter((s) => s.enabled);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 border-b border-line dark:border-d-line">
          {(
            [
              ["news", "Haberler", pendingNews.length],
              ["verivatan", "VeriVatan", pendingShares.length],
              ["authors", "Yazarlar", pendingAuthors.length],
              ["marketplace", "TAKYAP", pendingApps.length],
            ] as const
          ).map(([id, label, badge]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-semibold ${
                tab === id
                  ? "border-ink text-ink dark:border-d-ink dark:text-d-ink"
                  : "border-transparent text-ink-2 dark:text-d-ink-2"
              }`}
            >
              {label}
              {badge > 0 && (
                <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-2 hover:text-ink dark:text-d-ink-2"
        >
          <LogOut className="h-3.5 w-3.5" /> Çıkış
        </button>
      </div>

      {tab === "news" ? (
        <>
          <section>
            <h2 className="sec-title mb-4">Bekleyen haberler</h2>
            {pendingNews.length === 0 ? (
              <p className="text-[13px] text-muted">Bekleyen haber yok.</p>
            ) : (
              <ul className="space-y-3">
                {pendingNews.map((n) => (
                  <NewsRow key={n.id} item={n} onAction={onNewsAction} onSave={onNewsSave} />
                ))}
              </ul>
            )}
          </section>
          {decidedNews.length > 0 && (
            <section>
              <h2 className="sec-title mb-4">Karar verilen haberler</h2>
              <ul className="space-y-3">
                {decidedNews.map((n) => (
                  <NewsRow key={n.id} item={n} onAction={onNewsAction} onSave={onNewsSave} />
                ))}
              </ul>
            </section>
          )}
        </>
      ) : tab === "verivatan" ? (
        <>
          <section>
            <h2 className="sec-title mb-4">Bekleyen veri paylaşımları</h2>
            {pendingShares.length === 0 ? (
              <p className="text-[13px] text-muted">Bekleyen paylaşım yok.</p>
            ) : (
              <ul className="space-y-3">
                {pendingShares.map((s) => (
                  <li key={s.id} className="card p-4">
                    <h3 className="text-[15px] font-bold text-ink dark:text-d-ink">{s.name}</h3>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[12px] text-accent"
                    >
                      {s.url} <ExternalLink className="h-3 w-3" />
                    </a>
                    {s.note_tr && (
                      <p className="mt-2 text-[12.5px] text-ink-2 dark:text-d-ink-2">{s.note_tr}</p>
                    )}
                    {s.note_en && <p className="mt-1 text-[11.5px] text-muted">{s.note_en}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => onShareAction(s.id, true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-[12px] font-semibold text-white"
                      >
                        <Check className="h-3.5 w-3.5" /> Onayla & yayınla
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {approvedShares.length > 0 && (
            <section>
              <h2 className="sec-title mb-4">Yayındaki paylaşımlar</h2>
              <ul className="space-y-3">
                {approvedShares.map((s) => (
                  <li key={s.id} className="card p-4">
                    <h3 className="text-[15px] font-bold">{s.name}</h3>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-accent">
                      {s.url}
                    </a>
                    <div className="mt-3">
                      <button
                        onClick={() => onShareAction(s.id, false)}
                        className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold dark:border-d-line"
                      >
                        Yayından kaldır
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : tab === "authors" ? (
        <>
          <section>
            <h2 className="sec-title mb-4">Yazarlık başvuruları</h2>
            {pendingAuthors.length === 0 ? (
              <p className="text-[13px] text-muted">Bekleyen başvuru yok.</p>
            ) : (
              <ul className="space-y-3">
                {pendingAuthors.map((a) => (
                  <AuthorRow
                    key={a.slug}
                    item={a}
                    onStatus={onAuthorStatus}
                    onIssueKey={onAuthorKey}
                  />
                ))}
              </ul>
            )}
          </section>
          {otherAuthors.length > 0 && (
            <section>
              <h2 className="sec-title mb-4">Diğer yazarlar</h2>
              <ul className="space-y-3">
                {otherAuthors.map((a) => (
                  <AuthorRow
                    key={a.slug}
                    item={a}
                    onStatus={onAuthorStatus}
                    onIssueKey={onAuthorKey}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <>
          <section>
            <h2 className="sec-title mb-4">Bekleyen başvurular</h2>
            {pendingApps.length === 0 ? (
              <p className="text-[13px] text-muted">Bekleyen başvuru yok.</p>
            ) : (
              <ul className="space-y-3">
                {pendingApps.map((a) => (
                  <AppRow key={a.slug} app={a} onAction={onAppAction} />
                ))}
              </ul>
            )}
          </section>
          {decidedApps.length > 0 && (
            <section>
              <h2 className="sec-title mb-4">Karar verilenler</h2>
              <ul className="space-y-3">
                {decidedApps.map((a) => (
                  <AppRow key={a.slug} app={a} onAction={onAppAction} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
