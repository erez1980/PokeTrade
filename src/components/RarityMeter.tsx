"use client";
import { useEffect, useState } from "react";
import type { PokemonForm, PokemonSpecies } from "@/domain/catalog/schema";
import { PokemonImage } from "./PokemonImage";
import { useI18n } from "./providers/I18nProvider";

interface Side {
  species: PokemonSpecies;
  form?: PokemonForm;
  shiny: boolean;
  name: string;
  score: number;
  /** Text shown on the bar (e.g. "60–75" for an estimate); defaults to the score. */
  label?: string;
}

/**
 * Horizontal comparison meter. Position of the divider = a / (a + b), the same numbers shown
 * as scores, so the meter and the numeric scores can never disagree.
 */
export function RarityMeter({ a, b, meterA, winner }: { a: Side; b: Side; meterA: number; winner: "a" | "b" | "tie" }) {
  const { m, lang } = useI18n();
  const [shown, setShown] = useState(0.5);
  useEffect(() => {
    const t = setTimeout(() => setShown(meterA), 60);
    return () => clearTimeout(t);
  }, [meterA]);
  const pctA = Math.round(shown * 1000) / 10;
  const text =
    lang === "he"
      ? `${m.compare.meterLabel}: ${a.name} ${a.label ?? a.score} מול ${b.name} ${b.label ?? b.score}`
      : `${m.compare.meterLabel}: ${a.name} ${a.label ?? a.score} vs ${b.name} ${b.label ?? b.score}`;
  return (
    <figure className="w-full" aria-label={text}>
      <div className="flex items-center gap-2">
        <div className={`shrink-0 rounded-full p-1 ${winner === "a" ? "bg-amber-300 shadow-lg" : "bg-white"}`}>
          <PokemonImage species={a.species} form={a.form} shiny={a.shiny} size={52} sparkle={false} />
        </div>
        <div
          className="relative h-8 flex-1 overflow-hidden rounded-full bg-slate-100 shadow-inner"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(meterA * 100)}
          aria-valuetext={text}
        >
          <div className="meter-fill absolute inset-y-0 start-0 bg-gradient-to-l from-violet-500 to-sky-400" style={{ width: `${pctA}%` }} />
          <div className="meter-fill absolute inset-y-0 end-0 bg-gradient-to-r from-amber-400 to-yellow-300" style={{ width: `${100 - pctA}%` }} />
          <div className="meter-fill absolute inset-y-0 w-1.5 -translate-x-1/2 rounded bg-white shadow rtl:translate-x-1/2" style={{ insetInlineStart: `${pctA}%` }} />
          <span className="absolute inset-y-0 start-3 flex items-center text-sm font-black text-white drop-shadow"><bdi>{a.label ?? a.score}</bdi></span>
          <span className="absolute inset-y-0 end-3 flex items-center text-sm font-black text-ink"><bdi>{b.label ?? b.score}</bdi></span>
        </div>
        <div className={`shrink-0 rounded-full p-1 ${winner === "b" ? "bg-amber-300 shadow-lg" : "bg-white"}`}>
          <PokemonImage species={b.species} form={b.form} shiny={b.shiny} size={52} sparkle={false} />
        </div>
      </div>
      <figcaption className="mt-2 text-center text-[11px] text-ink-soft">{m.compare.meterNote}</figcaption>
    </figure>
  );
}
