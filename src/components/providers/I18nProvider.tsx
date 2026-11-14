"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MESSAGES, type Lang, type Messages } from "@/domain/i18n/messages";

interface I18nCtx {
  lang: Lang;
  dir: "rtl" | "ltr";
  m: Messages;
  setLang: (l: Lang) => void;
  /** Simple "{n}" interpolation. */
  fmt: (s: string, vars: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx | null>(null);
const KEY = "poketrade.lang";

function readLang(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "he" || v === "en") return v;
  } catch {
    /* storage blocked */
  }
  return "he";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("he");
  useEffect(() => setLangState(readLang()), []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  }, []);
  const value = useMemo<I18nCtx>(
    () => ({
      lang,
      dir: lang === "he" ? "rtl" : "ltr",
      m: MESSAGES[lang],
      setLang,
      fmt: (s, vars) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? "")),
    }),
    [lang, setLang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n outside I18nProvider");
  return c;
}
