import Link from "next/link";
import { ArrowUpRight, Code2, Cpu, FileText, Shield } from "lucide-react";
import { getLocale } from "@/lib/i18n";
import { PRESENCE_LINKS } from "@/lib/presence";

export const revalidate = 86400;

export const metadata = {
  title: "Biz Kimiz",
  description:
    "PlanetAI9, Türkiye’nin Yapay Zeka’sı vizyonuyla kurulan, özgün yapay zeka gelişmeleri sunan bir medya platformudur.",
};

const FOCUS = [
  { icon: FileText, tr: "AI Haberleri", en: "AI News" },
  { icon: Cpu, tr: "Model Takibi", en: "Model Tracking" },
  { icon: Code2, tr: "Açık Kaynak", en: "Open Source" },
  { icon: Shield, tr: "Teknoloji Politikaları", en: "Tech Policy" },
] as const;

export default async function AboutPage() {
  const locale = await getLocale();
  const tr = locale === "tr";
  const a = "font-semibold text-ink underline decoration-ink/25 underline-offset-2 dark:text-d-ink";

  return (
    <div className="mx-auto max-w-[1100px]">
      <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(260px,380px)] lg:gap-16">
        <div className="max-w-xl">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-muted">
            {tr ? "Hakkımızda" : "About"}
          </p>
          <h1 className="mt-3 text-[40px] font-extrabold tracking-tight3 text-ink dark:text-d-ink sm:text-[52px]">
            {tr ? "Biz Kimiz?" : "Who are we?"}
          </h1>
          <div className="mt-5 max-w-xl space-y-4 text-[16px] leading-relaxed text-ink-2 dark:text-d-ink-2">
            {tr ? (
              <>
                <p>
                  PlanetAI9, Türkiye’nin Yapay Zeka’sı vizyonuyla kurulan, bu alanda emek veren insanlarımızı, kurumlarımızı gündeme taşıyacak, fark yaratan yeteneklerimizi farkettirecek, birbirimizden haberdar olmamızı sağlayacak özgün yapay zeka gelişmeleri sunan bir medya platformudur.
                </p>
                <p>
                  PlanetAI9’da Türkiye’nin{" "}
                  <Link href="/" className={a}>yapay zeka gündemi</Link>,{" "}
                  <Link href="/news?region=world" className={a}>Dünya</Link>’dan en güncel gelişmeler, Türkiye’de ilk defa derlenmiş, sınıflandırılmış tüm{" "}
                  <Link href="/turkiye" className={a}>Türkçe açık verilerin</Link> listesi, Türk geliştiriciler tarafından açık kaynak olarak paylaşılan{" "}
                  <Link href="/marketplace" className={a}>uygulamalar</Link>, farklı yapay zeka olgunluklarına göre ayrıştırılmış{" "}
                  <Link href="/universite" className={a}>yapay zeka eğitim</Link> bilgilerini bulabilirsiniz. Siz de bu alanlarda yaptığınız çalışmaları, veri veya uygulamalarınızı her sayfanın altındaki linkleri kullanarak bize iletebilirsiniz.
                </p>
                <p>
                  <Link href="/turkiye-llm" className={a}>Türkiye LLM</Link> altında bugüne kadar yayınlanan tüm Türkçe büyük dil modellerinin bir listesini, geliştiricilerini görebilir, geliştiricilere özel sayfalardan onlara sorular sorabilirsiniz.
                </p>
                <p>
                  Bütün sayfaların altında yorum alanlarıyla sorularınızı, yorumlarınızı iletebilirsiniz.
                </p>
                <p>
                  <Link href="/haber-giris" className={a}>Haber Gönder</Link> linki ile de herkesi yapay zeka alanında kendi özgün haberlerini paylaşmaya, yayınlamaya davet ediyoruz. Gittiğiniz bir etkinlik, geliştirdiğiniz bir uygulama, incelediğiniz bir makale, katıldığınız bir proje yarışması özgün bir haberiniz olabilir.
                </p>
                <p>
                  PlanetAI9’ı{" "}
                  <a href="https://www.youtube.com/@planetai9" target="_blank" rel="noopener noreferrer" className={a}>YouTube</a> kanalımızda yayınlanacak röportaj ve özel içerikli videolarla,{" "}
                  <a href="https://www.instagram.com/planetai9media" target="_blank" rel="noopener noreferrer" className={a}>Instagram</a>’da,{" "}
                  <a href="https://www.linkedin.com/showcase/planetai9media" target="_blank" rel="noopener noreferrer" className={a}>LinkedIn</a> hesaplarımızda izleyebilirsiniz.
                </p>
                <p>
                  Dünyanın en önemli gündemi yapay zekayı Türkiye’nin en önemli gündemi yapmak için PlanetAI9 yola çıktı, desteklerinizi bekliyoruz.
                </p>
              </>
            ) : (
              <>
                <p>
                  PlanetAI9 is a media platform founded with the vision of Türkiye’s AI. It brings the people and institutions working in this field onto the agenda, makes distinctive talent visible, helps us stay aware of one another, and publishes original AI developments.
                </p>
                <p>
                  On PlanetAI9 you can find Türkiye’s{" "}
                  <Link href="/" className={a}>AI agenda</Link>, the latest developments from the{" "}
                  <Link href="/news?region=world" className={a}>world</Link>, the first compiled and classified list of{" "}
                  <Link href="/turkiye" className={a}>Turkish open data</Link>,{" "}
                  <Link href="/marketplace" className={a}>applications</Link> shared as open source by Turkish developers, and{" "}
                  <Link href="/universite" className={a}>AI learning</Link> organized by different levels of AI maturity. You can send us your work, data, or applications through the links at the bottom of each page.
                </p>
                <p>
                  Under <Link href="/turkiye-llm" className={a}>Türkiye LLM</Link> you can see a list of every Turkish large language model published so far, meet the developers, and ask them questions on their own pages.
                </p>
                <p>
                  Comment areas under every page are there for your questions and remarks.
                </p>
                <p>
                  Through <Link href="/haber-giris" className={a}>Submit news</Link> we invite everyone to share and publish their own original AI stories. An event you attended, an application you built, a paper you read, or a project competition you joined can be an original story.
                </p>
                <p>
                  You can follow PlanetAI9 through interviews and original videos on our{" "}
                  <a href="https://www.youtube.com/@planetai9" target="_blank" rel="noopener noreferrer" className={a}>YouTube</a> channel, and on our{" "}
                  <a href="https://www.instagram.com/planetai9media" target="_blank" rel="noopener noreferrer" className={a}>Instagram</a> and{" "}
                  <a href="https://www.linkedin.com/showcase/planetai9media" target="_blank" rel="noopener noreferrer" className={a}>LinkedIn</a> accounts.
                </p>
                <p>
                  PlanetAI9 set out to make artificial intelligence, the world’s most important agenda, Türkiye’s most important agenda. We are waiting for your support.
                </p>
              </>
            )}
          </div>
        </div>
        <figure className="mx-auto w-full max-w-[340px] lg:max-w-none lg:justify-self-end">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/about-globe.png" alt="" className="aspect-square w-full object-contain" />
        </figure>
      </section>

      <ul className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line dark:border-d-line dark:bg-d-line sm:grid-cols-4">
        {FOCUS.map(({ icon: Icon, tr: labelTr, en: labelEn }) => (
          <li key={labelTr} className="bg-paper px-5 py-5 dark:bg-d-canvas">
            <Icon className="h-4 w-4 text-ink dark:text-d-ink" strokeWidth={1.75} />
            <p className="mt-3 text-[14px] font-bold tracking-tight2 text-ink dark:text-d-ink">
              {tr ? labelTr : labelEn}
            </p>
          </li>
        ))}
      </ul>

      <section id="baglantilar" className="mt-16 scroll-mt-24">
        <h2 id="iletisim" className="sec-title">
          {tr ? "Bağlantılar" : "Links"}
        </h2>
        <ul className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRESENCE_LINKS.map(({ label, href, display, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-ink dark:border-d-line dark:text-d-ink">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-[14px] font-bold tracking-tight2 text-ink dark:text-d-ink">
                    {label}
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                  <span className="block truncate text-[12px] text-muted">{display}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
