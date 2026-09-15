import type { Metadata } from "next";
import { AuthorStudio } from "@/components/AuthorStudio";
import { authorKey, loadStudio } from "@/lib/author";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yazar Girişi",
  robots: { index: false, follow: false },
};

export default async function YazarPage() {
  const key = await authorKey();
  const { authed, studio } = await loadStudio(key);

  return (
    <div className="mx-auto max-w-5xl">
      <AuthorStudio authed={authed} studio={studio} />
    </div>
  );
}
