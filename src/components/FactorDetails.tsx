"use client";
import type { RarityResult } from "@/domain/rarity/engine";
import { useCatalog } from "./providers/CatalogProvider";
import { useI18n } from "./providers/I18nProvider";
import { FACTOR_PHRASES } from "@/domain/rarity/explain";
import { ConfidenceBadge } from "./Badges";

/** Advanced, source-backed breakdown of a rarity score. */
export function FactorDetails({ result, title }: { result: RarityResult; title: string }) {
  const { idx } = useCatalog();
  const { m, lang } = useI18n();
  if (!idx) return null;
  const counted = result.factors.filter((f) => f.counted);
  const superseded = result.factors.filter((f) => !f.counted);
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-black">{title}</h4>
      {result.score === null ? (
        <p className="text-xs text-ink-soft">{m.insufficient}</p>
      ) : (
        <ul className="space-y-1.5">
          {counted.map((f) => {
            const src = idx.getSource(f.factor.sourceId);
            return (
              <li key={f.factor.id} className="rounded-xl bg-white/70 p-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <b className="ltr rounded bg-violet-100 px-1.5 text-violet-800">+{f.factor.points}</b>
                  <span className="font-bold">{FACTOR_PHRASES[f.factor.id]?.[lang] ?? f.factor.id}</span>
                  <ConfidenceBadge confidence={f.factor.confidence} />
                </div>
                <p className="mt-1 text-ink-soft ltr text-start">{f.factor.rule}</p>
                {src && (
                  <p className="mt-1 text-ink-soft">
                    {lang === "he" ? "מקור" : "Source"}:{" "}
                    <a className="underline" href={src.url} target="_blank" rel="noopener noreferrer">{src.name}</a>
                    {" · "}
                    <span className="ltr">{(src.sourceVersion ?? src.retrievedAt).slice(0, 16)}</span>
                  </p>
                )}
                <p className="ltr mt-0.5 text-start text-[10px] text-slate-500">{f.factor.id} · {f.facts.join(" · ")}</p>
              </li>
            );
          })}
          {superseded.length > 0 && (
            <li className="text-[11px] text-ink-soft">
              {lang === "he" ? "לא נספר פעמיים (כלול בגורם חזק יותר):" : "Not double-counted (covered by a stronger factor):"}{" "}
              <span className="ltr">{superseded.map((f) => f.factor.id).join(", ")}</span>
            </li>
          )}
        </ul>
      )}
      <p className="text-[10px] text-slate-500 ltr text-start">
        scoring v{result.scoringVersion} · catalog {result.catalogVersion}
      </p>
    </div>
  );
}
