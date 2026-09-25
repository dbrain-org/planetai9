import { getLocale } from "@/lib/i18n";

export const revalidate = 86400;

export const metadata = {
  title: "KVKK Aydınlatma Metni",
  description:
    "PlanetAI9’un 6698 sayılı KVKK kapsamındaki aydınlatma metni.",
};

const COLLECT = {
  tr: [
    "Kimlik ve iletişim verileri: ad, soyad, e-posta, telefon, şirket ve unvan.",
    "Talep ve işlem verileri: iletişim mesajları, teklif talepleri, hizmet talepleri ve başvuru içeriği.",
    "Kariyer verileri: özgeçmiş dosyaları, ekler, mesleki geçmiş ve başvuru formu yanıtları.",
    "Dijital kayıtlar: IP adresi, zaman damgası, tarayıcı bilgisi, çerez tercihleri ve site kullanım günlükleri.",
  ],
  en: [
    "Identity and contact data: name, surname, email, phone, company, and title.",
    "Request and transaction data: contact messages, quote requests, service requests, and application content.",
    "Career data: CV files, attachments, professional background, and application form answers.",
    "Digital records: IP address, timestamp, browser information, cookie preferences, and website usage logs.",
  ],
};

const PURPOSES = {
  tr: [
    "Ürün, hizmet, satış, lisans ve satış sonrası destek süreçlerini yönetmek.",
    "İletişim taleplerine yanıt vermek ve müşteri ilişkilerini yönetmek.",
    "İş başvurularını değerlendirmek ve adaylarla ilgili roller hakkında iletişim kurmak.",
    "Bilgi güvenliği, sistem erişim kontrolü, operasyonel kayıt ve yasal uyumu sağlamak.",
    "İzin verirseniz bülten, duyuru, kampanya ve pazarlama iletileri göndermek.",
  ],
  en: [
    "Managing product, service, sales, licensing, and after-sales support processes.",
    "Responding to contact requests and managing customer relationships.",
    "Evaluating job applications and contacting candidates about relevant roles.",
    "Ensuring information security, system access control, operational logging, and legal compliance.",
    "Sending newsletters, announcements, campaigns, and marketing communications if you give consent.",
  ],
};

export default async function KvkkPage() {
  const tr = (await getLocale()) === "tr";
  const collect = tr ? COLLECT.tr : COLLECT.en;
  const purposes = tr ? PURPOSES.tr : PURPOSES.en;

  return (
    <article className="mx-auto max-w-3xl">
      <header>
        <p className="text-[12px] font-medium text-muted">
          {tr ? "Son güncelleme: 2026-07-23" : "Last updated: 2026-07-23"}
        </p>
        <h1 className="mt-3 text-[36px] font-extrabold tracking-tight3 text-ink dark:text-d-ink sm:text-[44px]">
          {tr ? "KVKK Aydınlatma Metni" : "KVKK Privacy Notice"}
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "PlanetAI9, kişisel verileri 6698 sayılı Kişisel Verilerin Korunması Kanunu ve ilgili gizlilik mevzuatına uygun işler."
            : "PlanetAI9 processes personal data in line with Turkish Personal Data Protection Law No. 6698 and applicable privacy legislation."}
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Veri sorumlusu" : "Data Controller"}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Veri sorumlusu PlanetAI9’dur. Gizlilik talepleri için info@dbrain.tech adresinden bize ulaşabilirsiniz."
            : "The data controller is PlanetAI9. You can contact us about privacy requests at info@dbrain.tech."}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Topladığımız kişisel veriler" : "Personal Data We Collect"}
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {collect.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "İşleme amaçları" : "Purposes of Processing"}
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {purposes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Hukuki sebepler" : "Legal Bases"}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Kişisel veriler, kanunda açıkça öngörülmesi, bir sözleşmenin kurulması veya ifası için gerekli olması, hukuki yükümlülüğün yerine getirilmesi için zorunlu olması, bir hakkın tesisi, kullanılması veya korunması için zorunlu olması ya da meşru menfaatlerimiz için gerekli olması halinde işlenebilir. Pazarlama iletileri, zorunlu olmayan çerezler ve açık rıza gerektiren uluslararası aktarım halleri, açık rızanıza dayanır."
            : "Personal data may be processed where it is expressly required by law, necessary for the establishment or performance of a contract, necessary for compliance with legal obligations, necessary for the establishment, exercise, or protection of a right, or necessary for our legitimate interests. Marketing communications, non-essential cookies, and international transfer scenarios that require consent are processed based on your explicit consent."}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Aktarım" : "Transfers"}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Verileriniz, gerekli, ölçülü ve amaçla sınırlı olmak kaydıyla tedarikçiler, danışmanlar, iş ve çözüm ortakları, teknik altyapı sağlayıcıları ve yetkili kamu kurumlarıyla paylaşılabilir. Uluslararası aktarım içerebilen bulut, e-posta, analitik veya altyapı hizmetleri ayrıca envantere alınmalı ve gerekli hukuki mekanizmayla desteklenmelidir."
            : "Your data may be shared with suppliers, consultants, business and solution partners, technical infrastructure providers, and authorized public institutions where necessary, proportionate, and purpose-limited. Cloud, email, analytics, or infrastructure services that may involve international transfers must be separately inventoried and supported by the required legal mechanism."}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[22px] font-extrabold tracking-tight3 text-ink dark:text-d-ink">
          {tr ? "Saklama ve haklarınız" : "Retention and Your Rights"}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "Müşteri ve tedarikçi verileri, ticari veya hukuki ilişkinin bitiminden sonra kural olarak 10 yıl saklanır. Aday verileri, rıza varsa ilgili işe alım kararından sonra 2 yıl saklanır. KVKK’nın 11. maddesi uyarınca verilerinizin işlenip işlenmediğini öğrenme, ayrıntılara erişme, düzeltme, silme veya yok etme, üçüncü kişilere aktarım hakkında bilgi isteme, otomatik işlemeye itiraz etme ve hukuka aykırı işlemeden doğan zararın giderilmesini talep etme hakkınız vardır."
            : "Customer and supplier data is generally retained for 10 years after the end of the commercial or legal relationship. Candidate data is retained for 2 years after the relevant hiring decision if consent exists. Under Article 11 of KVKK, you may request information about whether your data is processed, access details, correction, deletion or destruction, information about third-party transfers, objection to automated processing, and compensation for damages caused by unlawful processing."}
        </p>
      </section>
    </article>
  );
}
