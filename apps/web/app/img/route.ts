// Cached image proxy for news covers. Browsers no longer talk to Bloomberg,
// Reddit, or WIRED directly — those hosts often 403 a hotlink or answer slowly.
// We fetch once with a browser UA, keep the bytes, and serve them from here.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const BLOCKED_HOSTS = /^(localhost$|127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1\]?$)/i;
const MAX_BYTES = 6 * 1024 * 1024;

export const revalidate = 86400;

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("u");
  if (!raw) return new Response("missing u", { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (
    (target.protocol !== "http:" && target.protocol !== "https:") ||
    BLOCKED_HOSTS.test(target.hostname)
  ) {
    return new Response("forbidden", { status: 403 });
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        "user-agent": UA,
        accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        referer: `${target.origin}/`,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 86400 },
    });
    const type = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !type.startsWith("image/")) {
      return new Response("upstream", { status: 404 });
    }
    const bytes = await upstream.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
      return new Response("upstream", { status: 404 });
    }
    return new Response(bytes, {
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response("fetch failed", { status: 404 });
  }
}
