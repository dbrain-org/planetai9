import { LoginForm } from "@/components/LoginForm";
import { getLocale } from "@/lib/i18n";

export const metadata = { title: "Giriş" };

export default async function GirisPage() {
  const locale = await getLocale();
  const tr = locale === "tr";

  return (
    <div className="relative mx-auto max-w-md">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-12 -z-10 h-52 w-52 rounded-full bg-accent/10 blur-3xl dark:bg-accent/15"
      />
      <header className="mb-8">
        <h1 className="text-[32px] font-extrabold leading-none tracking-tight3 text-ink dark:text-d-ink sm:text-[36px]">
          {tr ? "Giriş yap" : "Sign in"}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2 dark:text-d-ink-2">
          {tr
            ? "E-posta ve şifrenle giriş yap veya hesap oluştur."
            : "Sign in with email and password, or create an account."}
        </p>
      </header>
      <LoginForm locale={locale} />
    </div>
  );
}
