import { NextResponse } from "next/server";
import { authorFetch, authorKey } from "@/lib/author";

const STATUSES = new Set(["pending", "approved", "rejected"]);

/** Moderator author changes a news submission's status (approving creates the Event). */
export async function POST(req: Request) {
  const key = await authorKey();
  if (!key) return NextResponse.json({ ok: false }, { status: 401 });

  let id = "";
  let status = "";
  try {
    const b = await req.json();
    id = String(b.id ?? "");
    status = String(b.status ?? "");
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!id || !STATUSES.has(status)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const res = await authorFetch(`/news-submissions/${encodeURIComponent(id)}/status`, key, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, detail: "API'ye ulaşılamadı" }, { status: 502 });
  }
}
