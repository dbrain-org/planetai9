import { NextResponse } from "next/server";
import { authorFetch, authorKey } from "@/lib/author";

const COLLECTIONS = new Set(["tr_data", "tr_share", "tr_ecosystem", "education"]);

function coll(req: Request): string | null {
  const c = new URL(req.url).searchParams.get("collection") ?? "";
  return COLLECTIONS.has(c) ? c : null;
}

function payload(b: Record<string, unknown>) {
  return {
    name: String(b.name ?? "").trim(),
    url: String(b.url ?? "").trim(),
    kind: String(b.kind ?? "").trim(),
    note_tr: b.note_tr ? String(b.note_tr).trim() : null,
    note_en: b.note_en ? String(b.note_en).trim() : null,
    sort_order: Number(b.sort_order ?? 0) || 0,
    enabled: b.enabled !== false,
  };
}

/** Moderator: full list for a collection (incl. disabled). */
export async function GET(req: Request) {
  const key = await authorKey();
  const c = coll(req);
  if (!key) return NextResponse.json({ ok: false }, { status: 401 });
  if (!c) return NextResponse.json({ ok: false }, { status: 400 });
  const res = await authorFetch(`/curated/${c}/manage`, key);
  return NextResponse.json(await res.json().catch(() => []), { status: res.status });
}

export async function POST(req: Request) {
  const key = await authorKey();
  const c = coll(req);
  if (!key) return NextResponse.json({ ok: false }, { status: 401 });
  if (!c) return NextResponse.json({ ok: false }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const res = await authorFetch(`/curated/${c}`, key, {
    method: "POST",
    body: JSON.stringify(payload(body)),
  });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}

export async function PATCH(req: Request) {
  const key = await authorKey();
  const c = coll(req);
  if (!key) return NextResponse.json({ ok: false }, { status: 401 });
  if (!c) return NextResponse.json({ ok: false }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  const res = await authorFetch(`/curated/${c}/${encodeURIComponent(id)}`, key, {
    method: "PATCH",
    body: JSON.stringify(payload(body)),
  });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}

export async function DELETE(req: Request) {
  const key = await authorKey();
  const c = coll(req);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!key) return NextResponse.json({ ok: false }, { status: 401 });
  if (!c || !id) return NextResponse.json({ ok: false }, { status: 400 });
  const res = await authorFetch(`/curated/${c}/${encodeURIComponent(id)}`, key, { method: "DELETE" });
  return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : res.status });
}
