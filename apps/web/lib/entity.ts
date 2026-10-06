/** Teams whose models live on the Türkiye LLM producer page, not a generic entity card. */
const PRODUCER_PAGES: Record<string, string> = {
  "ytu-ce-cosmos": "/turkiye-llm/ureticiler/ytu-ce-cosmos",
};

/** Resolve the public URL for an entity (people get /kisi hubs). */
export function entityHref(entity: { slug: string; type?: string | null }): string {
  const producer = PRODUCER_PAGES[entity.slug];
  if (producer) return producer;
  if (entity.type === "person") return `/kisi/${entity.slug}`;
  return `/entities/${entity.slug}`;
}
