import type { Metadata } from "next";
import { AdminPanel } from "@/components/AdminPanel";
import {
  adminToken,
  loadAuthorQueue,
  loadNewsQueue,
  loadQueue,
  loadUniversiteQueue,
  loadVerivatanQueue,
} from "@/lib/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yönetim",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const token = await adminToken();
  const { authed, apps } = await loadQueue(token);
  const news = authed ? await loadNewsQueue(token) : [];
  const authors = authed ? await loadAuthorQueue(token) : [];
  const shares = authed ? await loadVerivatanQueue(token) : [];
  const courses = authed ? await loadUniversiteQueue(token) : [];
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="kicker">PlanetAI9</p>
        <h1 className="mt-1 text-[26px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          Yönetim Paneli
        </h1>
        <p className="mt-2 text-[14px] text-ink-2 dark:text-d-ink-2">
          Haberleri, yazar başvurularını, VeriVatan / Üniversite paylaşımlarını ve TAKYAP
          gönderilerini buradan onayla veya düzenle.
        </p>
      </header>
      <AdminPanel
        authed={authed}
        apps={apps}
        news={news}
        authors={authors}
        shares={shares}
        courses={courses}
      />
    </div>
  );
}
