import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const BASE = process.env.PLANETAI_API_URL ?? "http://localhost:8077";
const ACTIONS = new Set(["view", "like", "share"]);

async function sessionHeaders(): Promise<HeadersInit> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return token ? { "X-Session-Token": token, accept: "application/json" } : { accept: "application/json" };
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const res = await fetch(`${BASE}/api/v1/columns/${encodeURIComponent(slug)}/engagement`, {
    headers: await sessionHeaders(),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const action = new URL(req.url).searchParams.get("action") || "view";
  if (!ACTIONS.has(action)) return NextResponse.json({ detail: "bad action" }, { status: 400 });
  const res = await fetch(`${BASE}/api/v1/columns/${encodeURIComponent(slug)}/${action}`, {
    method: "POST",
    headers: await sessionHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
