import { NextResponse } from "next/server";

const BASE = process.env.PLANETAI_API_URL ?? "http://localhost:8077";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ detail: "geçersiz istek" }, { status: 400 });

  const res = await fetch(`${BASE}/api/v1/auth/magic-link`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
