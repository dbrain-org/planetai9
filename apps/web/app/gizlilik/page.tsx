import Link from "next/link";
import { getLocale } from "@/lib/i18n";

export const revalidate = 86400;

export const metadata = {
  title: "Gizlilik Politikası",
  description:
    "PlanetAI9 kişisel verileri gizlilik öncelikli bir yaklaşımla işler. Toplanan bilgiler, kullanım, paylaşım, çerezler ve haklarınız.",
};

const COLLECT = {
  tr: [
    "Ad, e-posta, telefon, şirket ve unvan gibi kimlik ve iletişim verileri.",
    "İletişim, bülten ve kariyer başvuru formlarıyla gönderilen iletişim verileri.",
    "Özgeçmiş dosyaları, mesleki geçmiş ve başvuruyla gönderilen yanıtlar gibi kariyer verileri.",
    "IP adresi, tarayıcı bilgisi, zaman damgaları, çerez tercihleri ve güvenlik kayıtları gibi teknik veriler.",
  ],
  en: [
    "Identity and contact data such as name, email, phone, company and job title.",
    "Communication data submitted through contact, newsletter and career application forms.",
    "Career data such as CV files, professional background and answers submitted with applications.",
    "Technical data such as IP address, browser information, timestamps, cookie preferences and security logs.",
  ],
};

const USE = {
  tr: [
    "Taleplere yanıt vermek, hizmet sunmak ve müşteri ilişkilerini yönetmek.",
    "İş başvurularını değerlendirmek ve adaylarla açık pozisyonlar hakkında iletişim kurmak.",
    "Web sitesini, sistemleri ve formları güvenli tutmak.",
    "Bülten ve kampanya güncellemelerini yalnızca pazarlama izni verdiğinizde göndermek.",
    "Yasal, operasyonel, muhasebe ve uyuşmazlık yönetimi yükümlülüklerini yerine getirmek.",
  ],
  en: [
    "To respond to requests, deliver services and manage customer relationships.",
    "To evaluate job applications and contact candidates about open roles.",
    "To keep our website, systems and forms secure.",
    "To send newsletters and campaign updates only when you give marketing consent.",
    "To meet legal, operational, accounting and dispute management obligations.",
  ],
};

export default async function PrivacyPage() {
  const tr = (await getLocale()) === "tr";
  const collect = tr ? COLLECT.tr : COLLECT.en;
  const use = tr ? USE.tr : USE.en;

  return (
    <article className="mx-auto max-w-3xl">
      <header>
        <h1 className="text-[36px] font-extrabold tracking-tight3 text-ink dark:text-d-ink sm:text-[44px]">
          {tr ? "Gizlilik Politikası" : "Privacy Policy"}
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "PlanetAI9 olarak kişisel verileri gizlilik öncelikli bir yaklaşımla korur, yalnızca açık, meşru ve sınırlı amaçlarla işleriz."
            : "At PlanetAI9, we protect personal data with a privacy-first approach and process it only for clear, legitimate, and limited purposes."}
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Topladığımız bilgiler" : "Information We Collect"}
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {collect.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Bilgileri nasıl kullanırız" : "How We Use Information"}
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {use.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Paylaşım ve aktarım" : "Sharing and Transfers"}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Veriyi gerektiğinde ve ölçülü olmak kaydıyla hizmet sağlayıcılar, danışmanlar, teknik altyapı sağlayıcıları, iş ortakları ve yetkili kamu kurumlarıyla paylaşabiliriz. Uluslararası aktarım gerektiren haller, kullanılmadan önce yürürlükteki veri koruma kurallarına göre değerlendirilir."
            : "We may share data with service providers, consultants, technical infrastructure providers, business partners and authorized public institutions where necessary and proportionate. Any international transfer requirement is assessed under applicable data protection rules before use."}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Çerezler" : "Cookies"}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Sitenin çalışması için zorunlu çerezler kullanılır. İşlevsel, analitik ve pazarlama çerezleri yalnızca sizin izninizle kullanılır. Tercihlerinizi dilediğiniz zaman "
            : "Necessary cookies are used to keep the website working. Functional, analytics and marketing cookies are used only with your consent. You can change your preferences from the "}
          <Link
            href="/cerezler"
            className="font-semibold text-ink underline decoration-ink/30 underline-offset-2 dark:text-d-ink"
          >
            {tr ? "Çerez Politikası" : "Cookie Policy"}
          </Link>
          {tr ? " sayfasından değiştirebilirsiniz." : " page at any time."}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Haklarınız" : "Your Rights"}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Uygulanabildiği ölçüde erişim, düzeltme, silme, kısıtlama, aktarımlar hakkında bilgi, otomatik işlemeye itiraz ve hukuka aykırı işlemeden doğan tazminat talep edebilirsiniz. KVKK kapsamındaki Türkiye’ye özgü haklar için "
            : "You may request access, correction, deletion, restriction, information about transfers, objection to automated processing and compensation for unlawful processing where applicable. For Turkey-specific rights under KVKK, please review our "}
          <Link
            href="/kvkk"
            className="font-semibold text-ink underline decoration-ink/30 underline-offset-2 dark:text-d-ink"
          >
            {tr ? "KVKK Aydınlatma Metni" : "KVKK Privacy Notice"}
          </Link>
          {tr ? "’ne bakın." : "."}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "İletişim" : "Contact"}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr ? "Gizlilik soruları için " : "For privacy questions, contact us at "}
          <a href="mailto:info@dbrain.tech" className="font-semibold text-ink dark:text-d-ink">
            info@dbrain.tech
          </a>
          .
        </p>
      </section>
    </article>
  );
}
