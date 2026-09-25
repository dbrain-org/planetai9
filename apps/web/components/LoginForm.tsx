"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { notifyAuthChanged } from "@/components/AuthMenu";
import { KvkkConsent } from "@/components/KvkkConsent";

type Me = { id: string; email: string; display_name: string };
type Mode = "login" | "register";

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function VerifyHandler({
  onDone,
  tr,
}: {
  onDone: (me: Me) => void;
  tr: boolean;
}) {
  const params = useSearchParams();
  const token = params.get("token");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(Boolean(token));
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled)
            setErr(
              typeof data.detail === "string"
                ? data.detail
                : tr
                  ? "Giriş başarısız"
                  : "Sign-in failed",
            );
          return;
        }
        if (!cancelled) onDoneRef.current(data as Me);
      } catch {
        if (!cancelled) setErr(tr ? "Bağlantı hatası" : "Network error");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, tr]);

  if (!token) return null;
  if (busy) {
    return (
      <p className="mt-6 text-[14px] text-ink-2 dark:text-d-ink-2">
        {tr ? "Giriş yapılıyor…" : "Signing you in…"}
      </p>
    );
  }
  if (err) {
    return <p className="mt-6 text-[14px] text-red-600 dark:text-red-400">{err}</p>;
  }
  return null;
}

function detailMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "detail" in data) {
    const d = (data as { detail: unknown }).detail;
    if (typeof d === "string") return d;
  }
  return fallback;
}

function LoginFormInner({ locale = "tr" }: { locale?: "tr" | "en" }) {
  const tr = locale === "tr";
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function finishLogin() {
    notifyAuthChanged();
    router.replace(next);
    router.refresh();
  }

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          finishLogin();
          return;
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          ...(mode === "register" ? { display_name: name.trim() || undefined } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(detailMessage(data, tr ? "İşlem başarısız" : "Request failed"));
        return;
      }
      finishLogin();
    } catch {
      setError(tr ? "Bağlantı hatası" : "Network error");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <p className="text-[14px] text-ink-2 dark:text-d-ink-2">
        {tr ? "Yükleniyor…" : "Loading…"}
      </p>
    );
  }

  return (
    <div>
      <Suspense fallback={null}>
        <VerifyHandler tr={tr} onDone={() => finishLogin()} />
      </Suspense>

      <div className="mb-4 flex rounded-xl border border-line p-1 dark:border-d-line">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
            mode === "login"
              ? "bg-ink text-white dark:bg-d-ink dark:text-d-canvas"
              : "text-ink-2 hover:text-ink dark:text-d-ink-2"
          }`}
        >
          {tr ? "Giriş yap" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setError(null);
          }}
          className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
            mode === "register"
              ? "bg-ink text-white dark:bg-d-ink dark:text-d-canvas"
              : "text-ink-2 hover:text-ink dark:text-d-ink-2"
          }`}
        >
          {tr ? "Kayıt ol" : "Sign up"}
        </button>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-card border border-line bg-paper p-6 dark:border-d-line dark:bg-d-canvas"
      >
        {mode === "register" && (
          <label className="mb-4 block">
            <span className="text-[12px] font-semibold text-ink-2 dark:text-d-ink-2">
              {tr ? "Adınız" : "Your name"}
            </span>
            <input
              type="text"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-[15px] text-ink outline-none ring-accent focus:ring-2 dark:border-d-line dark:bg-d-paper dark:text-d-ink"
              placeholder={tr ? "Adınız" : "Your name"}
            />
          </label>
        )}

        <label className="block">
          <span className="text-[12px] font-semibold text-ink-2 dark:text-d-ink-2">
            {tr ? "E-posta" : "Email"}
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-[15px] text-ink outline-none ring-accent focus:ring-2 dark:border-d-line dark:bg-d-paper dark:text-d-ink"
            placeholder="ornek@eposta.com"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-[12px] font-semibold text-ink-2 dark:text-d-ink-2">
            {tr ? "Şifre" : "Password"}
          </span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-[15px] text-ink outline-none ring-accent focus:ring-2 dark:border-d-line dark:bg-d-paper dark:text-d-ink"
            placeholder={tr ? "En az 6 karakter" : "At least 6 characters"}
          />
        </label>

        {mode === "register" && <KvkkConsent locale={locale} className="mt-4" />}

        {error && (
          <p className="mt-3 text-[13px] text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn-dark mt-6 w-full justify-center disabled:opacity-50"
        >
          {busy
            ? tr
              ? "Bekleyin…"
              : "Please wait…"
            : mode === "register"
              ? tr
                ? "Kayıt ol"
                : "Create account"
              : tr
                ? "Giriş yap"
                : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export function LoginForm({ locale = "tr" }: { locale?: "tr" | "en" }) {
  return (
    <Suspense
      fallback={
        <p className="text-[14px] text-ink-2 dark:text-d-ink-2">
          {locale === "tr" ? "Yükleniyor…" : "Loading…"}
        </p>
      }
    >
      <LoginFormInner locale={locale} />
    </Suspense>
  );
}
