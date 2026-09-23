import type { MetadataRoute } from "next";
import { apiSafe } from "@/lib/api";
import type { EventCard, LlmDeveloperCard, TopicTrend } from "@/lib/types";

const SITE = process.env.PLANETAI_SITE_URL ?? "https://planetai9.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const news: EventCard[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 6; page++) {
    const res: { data: EventCard[]; next_cursor: string | null } = await apiSafe(
      `/events?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      { data: [], next_cursor: null },
    );
    news.push(...res.data);
    if (!res.next_cursor) break;
    cursor = res.next_cursor;
  }

  const [trends, llmDevs] = await Promise.all([
    apiSafe<TopicTrend[]>("/trends?limit=30", []),
    apiSafe<LlmDeveloperCard[]>("/turkiye-llm/developers", []),
  ]);

  const staticPages = [
    "",
    "/news",
    "/turkiye",
    "/turkiye-llm",
    "/turkiye-llm/ureticiler",
    "/trends",
    "/videos",
    "/marketplace",
    "/universite",
    "/yazarlar",
    "/hakkinda",
    "/gizlilik",
    "/sources",
  ].map((p) => ({
    url: `${SITE}${p}`,
    changeFrequency: "daily" as const,
    priority: p === "" ? 1 : 0.7,
  }));

  return [
    ...staticPages,
    ...news.map((e) => ({
      url: `${SITE}/news/${e.slug}`,
      lastModified: e.published_at,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...trends.map((t) => ({
      url: `${SITE}/trends/${t.topic.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
    ...llmDevs.map((d) => ({
      url: `${SITE}/turkiye-llm/ureticiler/${d.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.55,
    })),
  ];
}
