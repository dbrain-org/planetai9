/** Resolve the public URL for an entity (people get /kisi hubs). */
export function entityHref(entity: { slug: string; type?: string | null }): string {
  if (entity.type === "person") return `/kisi/${entity.slug}`;
  return `/entities/${entity.slug}`;
}
