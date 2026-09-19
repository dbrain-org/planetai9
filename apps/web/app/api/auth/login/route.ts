import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const BASE = process.env.PLANETAI_API_URL ?? "http://localhost:8077";

async function proxyAuth(path: string, body: unknown) {
  const res = await fetch(`${BASE}/api/v1/auth/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
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

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ detail: "e-posta ve şifre gerekli" }, { status: 400 });
  }
  return proxyAuth("login", {
    email: body.email,
    password: body.password,
  });
}
