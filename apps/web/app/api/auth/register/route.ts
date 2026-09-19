import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const BASE = process.env.PLANETAI_API_URL ?? "http://localhost:8077";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ detail: "e-posta ve şifre gerekli" }, { status: 400 });
  }

  const res = await fetch(`${BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: body.email,
      password: body.password,
      display_name: body.display_name,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const session =
    res.headers.get("X-Session-Token") ||
    res.headers.get("set-cookie")?.match(/planetai_session=([^;]+)/)?.[1];

  const out = NextResponse.json(data, { status: 200 });
  if (session) {
    out.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return out;
}
