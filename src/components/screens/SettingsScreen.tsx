"use client";
import { useEffect, useState } from "react";
import { SCORING_VERSION } from "@/domain/rarity/config";
import { useCatalog } from "../providers/CatalogProvider";
import { useI18n } from "../providers/I18nProvider";
import { useStore } from "../providers/StoreProvider";
import { useToast } from "../Toast";
import { PageTitle } from "../States";

export function SettingsScreen() {
  const { m, lang, setLang } = useI18n();
  const { idx } = useCatalog();
  const store = useStore();
  const toast = useToast();
  const [motion, setMotion] = useState<"on" | "reduced">("on");
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    try {
      setMotion(localStorage.getItem("poketrade.motion") === "reduced" ? "reduced" : "on");
    } catch {
      /* ignore */
    }
  }, []);
  const setMotionPref = (v: "on" | "reduced") => {
    setMotion(v);
    try {
      localStorage.setItem("poketrade.motion", v);
    } catch {
      /* ignore */
    }
    if (v === "reduced") document.documentElement.dataset.motion = "reduced";
    else delete document.documentElement.dataset.motion;
  };
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle title={m.settings.title} />
      <section className="card space-y-3 p-4">
        <h2 className="font-black">{m.settings.language}</h2>
        <div className="flex gap-2" role="radiogroup" aria-label={m.settings.language}>
          {(["he", "en"] as const).map((l) => (
            <button key={l} role="radio" aria-checked={lang === l} className={`btn ${lang === l ? "btn-primary" : "btn-ghost"}`} onClick={() => setLang(l)}>
              {l === "he" ? "עברית" : "English"}
            </button>
          ))}
        </div>
      </section>
      <section className="card space-y-3 p-4">
        <h2 className="font-black">{m.settings.motion}</h2>
        <div className="flex gap-2" role="radiogroup" aria-label={m.settings.motion}>
          {(["on", "reduced"] as const).map((v) => (
            <button key={v} role="radio" aria-checked={motion === v} className={`btn ${motion === v ? "btn-primary" : "btn-ghost"}`} onClick={() => setMotionPref(v)}>
              {v === "on" ? m.settings.motionOn : m.settings.motionReduced}
            </button>
          ))}
        </div>
      </section>
      <section className="card space-y-2 p-4">
        <h2 className="font-black">{m.settings.privacy}</h2>
        <p className="text-sm text-ink-soft">{m.settings.privacyText}</p>
        <p className="text-sm text-ink-soft">{m.voice.privacy}</p>
      </section>
      <section className="card space-y-2 p-4">
        <h2 className="font-black">{m.settings.data}</h2>
        <p className="text-sm">{m.settings.catalogVersion}: <span className="ltr font-mono">{idx?.catalog.catalogVersion ?? "…"}</span></p>
        <p className="text-sm">{m.settings.scoringVersion}: <span className="ltr font-mono">{SCORING_VERSION}</span></p>
        <p className="text-sm text-ink-soft">{m.collection.storageNote}</p>
        {confirm ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">{m.settings.clearConfirm}</span>
            <button className="btn btn-danger" onClick={async () => { await store.clearAll(); setConfirm(false); toast(m.settings.cleared); }}>{m.actions.remove}</button>
            <button className="btn btn-ghost" onClick={() => setConfirm(false)}>{m.actions.cancel}</button>
          </div>
        ) : (
          <button className="btn btn-danger" onClick={() => setConfirm(true)}>{m.settings.clearAll}</button>
        )}
      </section>
    </div>
  );
}
