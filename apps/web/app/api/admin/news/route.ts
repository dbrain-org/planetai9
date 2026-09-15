import { NextResponse } from "next/server";
import { adminFetch, adminToken } from "@/lib/admin";

export async function POST(req: Request) {
  const token = await adminToken();
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  let id = "";
  let status = "";
  try {
    const body = await req.json();
    id = String(body.id ?? "");
    status = String(body.status ?? "");
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!id || !["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const res = await adminFetch(`/news-submissions/${encodeURIComponent(id)}/status`, token, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, detail: "API'ye ulaşılamadı" }, { status: 502 });
  }
}

export async function PATCH(req: Request) {
  const token = await adminToken();
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  let id = "";
  let patch: Record<string, unknown> = {};
  try {
    const body = await req.json();
    id = String(body.id ?? "");
    const { id: _drop, ...rest } = body as Record<string, unknown>;
    patch = rest;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const res = await adminFetch(`/news-submissions/${encodeURIComponent(id)}`, token, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, detail: "API'ye ulaşılamadı" }, { status: 502 });
  }
}
