"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { buildRankings, filterRankings, type RankingEntry, type RankingFilter } from "@/domain/rarity/rankings";
import { FACTOR_PHRASES } from "@/domain/rarity/explain";
import { useCatalog } from "../providers/CatalogProvider";
import { useI18n } from "../providers/I18nProvider";
import { CatalogGate, EmptyState, PageTitle } from "../States";
import { PokemonImage } from "../PokemonImage";
import { ConfidenceBadge, Tag, TierBadge } from "../Badges";
import { IconCompare } from "../Icons";
import { variantTags } from "@/lib/describe";

const FILTERS: RankingFilter[] = ["all", "shiny", "legendary", "mythical", "costume", "background", "regional", "dynamax", "gigantamax", "event"];
const TOPS = [10, 25, 50, 100, 0] as const;

export function RankingsScreen() {
  return (
    <CatalogGate>
      <Inner />
    </CatalogGate>
  );
}

function Inner() {
  const { idx } = useCatalog();
  const { m, lang } = useI18n();
  const [mode, setMode] = useState<"variants" | "species">("variants");
  const [filter, setFilter] = useState<RankingFilter>("all");
  const [top, setTop] = useState<(typeof TOPS)[number]>(25);
  const [unrankedShown, setUnrankedShown] = useState(30);
  const rankings = useMemo(() => (idx ? buildRankings(idx, idx.catalog.generatedAt) : null), [idx]);
  const list = useMemo(() => {
    if (!rankings) return [];
    const base = mode === "variants" ? rankings.variants : rankings.species;
    return filter === "all" ? base : filterRankings(base, filter);
  }, [rankings, mode, filter]);
  if (!idx || !rankings) return null;

  const ranked = list.filter((e) => e.rank !== null);
  const unranked = list.filter((e) => e.rank === null);
  const shown = top === 0 ? ranked : ranked.slice(0, top);
  const updated = new Date(idx.catalog.generatedAt).toLocaleDateString(lang === "he" ? "he-IL" : "en-GB");

  return (
    <div>
      <PageTitle title={m.rankings.title} subtitle={m.rankings.intro} />
      <div className="card mb-4 space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label={m.rankings.byVariant}>
          {(["variants", "species"] as const).map((md) => (
            <button key={md} role="tab" aria-selected={mode === md} className={`btn !min-h-10 !py-1 text-sm ${mode === md ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode(md)}>
              {md === "variants" ? m.rankings.byVariant : m.rankings.bySpecies}
            </button>
          ))}
          <label className="ms-auto flex items-center gap-2 text-sm font-bold">
            <span>{m.rankings.top}</span>
            <select className="input !min-h-10 !w-auto !py-1" value={top} onChange={(e) => setTop(Number(e.target.value) as (typeof TOPS)[number])}>
              {TOPS.map((t) => (
                <option key={t} value={t}>{t === 0 ? m.rankings.all : t}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs text-ink-soft">{mode === "variants" ? m.rankings.variantNote : m.rankings.speciesNote}</p>
        {mode === "variants" && (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="filters">
            {FILTERS.map((f) => (
              <button key={f} aria-pressed={filter === f} className={`chip !px-3 !py-1.5 text-sm ${filter === f ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-800 hover:bg-violet-100"}`} onClick={() => setFilter(f)}>
                {m.rankings.filters[f]}
              </button>
            ))}
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyState title={filter === "background" ? m.rankings.bgEmpty : m.rankings.empty} emoji="🔍" />
      ) : (
        <ol className="grid gap-3 md:grid-cols-2">
          {shown.map((e) => (
            <RankingCard key={e.key} e={e} updated={updated} />
          ))}
        </ol>
      )}
      {top !== 0 && ranked.length > top && (
        <div className="mt-4 flex justify-center">
          <button className="btn btn-ghost" onClick={() => setTop(TOPS[TOPS.indexOf(top) + 1] ?? 0)}>{m.rankings.showMore}</button>
        </div>
      )}

      {unranked.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-black">{m.rankings.unranked} <span className="text-base text-ink-soft ltr">({unranked.length})</span></h2>
          <p className="mb-3 text-sm text-ink-soft">{m.rankings.unrankedNote}</p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unranked.slice(0, unrankedShown).map((e) => {
              const s = idx.getSpecies(e.variant.speciesId)!;
              return (
                <li key={e.key} className="card flex items-center gap-2 p-2">
                  <PokemonImage species={s} form={idx.getForm(e.variant.formId)?.form} shiny={e.variant.shiny} size={40} sparkle={false} />
                  <Link href={`/pokemon/${s.id}/`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{s.name[lang]}</span>
                    <span className="block truncate text-xs text-ink-soft">{variantTags(idx, e.variant, m, lang).join(" · ")}</span>
                  </Link>
                  <ConfidenceBadge confidence="insufficient" />
                </li>
              );
            })}
          </ul>
          {unranked.length > unrankedShown && (
            <div className="mt-3 flex justify-center">
              <button className="btn btn-ghost" onClick={() => setUnrankedShown((n) => n + 60)}>{m.rankings.showMore}</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function RankingCard({ e, updated }: { e: RankingEntry; updated: string }) {
  const { idx } = useCatalog();
  const { m, lang } = useI18n();
  if (!idx) return null;
  const s = idx.getSpecies(e.variant.speciesId)!;
  const f = idx.getForm(e.variant.formId)?.form;
  const tags = variantTags(idx, e.variant, m, lang);
  const reasons = e.topFactors.filter((id) => id !== "ACQ.STANDARD" && id !== "ACQ.NESTING").map((id) => FACTOR_PHRASES[id]?.[lang]).filter(Boolean);
  const medal = e.rank === 1 ? "from-amber-300 to-yellow-200" : e.rank === 2 ? "from-slate-300 to-slate-100" : e.rank === 3 ? "from-orange-300 to-amber-100" : "from-violet-100 to-white";
  return (
    <li className="card group flex gap-3 p-3 transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-b ${medal}`}>
        <span className="ltr text-xl font-black">#{e.rank}</span>
        {e.tied && <span className="text-[10px] font-bold text-ink-soft">{m.rankings.tied}</span>}
      </div>
      <PokemonImage species={s} form={f} shiny={e.variant.shiny} size={76} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/pokemon/${s.id}/`} className="min-w-0">
            <p className="truncate text-lg font-black group-hover:text-violet-700">{s.name[lang]}</p>
            <p className="ltr truncate text-start text-xs text-ink-soft">#{s.id} · {s.name.en}</p>
          </Link>
          <p className="shrink-0 text-end">
            <span className="ltr text-2xl font-black">{e.score}</span>
            <span className="block text-[10px] text-ink-soft">{m.compare.estimated}</span>
          </p>
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {tags.map((t) => <Tag key={t}>{t}</Tag>)}
          <TierBadge tier={e.tier} />
          <ConfidenceBadge confidence={e.confidence} />
        </div>
        {reasons.length > 0 && <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{reasons.join(" · ")}</p>}
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">{m.rankings.updated}: {updated}</span>
          <Link href={`/?a=${encodeURIComponent(e.key)}`} className="chip bg-violet-50 text-violet-700 hover:bg-violet-100" aria-label={`${m.actions.compare} ${s.name[lang]}`}>
            <IconCompare size={14} /> {m.actions.compare}
          </Link>
        </div>
      </div>
    </li>
  );
}
