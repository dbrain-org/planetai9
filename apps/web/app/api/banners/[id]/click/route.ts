import { NextResponse } from "next/server";

const BASE = process.env.PLANETAI_API_URL ?? "http://localhost:8077";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const res = await fetch(`${BASE}/api/v1/banners/${encodeURIComponent(id)}/click`, {
    method: "POST",
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
