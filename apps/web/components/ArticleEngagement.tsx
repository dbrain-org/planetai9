"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, Heart, MessageCircle, Share2, Check } from "lucide-react";

type Engagement = {
  slug: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  share_url: string;
};

function formatCount(n: number, locale: "tr" | "en"): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  const s = k >= 10 ? String(Math.round(k)) : k.toFixed(1).replace(/\.0$/, "");
  return locale === "tr" ? `${s}B` : `${s}k`;
}

export function ArticleEngagement({
  slug,
  locale = "tr",
}: {
  slug: string;
  locale?: "tr" | "en";
}) {
  const tr = locale === "tr";
  const [data, setData] = useState<Engagement | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [needAuth, setNeedAuth] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/engagement/${encodeURIComponent(slug)}?action=view`, {
          method: "POST",
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as Engagement;
        setData(json);
        setLiked(Boolean(json.liked_by_me));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function toggleLike() {
    if (likeBusy) return;
    setLikeBusy(true);
    setNeedAuth(false);
    try {
      const res = await fetch(`/api/engagement/${encodeURIComponent(slug)}?action=like`, {
        method: "POST",
      });
      if (res.status === 401) {
        setNeedAuth(true);
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setLiked(Boolean(json.liked));
      setData((prev) =>
        prev
          ? {
              ...prev,
              like_count: Number(json.like_count ?? prev.like_count),
              liked_by_me: Boolean(json.liked),
            }
          : prev,
      );
    } finally {
      setLikeBusy(false);
    }
  }

  async function share() {
    const url = data?.share_url || (typeof window !== "undefined" ? window.location.href : "");
    try {
      if (navigator.share) {
        await navigator.share({ url, title: document.title });
        return;
      }
    } catch {
      /* fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const views = data?.view_count ?? 0;
  const likes = data?.like_count ?? 0;
  const comments = data?.comment_count ?? 0;

  const chip =
    "inline-flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-[13px] font-semibold text-ink-2 transition-colors dark:border-d-line dark:bg-d-canvas dark:text-d-ink-2";

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={chip} title={tr ? "Okunma" : "Views"}>
          <Eye className="h-4 w-4 text-accent" />
          <span className="tabular-nums text-ink dark:text-d-ink">{formatCount(views, locale)}</span>
          <span className="hidden text-[11px] font-medium text-muted sm:inline">
            {tr ? "okuma" : "views"}
          </span>
        </span>

        <button
          type="button"
          onClick={toggleLike}
          disabled={likeBusy}
          className={`${chip} hover:border-accent ${
            liked ? "border-accent bg-accent-soft text-accent dark:bg-accent/15" : "hover:bg-wash dark:hover:bg-d-wash"
          }`}
          aria-pressed={liked}
          title={tr ? "Beğen" : "Like"}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-current text-accent" : "text-accent"}`} />
          <span className={`tabular-nums ${liked ? "text-accent" : "text-ink dark:text-d-ink"}`}>
            {formatCount(likes, locale)}
          </span>
          <span className="hidden text-[11px] font-medium text-muted sm:inline">
            {tr ? "beğeni" : "likes"}
          </span>
        </button>

        <a href="#yorumlar" className={`${chip} hover:border-accent hover:bg-wash dark:hover:bg-d-wash`}>
          <MessageCircle className="h-4 w-4 text-accent" />
          <span className="tabular-nums text-ink dark:text-d-ink">{formatCount(comments, locale)}</span>
          <span className="hidden text-[11px] font-medium text-muted sm:inline">
            {tr ? "yorum" : "comments"}
          </span>
        </a>

        <button
          type="button"
          onClick={share}
          className={`${chip} ml-auto hover:border-accent hover:bg-wash dark:hover:bg-d-wash`}
        >
          {copied ? <Check className="h-4 w-4 text-accent" /> : <Share2 className="h-4 w-4 text-accent" />}
          <span className="text-ink dark:text-d-ink">
            {copied ? (tr ? "Kopyalandı" : "Copied") : tr ? "Paylaş" : "Share"}
          </span>
        </button>
      </div>

      {needAuth && (
        <p className="mt-2.5 text-[13px] text-ink-2 dark:text-d-ink-2">
          {tr ? "Beğenmek için " : "To like, please "}
          <Link href={`/giris?next=/news/${encodeURIComponent(slug)}`} className="link-accent">
            {tr ? "giriş yapın" : "sign in"}
          </Link>
          .
        </p>
      )}
    </div>
  );
}
