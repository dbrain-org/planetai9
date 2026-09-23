"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Heart, MessageCircle, X } from "lucide-react";
import { relativeTime } from "@/lib/format";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  author_name: string;
  is_mine: boolean;
  parent_id?: string | null;
  reply_to_name?: string | null;
  like_count?: number;
  liked_by_me?: boolean;
};

type Me = { id: string; email: string; display_name: string };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent dark:bg-accent/20"
    >
      {initials(name)}
    </span>
  );
}

/** Instagram-style: author · @replyTo · rest of body. */
function CommentText({
  author,
  body,
  replyToName,
}: {
  author: string;
  body: string;
  replyToName?: string | null;
}) {
  let mention = replyToName?.trim() || null;
  let rest = body.trimStart();

  if (mention) {
    const prefix = `@${mention}`;
    if (rest.toLowerCase().startsWith(prefix.toLowerCase())) {
      rest = rest.slice(prefix.length).trimStart();
    } else {
      // Body may still have a different leading @token — drop it for display.
      rest = rest.replace(/^@\S+\s*/, "");
    }
  } else {
    const m = rest.match(/^@(\S+)\s*/);
    if (m) {
      mention = m[1] ?? null;
      rest = rest.slice(m[0].length);
    }
  }

  // Avoid "Author @Author …" when someone replies to themselves.
  if (mention && mention.toLowerCase() === author.trim().toLowerCase()) {
    mention = null;
  }

  return (
    <p className="text-[14px] leading-snug text-ink dark:text-d-ink">
      <span className="font-bold">{author}</span>
      {mention ? (
        <>
          {" "}
          <span className="font-semibold text-accent">@{mention}</span>
        </>
      ) : null}
      {rest ? ` ${rest}` : null}
    </p>
  );
}

export function CommentSection({
  slug,
  locale = "tr",
  kind = "event",
}: {
  slug: string;
  locale?: "tr" | "en";
  /** News = event; Türkiye LLM producers = developer; VeriVatan/Üniversite = page. */
  kind?: "event" | "developer" | "page";
}) {
  const tr = locale === "tr";
  const [comments, setComments] = useState<Comment[]>([]);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commentsBase =
    kind === "developer"
      ? `/api/engagement/developers/${encodeURIComponent(slug)}/comments`
      : kind === "page"
        ? `/api/engagement/pages/${encodeURIComponent(slug)}/comments`
        : `/api/engagement/${encodeURIComponent(slug)}/comments`;

  const load = useCallback(async () => {
    const res = await fetch(commentsBase, { cache: "no-store" });
    if (!res.ok) return;
    setComments((await res.json()) as Comment[]);
  }, [commentsBase]);

  useEffect(() => {
    load().catch(() => undefined);
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d ?? null))
      .catch(() => setMe(null));
  }, [load]);

  const roots = useMemo(() => comments.filter((c) => !c.parent_id), [comments]);
  const repliesByParent = useMemo(() => {
    const map = new Map<string, Comment[]>();
    for (const c of comments) {
      if (!c.parent_id) continue;
      const list = map.get(c.parent_id) ?? [];
      list.push(c);
      map.set(c.parent_id, list);
    }
    return map;
  }, [comments]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function postComment(text: string, parentId?: string | null) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(commentsBase, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: text,
          ...(parentId ? { parent_id: parentId } : {}),
        }),
      });      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setError(tr ? "Yorum için giriş yapmalısınız." : "Please sign in to comment.");
        return false;
      }
      if (!res.ok) {
        setError(typeof data.detail === "string" ? data.detail : tr ? "Gönderilemedi" : "Failed");
        return false;
      }
      const created = data as Comment;
      setComments((prev) => [...prev, created]);
      if (parentId) {
        const root =
          comments.find((x) => x.id === parentId)?.parent_id || parentId;
        setExpanded((prev) => new Set(prev).add(root));
      }
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (text.length < 2) return;
    if (await postComment(text)) setBody("");
  }

  async function onReplySubmit(e: FormEvent) {
    e.preventDefault();
    if (!replyTo) return;
    const text = replyBody.trim();
    if (text.length < 2) return;
    if (await postComment(text, replyTo.id)) {
      setReplyBody("");
      setReplyTo(null);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`${commentsBase}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    setComments((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
    if (replyTo?.id === id) setReplyTo(null);
  }

  async function toggleLike(c: Comment) {
    if (!me) {
      setError(tr ? "Beğenmek için giriş yapın." : "Sign in to like.");
      return;
    }
    const res = await fetch(`${commentsBase}/${encodeURIComponent(c.id)}/like`, {
      method: "POST",
    });
    if (res.status === 401) {
      setError(tr ? "Beğenmek için giriş yapın." : "Sign in to like.");
      return;
    }
    if (!res.ok) return;
    const data = (await res.json()) as { liked: boolean; like_count: number };
    setComments((prev) =>
      prev.map((x) =>
        x.id === c.id ? { ...x, liked_by_me: data.liked, like_count: data.like_count } : x,
      ),
    );
  }

  function startReply(c: Comment) {
    if (!me) {
      setError(tr ? "Yanıtlamak için giriş yapın." : "Sign in to reply.");
      return;
    }
    setReplyTo(c);
    // Prefill @name like Instagram; backend also ensures it on save.
    setReplyBody(`@${c.author_name} `);
    setError(null);
  }

  function CommentRow({ c }: { c: Comment }) {
    const likes = c.like_count ?? 0;
    return (
      <div className="flex gap-3 py-2.5">
        <Avatar name={c.author_name} />
        <div className="min-w-0 flex-1">
          <CommentText
            author={c.author_name}
            body={c.body}
            replyToName={c.reply_to_name}
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-muted">
            <time>{relativeTime(c.created_at, locale)}</time>
            {likes > 0 && (
              <span>
                {likes} {tr ? "beğeni" : likes === 1 ? "like" : "likes"}
              </span>
            )}
            <button
              type="button"
              onClick={() => startReply(c)}
              className="hover:text-ink dark:hover:text-d-ink"
            >
              {tr ? "Yanıtla" : "Reply"}
            </button>
            {c.is_mine && (
              <button type="button" onClick={() => remove(c.id)} className="hover:text-red-600">
                {tr ? "Sil" : "Delete"}
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => toggleLike(c)}
          className="mt-0.5 shrink-0 self-start p-1 text-muted transition-colors hover:text-live"
          aria-label={tr ? "Beğen" : "Like"}
          aria-pressed={Boolean(c.liked_by_me)}
        >
          <Heart className={`h-3.5 w-3.5 ${c.liked_by_me ? "fill-live text-live" : ""}`} />
        </button>
      </div>
    );
  }

  return (
    <section id="yorumlar" className="mt-12 scroll-mt-28 border-t border-line pt-10 dark:border-d-line">
      <div className="mb-5">
        <h2 className="sec-title flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-accent" strokeWidth={2.2} />
          {tr ? "Yorumlar" : "Comments"}
          {comments.length > 0 && (
            <span className="ml-1 text-[15px] font-bold tabular-nums text-muted">
              {comments.length}
            </span>
          )}
        </h2>
      </div>

      {me === undefined ? null : me ? (
        <form onSubmit={onSubmit} className="mb-4 flex gap-3">
          <Avatar name={me.display_name} />
          <div className="min-w-0 flex-1">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder={tr ? "Yorum ekle…" : "Add a comment…"}
              className="w-full resize-none border-0 border-b border-line bg-transparent px-0 py-2 text-[14px] text-ink outline-none placeholder:text-muted focus:border-accent dark:border-d-line dark:text-d-ink"
            />
            {error && !replyTo && (
              <p className="mt-1 text-[12px] text-red-600 dark:text-red-400">{error}</p>
            )}
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={busy || body.trim().length < 2}
                className="text-[13px] font-bold text-accent disabled:opacity-40"
              >
                {tr ? "Paylaş" : "Post"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="mb-4 text-[14px] text-ink-2 dark:text-d-ink-2">
          {tr ? "Yorum için " : "To comment, "}
          <Link href={`/giris?next=/news/${encodeURIComponent(slug)}`} className="link-accent">
            {tr ? "giriş yapın" : "sign in"}
          </Link>
          .
        </p>
      )}

      <div>
        {roots.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-muted">
            {tr ? "Henüz yorum yok." : "No comments yet."}
          </p>
        ) : (
          roots.map((c) => {
            const replies = repliesByParent.get(c.id) ?? [];
            const open = expanded.has(c.id);
            return (
              <div key={c.id} className="border-b border-line last:border-0 dark:border-d-line">
                <CommentRow c={c} />

                {replies.length > 0 && !open && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(c.id)}
                    className="mb-3 ml-11 flex items-center gap-2 text-[12px] font-semibold text-muted hover:text-ink dark:hover:text-d-ink"
                  >
                    <span className="inline-block h-px w-6 bg-line dark:bg-d-line" />
                    {tr
                      ? `${replies.length} yanıtı gör`
                      : `View ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
                  </button>
                )}

                {replies.length > 0 && open && (
                  <div className="mb-2 ml-11">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(c.id)}
                      className="mb-1 flex items-center gap-2 text-[12px] font-semibold text-muted hover:text-ink"
                    >
                      <span className="inline-block h-px w-6 bg-line dark:bg-d-line" />
                      {tr ? "Yanıtları gizle" : "Hide replies"}
                    </button>
                    {replies.map((r) => (
                      <CommentRow key={r.id} c={r} />
                    ))}
                  </div>
                )}

                {replyTo && (replyTo.id === c.id || replyTo.parent_id === c.id) && me && (
                  <form
                    onSubmit={onReplySubmit}
                    className="mb-4 ml-11 rounded-lg bg-wash/70 p-3 dark:bg-d-wash/40"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[12px] text-muted">
                        {tr ? "Yanıt:" : "Replying to"}{" "}
                        <span className="font-semibold text-accent">@{replyTo.author_name}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTo(null);
                          setReplyBody("");
                        }}
                        aria-label={tr ? "Kapat" : "Close"}
                      >
                        <X className="h-4 w-4 text-muted" />
                      </button>
                    </div>
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      rows={2}
                      maxLength={2000}
                      autoFocus
                      placeholder={`${tr ? "Yanıtını yaz…" : "Write a reply…"}`}
                      className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-accent dark:border-d-line dark:bg-d-paper dark:text-d-ink"
                    />
                    {error && replyTo && (
                      <p className="mt-1 text-[12px] text-red-600">{error}</p>
                    )}
                    <div className="mt-2 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTo(null);
                          setReplyBody("");
                        }}
                        className="text-[12px] font-semibold text-muted"
                      >
                        {tr ? "Vazgeç" : "Cancel"}
                      </button>
                      <button
                        type="submit"
                        disabled={busy || replyBody.trim().length < 2}
                        className="text-[12px] font-bold text-accent disabled:opacity-40"
                      >
                        {tr ? "Yanıtla" : "Reply"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
