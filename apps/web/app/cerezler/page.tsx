import { CookieSettingsButton } from "@/components/CookieSettingsButton";
import { getLocale } from "@/lib/i18n";

export const revalidate = 86400;

export const metadata = {
  title: "Çerez Politikası",
  description:
    "Bu sitede çerezlerin nasıl kullanıldığı ve tercihlerin nasıl yönetileceği.",
};

const CATEGORIES = [
  {
    titleTr: "Zorunlu çerezler",
    titleEn: "Strictly Necessary Cookies",
    badgeTr: "Her zaman açık",
    badgeEn: "Always active",
    bodyTr:
      "Sitenin güvenliğini sağlamak, temel işlevleri sürdürmek, formları korumak ve çerez tercihlerini saklamak için kullanılır.",
    bodyEn:
      "Used to keep the website secure, maintain essential functionality, protect forms, and store cookie preferences.",
    basisTr:
      "Yürürlükteki veri koruma kurallarına göre meşru menfaat veya talep edilen hizmetin sunulması için gereklilik.",
    basisEn:
      "Legitimate interest or necessity for providing the requested service under applicable data protection rules.",
  },
  {
    titleTr: "İşlevsel çerezler",
    titleEn: "Functional Cookies",
    badgeTr: "İzne bağlı",
    badgeEn: "Consent-based",
    bodyTr:
      "Dil, bölge, tercih ve benzeri seçimleri hatırlayıp site deneyimini kişiselleştirmek için kullanılır.",
    bodyEn:
      "Used to remember language, region, preference, and similar choices to personalize the website experience.",
    basisTr: "Açık rıza.",
    basisEn: "Consent.",
  },
  {
    titleTr: "Performans ve analitik çerezler",
    titleEn: "Performance and Analytics Cookies",
    badgeTr: "İzne bağlı",
    badgeEn: "Consent-based",
    bodyTr:
      "Sayfa görüntülemelerini, trafik kaynaklarını ve kullanım istatistiklerini anlamak, böylece siteyi geliştirmek için kullanılır.",
    bodyEn:
      "Used to understand page views, traffic sources, and usage statistics so we can improve the website.",
    basisTr: "Açık rıza.",
    basisEn: "Consent.",
  },
  {
    titleTr: "Pazarlama çerezleri",
    titleEn: "Marketing Cookies",
    badgeTr: "İzne bağlı",
    badgeEn: "Consent-based",
    bodyTr:
      "İlgi alanına yönelik içerik, kampanya ölçümü ve reklam performansı için kullanılabilir.",
    bodyEn:
      "May be used for interest-based content, campaign measurement, and advertising performance.",
    basisTr: "Açık rıza.",
    basisEn: "Consent.",
  },
];

export default async function CookiePolicyPage() {
  const tr = (await getLocale()) === "tr";

  return (
    <article className="mx-auto max-w-3xl">
      <header>
        <p className="text-[12px] font-medium text-muted">
          {tr ? "Son güncelleme: 2026-07-23" : "Last updated: 2026-07-23"}
        </p>
        <h1 className="mt-3 text-[36px] font-extrabold tracking-tight3 text-ink dark:text-d-ink sm:text-[44px]">
          {tr ? "Çerez Politikası" : "Cookie Policy"}
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Bu politika, bu sitede çerezlerin nasıl kullanıldığını ve tercihlerinizi nasıl yönetebileceğinizi açıklar."
            : "This policy explains how cookies are used on this website and how you can manage your preferences."}
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Çerez nedir?" : "What Are Cookies?"}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Çerezler, bir web sitesini ziyaret ettiğinizde cihazınızda saklanabilen küçük metin dosyalarıdır. Siteyi güvenli tutmak, tercihleri hatırlamak ve izin verirseniz site performansını ölçmek için kullanılabilirler."
            : "Cookies are small text files that may be stored on your device when you visit a website. They can be used to keep the site secure, remember preferences, and, if you consent, measure website performance."}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Çerez kategorileri" : "Cookie Categories"}
        </h2>
        <ul className="mt-6 space-y-8">
          {CATEGORIES.map((item) => (
            <li key={item.titleEn}>
              <h3 className="text-[17px] font-bold text-ink dark:text-d-ink">
                {tr ? item.titleTr : item.titleEn}
              </h3>
              <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">
                {tr ? item.badgeTr : item.badgeEn}
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
                {tr ? item.bodyTr : item.bodyEn}
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
                {tr ? item.basisTr : item.basisEn}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Tercih yönetimi" : "Preference Management"}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "İşlevsel, analitik ve pazarlama çerezleri varsayılan olarak kapalıdır ve yalnızca izin verirseniz çalışır. Tercihlerinizi dilediğiniz zaman değiştirebilirsiniz."
            : "Functional, analytics, and marketing cookies are off by default and work only if you give consent. You can change your preferences at any time."}
        </p>
        <CookieSettingsButton
          label={tr ? "Çerez tercihlerini yönet" : "Manage Cookie Preferences"}
        />
      </section>
    </article>
  );
}
