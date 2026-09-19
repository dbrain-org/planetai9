import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const BASE = process.env.PLANETAI_API_URL ?? "http://localhost:8077";

export async function GET() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json(null);
  const res = await fetch(`${BASE}/api/v1/auth/me`, {
    headers: { "X-Session-Token": token, accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json(null);
  return NextResponse.json(await res.json());
}
