import { NextResponse } from "next/server";
import { adminFetch, adminToken } from "@/lib/admin";

export async function GET() {
  const token = await adminToken();
  if (!token) return NextResponse.json({ detail: "yetkisiz" }, { status: 401 });
  try {
    const res = await adminFetch("/curated/education/manage", token);
    const data = await res.json().catch(() => []);
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: "api unreachable" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const token = await adminToken();
  if (!token) return NextResponse.json({ detail: "yetkisiz" }, { status: 401 });
  const body = (await req.json()) as { id?: string; enabled?: boolean };
  if (!body.id || typeof body.enabled !== "boolean") {
    return NextResponse.json({ detail: "id ve enabled gerekli" }, { status: 400 });
  }
  try {
    const res = await adminFetch(`/curated/education/${encodeURIComponent(body.id)}/status`, token, {
      method: "POST",
      body: JSON.stringify({ enabled: body.enabled }),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: "api unreachable" }, { status: 502 });
  }
}
