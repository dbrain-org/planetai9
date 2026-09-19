import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const BASE = process.env.PLANETAI_API_URL ?? "http://localhost:8077";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  await fetch(`${BASE}/api/v1/auth/logout`, {
    method: "POST",
    headers: token ? { "X-Session-Token": token } : {},
  }).catch(() => null);
  const out = NextResponse.json({ ok: true });
  out.cookies.delete(SESSION_COOKIE);
  return out;
}
