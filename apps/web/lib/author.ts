import "server-only";
import { cookies } from "next/headers";
import type { QueueApp, QueueSubmission } from "@/lib/types";

export const AUTHOR_COOKIE = "planetai_author";
const BASE = process.env.PLANETAI_API_URL ?? "http://localhost:8077";

export interface StudioColumn {
  slug: string;
  title: string;
  dek: string | null;
  body: string;
  hero_image_url: string | null;
  status: "draft" | "published";
  published_at: string;
  updated_at: string;
}

export interface StudioAuthor {
  slug: string;
  name: string;
  role: string | null;
  avatar_url: string | null;
  bio: string | null;
  links: Record<string, string>;
}

export interface Studio {
  author: StudioAuthor;
  columns: StudioColumn[];
  is_moderator: boolean;
}

export async function authorKey(): Promise<string | null> {
  try {
    return (await cookies()).get(AUTHOR_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

/** Calls the studio API with the "<slug>:<secret>" key. */
export async function authorFetch(
  path: string,
  key: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${BASE}/api/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: { ...init.headers, "content-type": "application/json", "x-author-key": key },
  });
}

export async function loadStudio(
  key: string | null,
): Promise<{ authed: boolean; studio: Studio | null }> {
  if (!key) return { authed: false, studio: null };
  try {
    const res = await authorFetch("/authors/me/studio", key);
    if (res.status === 401 || res.status === 404) return { authed: false, studio: null };
    if (!res.ok) return { authed: true, studio: null };
    return { authed: true, studio: (await res.json()) as Studio };
  } catch {
    return { authed: false, studio: null };
  }
}

/** Marketplace moderation queue — only for authors listed as moderators. */
export async function loadQueue(key: string | null): Promise<QueueApp[]> {
  if (!key) return [];
  try {
    const res = await authorFetch("/marketplace/queue", key);
    if (!res.ok) return [];
    return (await res.json()) as QueueApp[];
  } catch {
    return [];
  }
}

/** Reader news-submission moderation queue — only for moderator authors. */
export async function loadNewsQueue(key: string | null): Promise<QueueSubmission[]> {
  if (!key) return [];
  try {
    const res = await authorFetch("/news-submissions/queue", key);
    if (!res.ok) return [];
    return (await res.json()) as QueueSubmission[];
  } catch {
    return [];
  }
}
