"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LogIn, LogOut, User } from "lucide-react";

type Me = { id: string; email: string; display_name: string };

export const AUTH_EVENT = "planetai:auth";

/** Call after login / logout / register so the masthead refreshes. */
export function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

export function AuthMenu({ locale = "tr" }: { locale?: "tr" | "en" }) {
  const tr = locale === "tr";
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  const load = useCallback(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMe(data ?? null))
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    load();
  }, [load, pathname]);

  useEffect(() => {
    const onAuth = () => load();
    const onFocus = () => load();
    window.addEventListener(AUTH_EVENT, onAuth);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener(AUTH_EVENT, onAuth);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    notifyAuthChanged();
  }

  if (me === undefined) {
    return <span className="hidden h-8 w-8 sm:inline-block" aria-hidden />;
  }

  if (!me) {
    return (
      <Link
        href="/giris"
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-wash hover:text-ink dark:text-d-ink-2 dark:hover:bg-d-wash dark:hover:text-d-ink"
        title={tr ? "Giriş yap" : "Sign in"}
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">{tr ? "Giriş" : "Sign in"}</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span
        className="inline-flex max-w-[8rem] items-center gap-1 truncate rounded-lg px-2 py-1.5 text-[12px] font-semibold text-ink dark:text-d-ink sm:max-w-[10rem]"
        title={me.email}
      >
        <User className="h-3.5 w-3.5 shrink-0 text-accent" />
        <span className="truncate">{me.display_name}</span>
      </span>
      <button
        type="button"
        onClick={logout}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-wash hover:text-ink dark:text-d-ink-2 dark:hover:bg-d-wash dark:hover:text-d-ink"
        title={tr ? "Çıkış yap" : "Sign out"}
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">{tr ? "Çıkış" : "Out"}</span>
      </button>
    </div>
  );
}
