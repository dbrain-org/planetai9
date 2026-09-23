import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const BASE = process.env.PLANETAI_API_URL ?? "http://localhost:8077";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await ctx.params;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const res = await fetch(
    `${BASE}/api/v1/pages/${encodeURIComponent(slug)}/comments/${encodeURIComponent(id)}/like`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        ...(token ? { "X-Session-Token": token } : {}),
      },
    },
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
