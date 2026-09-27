import { CatalogSearch } from "@/components/CatalogSearch";
import { btkCourseImage, courseCover } from "@/lib/courseCover";
import { EducationShareForm } from "@/components/EducationShareForm";
import { ResourceLinkCard } from "@/components/ResourceLinkCard";
import { SectionHeader } from "@/components/SectionHeader";
import { apiSafe } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import type { CuratedLink } from "@/lib/types";

export const revalidate = 30;

export const metadata = {
  title: "Üniversite",
  description:
    "Türkçe yapay zeka eğitimleri. Herkes İçin AI, derin eğitimler ve meslekler için açık kaynak izlenceler.",
  keywords: ["Türkçe yapay zeka eğitimleri", "yapay zeka eğitimi", "PlanetAI9"],
};

const TRACKS = [
  {
    key: "herkes",
    index: "01",
    titleTr: "Herkes İçin AI",
    titleEn: "AI for everyone",
    leadTr: "Temel kavramlar ve herkesin takip edebileceği açık giriş içerikleri.",
    leadEn: "Foundations and approachable open intros anyone can follow.",
  },
  {
    key: "derin",
    index: "02",
    titleTr: "Derin eğitimler",
    titleEn: "Deep learning tracks",
    leadTr: "Model, NLP ve derin öğrenmeye odaklı teknik kurslar ile workshop’lar.",
    leadEn: "Technical courses and workshops on models, NLP, and deep learning.",
  },
  {
    key: "meslek",
    index: "03",
    titleTr: "Meslekler değişiyor",
    titleEn: "Jobs are changing",
    leadTr: "Sağlık, hukuk, finans, eğitim… sektörlerde yapay zekânın mesleği nasıl değiştirdiğine dair videolar ve kurslar.",
    leadEn: "Videos and courses on how AI is changing jobs in health, law, finance, education, and more.",
  },
] as const;

export default async function UniversitePage() {
  const locale = await getLocale();
  const tr = locale === "tr";
  const courses = await apiSafe<CuratedLink[]>("/curated/education", [], { revalidate: 30 });
  const covers = new Map<string, string>();
  await Promise.all(
    courses.map(async (course) => {
      if (course.image_url || courseCover(course.url)) return;
      const image = await btkCourseImage(course.url);
      if (image) covers.set(course.id, image);
    }),
  );
  const note = (l: CuratedLink) => (tr ? l.note_tr : l.note_en) ?? "";

  const byTrack = (key: string) => courses.filter((c) => c.kind === key);

  return (
    <div className="space-y-16">
      <header className="max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          {tr ? "Öğren" : "Learn"}
        </p>
        <h1 className="mt-3 text-[36px] font-extrabold leading-[1.03] tracking-tight3 text-ink dark:text-d-ink sm:text-[48px]">
          {tr ? "Üniversite" : "University"}
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Açık Türkçe yapay zekâ eğitimleri. Üç hat: Herkes İçin AI, derin eğitimler, meslekler."
            : "Open Turkish AI education. Three tracks: AI for everyone, deep tracks, changing jobs."}
        </p>
      </header>

      <CatalogSearch
        placeholder={tr ? "Eğitim, konu veya araç ara" : "Search a course, topic, or tool"}
        empty={tr ? "Bu aramaya uygun eğitim yok." : "No course matches that search."}
      />

      <div id="catalog" className="space-y-16">
      {TRACKS.map((track) => {
        const items = byTrack(track.key);
        return (
          <section key={track.key} id={track.key} data-catalog-section="" className="scroll-mt-40">
            <div className="relative mb-8 overflow-hidden rounded-2xl bg-ink px-6 py-5 text-white ring-1 ring-black/5 dark:bg-d-wash dark:ring-d-line sm:px-8 sm:py-6">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.14),transparent_55%)]"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-6 right-4 select-none text-[96px] font-black leading-none tracking-tighter text-white/[0.06] sm:text-[130px]"
              >
                {track.index}
              </span>
              <div className="relative flex flex-wrap items-end justify-between gap-4 sm:flex-nowrap">
                <div className="max-w-2xl">
                  <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
                    <span className="tabular-nums text-white">{track.index}</span>
                    <span aria-hidden className="h-px w-6 bg-white/30" />
                    {tr ? "Hat" : "Track"}
                  </p>
                  <h2 className="mt-2 text-[28px] font-extrabold leading-[1.05] tracking-tight3 sm:text-[36px]">
                    {tr ? track.titleTr : track.titleEn}
                  </h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/65">
                    {tr ? track.leadTr : track.leadEn}
                  </p>
                </div>
                {items.length > 0 && (
                  <span className="shrink-0 rounded-full border border-white/20 bg-white/[0.06] px-4 py-1.5 text-[12px] font-semibold tabular-nums text-white/85 backdrop-blur">
                    {items.length} {tr ? "kaynak" : "resources"}
                  </span>
                )}
              </div>
            </div>
            {items.length > 0 ? (
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((d) => (
                  <ResourceLinkCard
                    key={d.id}
                    href={d.url}
                    name={d.name}
                    note={note(d)}
                    siteFallback
                    image={
                      d.image_url?.includes("gstatic.com")
                        ? courseCover(d.url) || d.image_url
                        : d.image_url || courseCover(d.url) || covers.get(d.id)
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted">
                {tr ? "Bu hatta henüz eğitim yok." : "No courses in this track yet."}
              </p>
            )}
          </section>
        );
      })}
      </div>

      <section>
        <SectionHeader
          index="04"
          kicker={tr ? "Topluluk" : "Community"}
          title={tr ? "Eğitim duyur" : "Announce a course"}
        />
        <p className="-mt-3 mb-7 max-w-2xl text-[14px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Açık kurs, video veya workshop’unu üç hattan birine ekle. Editör onayından sonra yayınlanır."
            : "Add an open course, video, or workshop to one of the three tracks. Published after review."}
        </p>
        <EducationShareForm locale={locale} />
      </section>
    </div>
  );
}
