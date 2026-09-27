/** Cover art we can name from the link, without fetching the page. */
export function courseCover(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = parsed.pathname.split("/").filter(Boolean)[0];
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const fromQuery = parsed.searchParams.get("v");
    const fromPath = parsed.pathname.split("/").filter(Boolean).at(-1);
    const id = fromQuery || (fromPath && !["playlist", "channel", "c", "user"].includes(fromPath) ? fromPath : "");
    return id && id.length >= 6 ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
  }
  if (host === "github.com") {
    const [owner, repo] = parsed.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return null;
    return `https://opengraph.githubassets.com/1/${owner}/${repo.replace(/\.git$/, "")}`;
  }
  if (
    host === "cloudskillsboost.google" ||
    host === "grow.google" ||
    host === "ai.google.dev" ||
    host.endsWith(".google")
  ) {
    return "/covers/google.png";
  }
  return null;
}

/** BTK Akademi puts the course card image in the page JSON, not in a fixed URL. */
export async function btkCourseImage(url: string): Promise<string | null> {
  if (!url.includes("btkakademi.gov.tr")) return null;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/"imageUrl"\s*:\s*"(https:[^"]+\.(?:png|jpe?g|webp)[^"]*)"/i);
    return match?.[1]?.replace(/\\u0026/g, "&") ?? null;
  } catch {
    return null;
  }
}
