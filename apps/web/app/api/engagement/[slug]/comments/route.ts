import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const BASE = process.env.PLANETAI_API_URL ?? "http://localhost:8077";

async function sessionHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return {
    accept: "application/json",
    ...(token ? { "X-Session-Token": token } : {}),
    ...extra,
  };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const res = await fetch(`${BASE}/api/v1/events/${encodeURIComponent(slug)}/comments`, {
    headers: await sessionHeaders(),
    cache: "no-store",
  });
  const data = await res.json().catch(() => []);
  return NextResponse.json(data, { status: res.status });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const body = await req.json().catch(() => null);
  const res = await fetch(`${BASE}/api/v1/events/${encodeURIComponent(slug)}/comments`, {
    method: "POST",
    headers: await sessionHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ detail: "id gerekli" }, { status: 400 });
  const res = await fetch(
    `${BASE}/api/v1/events/${encodeURIComponent(slug)}/comments/${encodeURIComponent(id)}`,
    { method: "DELETE", headers: await sessionHeaders() },
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
