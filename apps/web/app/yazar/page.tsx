import type { Metadata } from "next";
import { AuthorStudio } from "@/components/AuthorStudio";
import { authorKey, loadNewsQueue, loadQueue, loadStudio } from "@/lib/author";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yazar Girişi",
  robots: { index: false, follow: false },
};

export default async function YazarPage() {
  const key = await authorKey();
  const { authed, studio } = await loadStudio(key);
  const queue = studio?.is_moderator ? await loadQueue(key) : [];
  const newsQueue = studio?.is_moderator ? await loadNewsQueue(key) : [];

  return (
    <div className="mx-auto max-w-5xl">
      <AuthorStudio authed={authed} studio={studio} queue={queue} newsQueue={newsQueue} />
    </div>
  );
}
