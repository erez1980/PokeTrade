"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useI18n } from "./providers/I18nProvider";
import { IconBook, IconBox, IconCog, IconCompare, IconHeart, IconHelp, IconTrophy, LogoMark } from "./Icons";
import { withBase } from "@/lib/base-path";

const NAV = [
  { href: "/", key: "compare", Icon: IconCompare },
  { href: "/rankings/", key: "rankings", Icon: IconTrophy },
  { href: "/pokedex/", key: "pokedex", Icon: IconBook },
  { href: "/collection/", key: "collection", Icon: IconBox },
  { href: "/wishlist/", key: "wishlist", Icon: IconHeart },
] as const;

function isActive(path: string, href: string) {
  const p = path.replace(/\/$/, "") || "/";
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/") return p === "/";
  return p === h || p.startsWith(h + "/") || (h === "/pokedex" && p.startsWith("/pokemon"));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { m, lang, setLang } = useI18n();
  const path = usePathname() ?? "/";

  useEffect(() => {
    try {
      const motion = localStorage.getItem("poketrade.motion");
      if (motion === "reduced") document.documentElement.dataset.motion = "reduced";
    } catch {
      /* ignore */
    }
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register(withBase("/sw.js"), { scope: withBase("/") }).catch(() => {});
    }
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:rounded-xl focus:bg-white focus:p-3">
        {lang === "he" ? "דילוג לתוכן" : "Skip to content"}
      </a>
      <header className="sticky top-0 z-40 border-b border-violet-100/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2 font-black text-ink" aria-label={m.appName}>
            <LogoMark size={30} />
            <span className="text-lg tracking-tight">Poké<span className="text-violet-600">Trade</span></span>
          </Link>
          <nav aria-label={lang === "he" ? "ניווט ראשי" : "Main navigation"} className="ms-4 hidden flex-1 items-center gap-1 md:flex">
            {NAV.map(({ href, key, Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(path, href) ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition ${isActive(path, href) ? "bg-violet-600 text-white shadow" : "text-ink-soft hover:bg-violet-50"}`}
              >
                <Icon size={18} /> {m.nav[key]}
              </Link>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-1">
            <button
              type="button"
              className="btn btn-ghost !min-h-9 !px-3 !py-1 text-sm"
              onClick={() => setLang(lang === "he" ? "en" : "he")}
              aria-label={lang === "he" ? "Switch to English" : "החלפה לעברית"}
            >
              {lang === "he" ? "EN" : "עב"}
            </button>
            <Link href="/help/" className="btn btn-ghost !min-h-9 !w-9 !p-0" aria-label={m.nav.help} title={m.nav.help}><IconHelp size={18} /></Link>
            <Link href="/settings/" className="btn btn-ghost !min-h-9 !w-9 !p-0" aria-label={m.nav.settings} title={m.nav.settings}><IconCog size={18} /></Link>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 md:pb-12">{children}</main>

      <footer className="mx-auto mb-24 w-full max-w-6xl px-4 pb-4 text-center text-[11px] leading-relaxed text-ink-soft md:mb-0">
        <p>{m.disclaimer}</p>
        <p className="mt-1">
          <Link className="underline" href="/help/">{m.nav.help}</Link>
          {" · "}
          <Link className="underline" href="/settings/">{m.nav.settings}</Link>
        </p>
      </footer>

      <nav aria-label={lang === "he" ? "ניווט תחתון" : "Bottom navigation"} className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-violet-100 bg-white/95 backdrop-blur md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map(({ href, key, Icon }) => {
            const active = isActive(path, href);
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${active ? "text-violet-700" : "text-ink-soft"}`}>
                  <span className={`flex h-8 w-12 items-center justify-center rounded-full transition ${active ? "bg-violet-100" : ""}`}><Icon size={20} /></span>
                  {m.navShort[key]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
