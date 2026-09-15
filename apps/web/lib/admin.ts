import "server-only";
import { cookies } from "next/headers";
import type { AuthorApplication, QueueApp, QueueSubmission } from "@/lib/types";

export const ADMIN_COOKIE = "planetai_admin";
const BASE = process.env.PLANETAI_API_URL ?? "http://localhost:8077";

export async function adminToken(): Promise<string | null> {
  try {
    return (await cookies()).get(ADMIN_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

/** Calls the moderation API with a token. `null` token or 401/404 ⇒ not authed. */
export async function adminFetch(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${BASE}/api/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: { ...init.headers, "content-type": "application/json", "x-admin-token": token },
  });
}

export async function loadQueue(
  token: string | null,
): Promise<{ authed: boolean; apps: QueueApp[] }> {
  if (!token) return { authed: false, apps: [] };
  try {
    const res = await adminFetch("/marketplace/queue", token);
    if (res.status === 401 || res.status === 404) return { authed: false, apps: [] };
    if (!res.ok) return { authed: true, apps: [] };
    return { authed: true, apps: (await res.json()) as QueueApp[] };
  } catch {
    return { authed: true, apps: [] };
  }
}

export async function loadNewsQueue(token: string | null): Promise<QueueSubmission[]> {
  if (!token) return [];
  try {
    const res = await adminFetch("/news-submissions/queue", token);
    if (!res.ok) return [];
    return (await res.json()) as QueueSubmission[];
  } catch {
    return [];
  }
}

export async function loadAuthorQueue(token: string | null): Promise<AuthorApplication[]> {
  if (!token) return [];
  try {
    const res = await adminFetch("/authors/queue", token);
    if (!res.ok) return [];
    return (await res.json()) as AuthorApplication[];
  } catch {
    return [];
  }
}
