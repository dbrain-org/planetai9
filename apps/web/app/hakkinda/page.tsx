import Link from "next/link";
import { ArrowUpRight, Code2, Cpu, FileText, Shield } from "lucide-react";
import { getLocale } from "@/lib/i18n";
import { PRESENCE_LINKS } from "@/lib/presence";

export const revalidate = 86400;

export const metadata = {
  title: "Biz Kimiz",
  description:
    "PlanetAI9. Türkiye'nin yapay zekâ medya platformu. Haberler, model takibi, açık kaynak ve teknoloji politikaları.",
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
            <p>
              {tr
                ? "PlanetAI9, Türkiye ve dünyadaki yapay zekâ gelişmelerini takip eden, özgün içerikler üreten ve yapay zekâ ekosistemindeki bilgi paylaşımını güçlendirmeyi amaçlayan bir yayın platformudur."
                : "PlanetAI9 is a media platform that follows AI developments in Türkiye and the world, produces original work, and aims to strengthen how knowledge is shared across the AI ecosystem."}
            </p>
            <p>
              {tr
                ? "Türkiye’nin yapay zekâya giden yolunda; özgün Türkiye ve dünya gündem haberlerini, Türkçe açık kaynak verileri ve yapay zekâ uygulamalarını bir araya getiriyoruz."
                : "On Türkiye’s path in AI, we bring together original news from Türkiye and the world, Turkish open data, and AI applications."}
            </p>
            <p>
              {tr ? (
                <>
                  <Link href="/" className={a}>Gündem</Link> bölümümüzde Türkiye’den,{" "}
                  <Link href="/news?region=world" className={a}>Dünya</Link> bölümümüzde ise uluslararası yapay zekâ haberlerini takip edebilirsiniz. Açık verileri{" "}
                  <Link href="/turkiye" className={a}>VeriVatan</Link>’da, açık kaynak yapay zekâ uygulamalarını{" "}
                  <Link href="/marketplace" className={a}>TAKYAP</Link>’ta, eğitim kaynaklarını{" "}
                  <Link href="/universite" className={a}>Üniversite</Link> bölümünde bulabilirsiniz.
                </>
              ) : (
                <>
                  In <Link href="/" className={a}>News</Link> you can follow AI stories from Türkiye, and in{" "}
                  <Link href="/news?region=world" className={a}>World</Link> the international ones. Open data is on{" "}
                  <Link href="/turkiye" className={a}>VeriVatan</Link>, open-source AI apps on{" "}
                  <Link href="/marketplace" className={a}>TAKYAP</Link>, and learning resources in{" "}
                  <Link href="/universite" className={a}>University</Link>.
                </>
              )}
            </p>
            <p>
              {tr ? (
                <>
                  Türkiye’de geliştirilen yapay zekâ modellerini{" "}
                  <Link href="/turkiye-llm" className={a}>Türkiye LLM</Link> sayfasında, farklı LLM modellerini tek bir merkezden takip etmek için ise{" "}
                  <a href="https://llmradar.planetai9.com" target="_blank" rel="noopener noreferrer" className={a}>LLM Radar</a>’ı sunuyoruz.{" "}
                  <Link href="/yazarlar" className={a}>Yazarlar</Link> bölümümüzde farklı bakış açılarına yer veriyor,{" "}
                  <Link href="/videos" className={a}>PlanetAI9 Kanalı</Link>’nda ise yapay zekâ gündemini konuklarımızla birlikte konuşuyoruz.
                </>
              ) : (
                <>
                  Models built in Türkiye are on <Link href="/turkiye-llm" className={a}>Türkiye LLM</Link>. To follow different LLMs from one place, we offer{" "}
                  <a href="https://llmradar.planetai9.com" target="_blank" rel="noopener noreferrer" className={a}>LLM Radar</a>. In{" "}
                  <Link href="/yazarlar" className={a}>Authors</Link> we make room for different points of view, and on the{" "}
                  <Link href="/videos" className={a}>PlanetAI9 channel</Link> we talk through the AI agenda with our guests.
                </>
              )}
            </p>
            <p>
              {tr
                ? "Amacımız, Türkiye’nin yapay zekâ yolculuğunda iletişimi ve bilgi paylaşımını artırmak, birbirimizden haberdar olmak ve güçlü bir yapay zekâ ekosisteminin oluşmasına katkı sağlamak."
                : "Our aim is to increase communication and knowledge sharing on Türkiye’s AI path, to stay aware of one another, and to help a stronger AI ecosystem take shape."}
            </p>
            <p>
              {tr ? (
                <>
                  Siz de <Link href="/haber-giris" className={a}>Haber Gönder</Link> üzerinden kendi özgün haberlerinizi paylaşabilir; açık verilerinizi ve yapay zekâ uygulamalarınızı bizimle paylaşabilirsiniz.
                </>
              ) : (
                <>
                  You can share your own original stories through <Link href="/haber-giris" className={a}>Submit news</Link>, and send us your open data and AI applications as well.
                </>
              )}
            </p>
            <p>
              {tr
                ? "Önce birbirimizden haberdar olalım. Paylaşımlarınızı, fikirlerinizi ve önerilerinizi bekliyoruz."
                : "First, let’s know what each other is doing. We are waiting for what you share, what you think, and what you suggest."}
            </p>
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
