"use client";
import { useMemo } from "react";
import type { VariantConfig } from "@/domain/catalog/variant";
import { compareVariants } from "@/domain/rarity/engine";
import { OUTCOME_HEADLINES, explainComparison, explainSingle } from "@/domain/rarity/explain";
import { useCatalog } from "../providers/CatalogProvider";
import { useI18n } from "../providers/I18nProvider";
import { ScoreCard } from "../ScoreCard";
import { RarityMeter } from "../RarityMeter";
import { FactorDetails } from "../FactorDetails";
import { TradeNotices } from "../TradeNotices";
import { IconChevron, IconSparkles } from "../Icons";
import { variantLabel } from "@/lib/describe";

export function ComparisonResultView({ a, b, aTraded, bTraded }: { a: VariantConfig; b: VariantConfig; aTraded?: boolean; bTraded?: boolean }) {
  const { idx } = useCatalog();
  const { m, lang } = useI18n();
  const c = useMemo(() => (idx ? compareVariants(idx, a, b) : null), [idx, a, b]);
  if (!idx || !c) return null;
  const sa = idx.getSpecies(a.speciesId)!;
  const sb = idx.getSpecies(b.speciesId)!;
  const nameA = variantLabel(idx, a, m, lang);
  const nameB = variantLabel(idx, b, m, lang);
  const shortA = sa.name[lang];
  const shortB = sb.name[lang];
  const winner =
    c.outcome === "a_much_rarer" || c.outcome === "a_rarer" || c.outcome === "a_likely_rarer"
      ? "a"
      : c.outcome === "b_much_rarer" || c.outcome === "b_rarer" || c.outcome === "b_likely_rarer"
        ? "b"
        : "tie";
  const side = (r: typeof c.a) =>
    r.score !== null
      ? { score: r.score, label: String(r.score) }
      : r.estimate
        ? { score: (r.estimate.min + r.estimate.max) / 2, label: r.estimate.min === r.estimate.max ? `~${r.estimate.min}` : `${r.estimate.min}–${r.estimate.max}` }
        : null;
  const ma = side(c.a);
  const mb = side(c.b);
  const headline = OUTCOME_HEADLINES[c.outcome][lang];
  const tone =
    c.outcome === "insufficient" ? "from-slate-200 to-slate-100" : winner === "a" ? "from-violet-500 to-sky-500 text-white" : winner === "b" ? "from-amber-400 to-yellow-300" : "from-emerald-400 to-teal-300";

  return (
    <section key={`${a.speciesId}-${b.speciesId}`} className="card pop-in overflow-hidden" aria-labelledby="result-title" aria-live="polite">
      <div className={`bg-gradient-to-l ${tone} px-5 py-4 text-center`}>
        <p className="text-xs font-bold opacity-80">{m.compare.resultTitle}</p>
        <h2 id="result-title" className="flex items-center justify-center gap-2 text-2xl font-black sm:text-3xl">
          {winner !== "tie" && <IconSparkles />} {headline}
        </h2>
      </div>
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3">
          <ScoreCard result={c.a} winner={winner === "a"} label={`${m.compare.mine}: ${shortA}`} />
          <ScoreCard result={c.b} winner={winner === "b"} label={`${m.compare.other}: ${shortB}`} />
        </div>
        {c.meterA !== null && ma && mb && (
          <RarityMeter
            a={{ species: sa, form: idx.getForm(a.formId)?.form, shiny: a.shiny, name: shortA, score: ma.score, label: ma.label }}
            b={{ species: sb, form: idx.getForm(b.formId)?.form, shiny: b.shiny, name: shortB, score: mb.score, label: mb.label }}
            meterA={c.meterA}
            winner={winner}
          />
        )}
        <div className="rounded-3xl bg-violet-50 p-4">
          <h3 className="text-sm font-black text-violet-800">{m.compare.whyTitle}</h3>
          <p className="mt-1 text-base font-semibold leading-relaxed">{explainComparison(c, shortA, shortB, lang)}</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            <li>• {explainSingle(c.a, shortA, lang)}</li>
            <li>• {explainSingle(c.b, shortB, lang)}</li>
          </ul>
          <p className="mt-2 text-[11px] text-ink-soft">{m.compare.scoreNote}</p>
        </div>

        <details className="group rounded-3xl border border-violet-100 p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
            {m.compare.details}
            <IconChevron className="transition group-open:rotate-180" />
          </summary>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <FactorDetails result={c.a} title={nameA} />
            <FactorDetails result={c.b} title={nameB} />
          </div>
        </details>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-slate-50 p-3">
            <p className="mb-1 text-xs font-bold text-ink-soft">{m.trade.title} – {shortA}</p>
            <TradeNotices variant={a} alreadyTraded={aTraded} compact />
          </div>
          <div className="rounded-3xl bg-slate-50 p-3">
            <p className="mb-1 text-xs font-bold text-ink-soft">{m.trade.title} – {shortB}</p>
            <TradeNotices variant={b} alreadyTraded={bTraded} compact />
          </div>
        </div>
      </div>
    </section>
  );
}
