// Cached image proxy for news covers. Browsers no longer talk to Bloomberg,
// Reddit, or WIRED directly — those hosts often 403 a hotlink or answer slowly.
// We fetch once with a browser UA, keep the bytes, and serve them from here.

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const PLAIN_UA = "PlanetAI9/1.0 (+https://planetai9.com)";

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
    const bytes = await loadImage(target);
    if (!bytes) return new Response("upstream", { status: 404 });
    return new Response(bytes.body, {
      headers: {
        "content-type": bytes.type,
        "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response("fetch failed", { status: 404 });
  }
}

/** Older rows rewrote Reddit thumbs to width=1080, which Reddit rejects. */
function redditCandidates(target: URL): URL[] {
  const host = target.hostname.toLowerCase();
  const width = Number(target.searchParams.get("width") || "0");
  if (!host.endsWith("redd.it") || !Number.isFinite(width) || width <= 640) return [target];
  const signed = new URL(target.href);
  signed.searchParams.set("width", "640");
  return [target, signed];
}

/** Some publishers 403 a browser-like UA and serve the file to a plain client. */
async function loadImage(target: URL): Promise<{ body: ArrayBuffer; type: string } | null> {
  for (const url of redditCandidates(target)) {
    for (const userAgent of [BROWSER_UA, PLAIN_UA]) {
      const upstream = await fetch(url, {
        headers: {
          "user-agent": userAgent,
          accept: "image/avif,image/webp,image/*,*/*;q=0.8",
          referer: `${url.origin}/`,
        },
        redirect: "follow",
        signal: AbortSignal.timeout(12000),
        next: { revalidate: 86400 },
      });
    const typeHeader = upstream.headers.get("content-type") ?? "";
    const body = await upstream.arrayBuffer();
    if (!upstream.ok || body.byteLength === 0 || body.byteLength > MAX_BYTES) continue;
    const type = imageType(typeHeader, body);
    if (!type) continue;
    return { body, type };
    }
  }
  return null;
}

/** Some CDNs send the file with an empty content type. Trust the bytes. */
function imageType(header: string, body: ArrayBuffer): string | null {
  if (header.startsWith("image/")) return header.split(";")[0]!;
  const bytes = new Uint8Array(body.slice(0, 12));
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}
