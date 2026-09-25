import Link from "next/link";
import { getLocale } from "@/lib/i18n";

export const revalidate = 86400;

export const metadata = {
  title: "Kullanım Şartları",
  description:
    "PlanetAI9 web sitesi, içerikleri ve çevrimiçi formlarının kullanım kuralları.",
};

export default async function TermsPage() {
  const tr = (await getLocale()) === "tr";

  return (
    <article className="mx-auto max-w-3xl">
      <header>
        <p className="text-[12px] font-medium text-muted">
          {tr ? "Son güncelleme: 2026-07-23" : "Last updated: 2026-07-23"}
        </p>
        <h1 className="mt-3 text-[36px] font-extrabold tracking-tight3 text-ink dark:text-d-ink sm:text-[44px]">
          {tr ? "Kullanım Şartları" : "Terms of Use"}
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Bu şartlar, PlanetAI9 web sitesinin, içeriklerinin ve çevrimiçi formlarının kullanımına ilişkin temel kuralları açıklar."
            : "These terms explain the basic rules for using the PlanetAI9 website, content, and online forms."}
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Site kullanımı" : "Website Use"}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Siteyi hukuka uygun, dürüst ve üçüncü kişilerin haklarına saygılı biçimde kullanmalısınız. Siteye zarar veren, güvenliği aşmaya çalışan, veriyi otomatik olarak toplayan veya tersine mühendislik içeren kullanımlar yasaktır."
            : "You must use the website lawfully, fairly, and in a way that respects third-party rights. Uses that harm the website, attempt to bypass security, scrape data automatically, or involve reverse engineering are prohibited."}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Fikri mülkiyet" : "Intellectual Property"}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Sitedeki markalar, logolar, görseller, yazılım, ürün adları, metinler ve diğer içerikler PlanetAI9’a veya ilgili hak sahiplerine aittir. Yazılı izin olmadan kopyalanamaz, dağıtılamaz, değiştirilemez veya ticari amaçla kullanılamaz."
            : "The trademarks, logos, visuals, software, product names, text, and other content on the website belong to PlanetAI9 or the relevant rights holders. They may not be copied, distributed, modified, or used for commercial purposes without written permission."}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Formlar ve başvurular" : "Forms and Applications"}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "İletişim, bülten ve kariyer formlarında doğru ve güncel bilgi vermeniz beklenir. Site üzerinden gönderilen hatalı, yanıltıcı veya yetkisiz üçüncü kişi verisinden kullanıcı sorumludur. Kişisel veri süreçleri "
            : "You are expected to provide accurate and up-to-date information in contact, newsletter, and career forms. The user is responsible for inaccurate, misleading, or unauthorized third-party data submitted through the website. Personal data processes are handled under the "}
          <Link
            href="/kvkk"
            className="font-semibold text-ink underline decoration-ink/30 underline-offset-2 dark:text-d-ink"
          >
            {tr ? "KVKK Aydınlatma Metni" : "KVKK Privacy Notice"}
          </Link>
          {tr ? " ve ilgili rıza mekanizmaları kapsamında yürütülür." : " and the relevant consent mechanisms."}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Üçüncü taraf bağlantıları" : "Third-Party Links"}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Sitede iş ortaklarına, sosyal medyaya, haritalara, videolara, analitik hizmetlere veya benzeri üçüncü taraf hizmetlere bağlantılar bulunabilir. Kendi içeriklerinden, güvenliklerinden ve veri işleme uygulamalarından ilgili sağlayıcılar sorumludur."
            : "The website may contain links to business partners, social media, maps, video, analytics, or similar third-party services. The relevant providers are responsible for their own content, security, and data processing practices."}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Sorumluluğun sınırı" : "Limitation of Liability"}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Site içeriği yalnızca genel bilgilendirme amacıyla sunulur. PlanetAI9, sitenin kesintisiz veya hatasız çalışacağını garanti etmez. Zorunlu hukuk kuralları saklı kalmak kaydıyla, site kullanımından doğan dolaylı zararlardan PlanetAI9 sorumluluk kabul etmez."
            : "Website content is provided for general information only. PlanetAI9 does not guarantee that the website will operate uninterrupted or error-free. Subject to mandatory legal rules, PlanetAI9 does not accept liability for indirect damages arising from website use."}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "İletişim" : "Contact"}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr ? "Bu şartlarla ilgili sorular için " : "For questions about these terms, contact us at "}
          <a href="mailto:info@dbrain.tech" className="font-semibold text-ink dark:text-d-ink">
            info@dbrain.tech
          </a>
          .
        </p>
      </section>
    </article>
  );
}
