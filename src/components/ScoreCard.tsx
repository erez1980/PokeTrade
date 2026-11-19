"use client";
import type { RarityResult } from "@/domain/rarity/engine";
import { ConfidenceBadge, TierBadge } from "./Badges";
import { useI18n } from "./providers/I18nProvider";

export function ScoreCard({ result, winner, label }: { result: RarityResult; winner?: boolean; label: string }) {
  const { m } = useI18n();
  const has = result.score !== null;
  return (
    <div className={`rounded-3xl p-3 text-center ${winner ? "bg-gradient-to-b from-amber-100 to-yellow-50 ring-2 ring-amber-300" : "bg-violet-50"}`}>
      <p className="truncate text-xs font-bold text-ink-soft">{label}</p>
      {has ? (
        <>
          <p className="mt-1 font-black leading-none text-ink" aria-label={`${m.compare.scoreLabel}: ${result.score} / 100`}>
            <span className="ltr text-5xl sm:text-6xl">{result.score}</span>
            <span className="ltr text-lg text-ink-soft">/100</span>
          </p>
          <p className="mt-1 text-[11px] font-semibold text-violet-700">{m.compare.estimated}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-1">
            <TierBadge tier={result.tier} />
            <ConfidenceBadge confidence={result.confidence} />
          </div>
        </>
      ) : result.estimate ? (
        <>
          <p className="mt-1 font-black leading-none text-ink" aria-label={`${m.compare.estimateRange}: ${result.estimate.min}–${result.estimate.max}`}>
            <span className="ltr text-4xl sm:text-5xl">{result.estimate.min === result.estimate.max ? result.estimate.min : `${result.estimate.min}–${result.estimate.max}`}</span>
            <span className="ltr text-lg text-ink-soft">/100</span>
          </p>
          <p className="mt-1 text-[11px] font-semibold text-amber-700">{m.compare.estimateRange}</p>
          <div className="mt-2 flex justify-center">
            <span className="chip bg-amber-100 text-amber-900">{m.attrs.unverifiedTag}</span>
          </div>
          <ul className="mt-2 space-y-0.5 text-[11px] text-amber-800">
            {result.validation.problems.map((p) => (
              <li key={p.attribute + p.reason}>{m.reasons[p.reason]}</li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="mt-2 text-2xl font-black text-slate-400">{m.compare.noScore}</p>
          <div className="mt-2 flex justify-center">
            <ConfidenceBadge confidence="insufficient" />
          </div>
          <ul className="mt-2 space-y-0.5 text-[11px] text-amber-800">
            {result.validation.problems.map((p) => (
              <li key={p.attribute + p.reason}>{m.reasons[p.reason]}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
