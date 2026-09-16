import { NextResponse } from "next/server";
import { adminFetch, adminToken } from "@/lib/admin";

export async function GET() {
  const token = await adminToken();
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const res = await adminFetch("/curated/tr_share/manage", token);
    const data = await res.json().catch(() => []);
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json([], { status: 502 });
  }
}

export async function POST(req: Request) {
  const token = await adminToken();
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });
  let id = "";
  let enabled = false;
  try {
    const body = await req.json();
    id = String(body.id ?? "");
    enabled = Boolean(body.enabled);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const res = await adminFetch(`/curated/tr_share/${encodeURIComponent(id)}/status`, token, {
      method: "POST",
      body: JSON.stringify({ enabled }),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
