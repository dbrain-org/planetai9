import Link from "next/link";
import {
  ArrowUpRight,
  Database,
  Newspaper,
  Send,
  Shield,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { getLocale } from "@/lib/i18n";

export const revalidate = 86400;

export const metadata = {
  title: "Gizlilik Politikası",
  description:
    "PlanetAI9 gizlilik politikası — toplanan veriler, kullanım, çerezler ve iletişim.",
};

type Section = {
  icon: typeof UserRound;
  titleTr: string;
  titleEn: string;
  bodyTr: string;
  bodyEn: string;
  href?: string;
};

const SECTIONS: Section[] = [
  {
    icon: UserRound,
    titleTr: "Toplanan Veriler",
    titleEn: "Data We Collect",
    bodyTr:
      "PlanetAI9, TAKYAP'a uygulama önerirken paylaştığınız iletişim bilgilerini (e-posta) saklar. Site kullanımına dair anonim istatistikler tutulabilir.",
    bodyEn:
      "PlanetAI9 stores the contact details (email) you share when submitting an app to TAKYAP. Anonymous usage statistics may be kept.",
  },
  {
    icon: Shield,
    titleTr: "Kullanım",
    titleEn: "How We Use It",
    bodyTr:
      "Marketplace başvurusunda verdiğiniz e-posta yalnızca gerektiğinde sizinle iletişim için kullanılır; sitede yayınlanmaz ve üçüncü taraflarla paylaşılmaz.",
    bodyEn:
      "The email you provide with a Marketplace submission is used only to contact you if needed; it is never published or shared with third parties.",
  },
  {
    icon: Database,
    titleTr: "Çerezler",
    titleEn: "Cookies",
    bodyTr:
      "Dil tercihi (TR/EN) ve tema seçimi tarayıcınızda çerez/localStorage olarak saklanır. Bu tercihler sunucuya kişisel veri olarak gönderilmez.",
    bodyEn:
      "Your language (TR/EN) and theme preference are stored in your browser via cookie/localStorage. These are not sent to the server as personal data.",
  },
  {
    icon: Newspaper,
    titleTr: "Kaynak İçerik",
    titleEn: "Source Content",
    bodyTr:
      "Haber başlıkları ve kısa özetleri orijinal yayıncılardan alınır; tam metin saklanmaz ve her haber orijinal kaynağa bağlanır.",
    bodyEn:
      "Headlines and short summaries come from the original publishers; full text is not stored and every story links back to its source.",
  },
  {
    icon: Send,
    titleTr: "İletişim",
    titleEn: "Contact",
    bodyTr:
      "Verilerinizin silinmesini istemek için Biz Kimiz sayfasındaki iletişim kanallarından bize ulaşabilirsiniz.",
    bodyEn: "To request deletion of your data, reach us via the channels on the About page.",
    href: "/hakkinda#iletisim",
  },
];

function OrbitDecor() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 280 220"
      className="pointer-events-none absolute -right-2 -top-6 h-[180px] w-[230px] text-line opacity-70 dark:text-d-line sm:right-0 sm:top-0 sm:h-[220px] sm:w-[280px]"
    >
      <ellipse
        cx="168"
        cy="108"
        rx="92"
        ry="78"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <ellipse
        cx="168"
        cy="108"
        rx="118"
        ry="42"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        transform="rotate(-28 168 108)"
      />
      <circle cx="168" cy="108" r="28" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="168" cy="108" r="6" fill="currentColor" opacity="0.35" />
      <path
        d="M236 48l3.2 8.2 8.8 1.2-6.6 5.8 1.8 8.6L236 68l-7.2 4.8 1.8-8.6-6.6-5.8 8.8-1.2z"
        fill="currentColor"
        opacity="0.45"
      />
      <circle cx="78" cy="72" r="2.2" fill="currentColor" opacity="0.4" />
      <circle cx="248" cy="132" r="1.8" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

export default async function PrivacyPage() {
  const tr = (await getLocale()) === "tr";
  const updated = new Date().toLocaleDateString(tr ? "tr-TR" : "en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="relative mx-auto max-w-[980px]">
      <OrbitDecor />

      <header className="relative max-w-2xl">
        <p className="inline-block text-[12px] font-bold uppercase tracking-[0.16em] text-accent">
          {tr ? "Değerlerimiz" : "Our Values"}
          <span className="mt-1.5 block h-px w-full bg-accent/70" />
        </p>
        <h1 className="mt-4 text-[36px] font-extrabold tracking-tight3 text-ink dark:text-d-ink sm:text-[44px]">
          {tr ? "Gizlilik Politikası" : "Privacy Policy"}
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "PlanetAI9 olarak kullanıcı güvenini ve veri şeffaflığını temel alıyoruz. Aşağıda neleri sakladığımızı ve nasıl kullandığımızı net biçimde özetliyoruz."
            : "At PlanetAI9, user trust and data transparency come first. Below is a clear summary of what we store and how we use it."}
        </p>
      </header>

      <div className="relative mt-10 grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const title = tr ? s.titleTr : s.titleEn;
          const body = tr ? s.bodyTr : s.bodyEn;
          const inner = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#EEF0FF] text-[#5B6CFF] dark:bg-accent/15 dark:text-blue-300">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted" />
              </div>
              <h2 className="mt-4 text-[17px] font-bold tracking-tight2 text-ink dark:text-d-ink">
                {title}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-2 dark:text-d-ink-2">{body}</p>
            </>
          );

          const className =
            "rounded-card border border-line bg-paper p-5 shadow-soft transition-all duration-250 hover:-translate-y-0.5 hover:shadow-raise dark:border-d-line dark:bg-d-canvas sm:p-6";

          return s.href ? (
            <Link key={s.titleTr} href={s.href} className={`block ${className}`}>
              {inner}
            </Link>
          ) : (
            <article key={s.titleTr} className={className}>
              {inner}
            </article>
          );
        })}

        <div className="flex items-end justify-end pb-1 sm:col-start-2">
          <p className="flex items-center gap-2 border-l-2 border-accent pl-3 text-[13px] font-medium text-ink-2 dark:text-d-ink-2">
            <ShieldCheck className="h-4 w-4 text-accent" />
            {tr ? "Son güncelleme" : "Last updated"}: {updated}
          </p>
        </div>
      </div>
    </div>
  );
}
