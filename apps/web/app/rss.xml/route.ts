import { headers } from "next/headers";

const API = process.env.PLANETAI_API_URL ?? "http://localhost:8077";
const SITE_ENV = process.env.PLANETAI_SITE_URL;

type EventCard = {
  slug: string;
  title: string;
  summary: string | null;
  published_at: string;
  category?: string;
  top_source?: { name: string } | null;
};

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

const rfc822 = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
};

export const revalidate = 300;

export async function GET() {
  let site = SITE_ENV;
  if (!site) {
    try {
      const h = await headers();
      const host = h.get("x-forwarded-host") ?? h.get("host");
      const proto = h.get("x-forwarded-proto") ?? "https";
      if (host) site = `${proto}://${host}`;
    } catch {
      /* ignore */
    }
  }
  site = (site ?? "https://planetai9.com").replace(/\/$/, "");

  let items: EventCard[] = [];
  try {
    const res = await fetch(`${API}/api/v1/events?limit=40`, { next: { revalidate: 300 } });
    if (res.ok) items = (await res.json()).data ?? [];
  } catch {
    /* empty feed on error */
  }

  const lastBuild = items[0] ? rfc822(items[0].published_at) : new Date().toUTCString();

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="${site}/rss.xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>PlanetAI9. Yapay Zekâ Haberleri</title>
<link>${site}</link>
<atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml"/>
<description>Yapay zekâ dünyasındaki gelişmeler, model duyuruları, araçlar ve regülasyonlar. Türkçe.</description>
<language>tr</language>
<lastBuildDate>${lastBuild}</lastBuildDate>
<ttl>60</ttl>
${items
  .map(
    (e) => `<item>
<title>${esc(e.title)}</title>
<link>${site}/news/${e.slug}</link>
<guid isPermaLink="true">${site}/news/${e.slug}</guid>
<pubDate>${rfc822(e.published_at)}</pubDate>
${e.category ? `<category>${esc(e.category)}</category>` : ""}
${e.summary ? `<description>${cdata(e.summary)}</description>` : ""}
${e.top_source?.name ? `<source url="${site}">${esc(e.top_source.name)}</source>` : ""}
</item>`,
  )
  .join("\n")}
</channel>
</rss>`;

  return new Response(body, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}
