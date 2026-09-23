import { EducationShareForm } from "@/components/EducationShareForm";
import { ResourceLinkCard } from "@/components/ResourceLinkCard";
import { SectionHeader } from "@/components/SectionHeader";
import { apiSafe } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import type { CuratedLink } from "@/lib/types";

export const revalidate = 30;

export const metadata = {
  title: "Üniversite",
  description: "Açık Türkçe yapay zekâ eğitimleri. Herkes İçin AI, derin eğitimler, meslekler.",
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

      {TRACKS.map((track) => {
        const items = byTrack(track.key);
        return (
          <section key={track.key} id={track.key}>
            <SectionHeader
              index={track.index}
              kicker={tr ? "Hat" : "Track"}
              title={tr ? track.titleTr : track.titleEn}
              action={
                items.length > 0 ? (
                  <span className="!font-medium tabular-nums !text-ink-2 dark:!text-d-ink-2">
                    {items.length} {tr ? "kaynak" : "resources"}
                  </span>
                ) : undefined
              }
            />
            <p className="-mt-3 mb-8 max-w-2xl text-[14px] leading-relaxed text-ink-2 dark:text-d-ink-2">
              {tr ? track.leadTr : track.leadEn}
            </p>
            {items.length > 0 ? (
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((d) => (
                  <ResourceLinkCard key={d.id} href={d.url} name={d.name} note={note(d)} />
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
