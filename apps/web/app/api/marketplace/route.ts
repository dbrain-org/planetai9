import { NextResponse } from "next/server";

const BASE = process.env.PLANETAI_API_URL ?? "http://localhost:8077";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "geçersiz istek" }, { status: 400 });
  }

  // drop empty optional fields so the API's URL validation doesn't choke
  const clean: Record<string, unknown> = Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(([, v]) => v !== "" && v != null),
  );
  // native checkboxes send "on" when checked and are omitted when unchecked
  clean.is_turkish_dev = clean.is_turkish_dev === "on" || clean.is_turkish_dev === true;

  const res = await fetch(`${BASE}/api/v1/marketplace`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(clean),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
