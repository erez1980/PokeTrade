"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { defaultVariant, type VariantConfig } from "@/domain/catalog/variant";
import { scoreSpecies, scoreVariant } from "@/domain/rarity/engine";
import { explainSingle } from "@/domain/rarity/explain";
import { useCatalog } from "../providers/CatalogProvider";
import { useI18n } from "../providers/I18nProvider";
import { CatalogGate } from "../States";
import { PokemonImage } from "../PokemonImage";
import { PokemonOnBackground } from "../PokemonOnBackground";
import { ConfidenceBadge, Tag, TierBadge } from "../Badges";
import { VariantConfigurator } from "../VariantConfigurator";
import { SaveActions } from "../SaveActions";
import { TradeNotices } from "../TradeNotices";
import { ScoreCard } from "../ScoreCard";
import { FactorDetails } from "../FactorDetails";
import { IconChevron } from "../Icons";

export function PokemonDetailsScreen({ id }: { id: number }) {
  return (
    <CatalogGate>
      <Inner id={id} />
    </CatalogGate>
  );
}

function Inner({ id }: { id: number }) {
  const { idx } = useCatalog();
  const { m, lang } = useI18n();
  const species = idx?.getSpecies(id);
  const [v, setV] = useState<VariantConfig | null>(() => (species && idx ? defaultVariant(species.id, idx.defaultForm(species).id) : null));
  const result = useMemo(() => (idx && v ? scoreVariant(idx, v) : null), [idx, v]);
  const speciesResult = useMemo(() => (idx && species ? scoreSpecies(idx, species) : null), [idx, species]);
  if (!idx || !species || !v || !result || !speciesResult) return <p className="card p-6 text-center font-bold">{m.notFound}</p>;

  const form = idx.getForm(v.formId)?.form;
  const src = (sid: string) => idx.getSource(sid);
  const yesNo = (b: boolean) => (b ? m.details.yes : m.details.no);
  const facts: { label: string; value: string; source: string }[] = [
    { label: m.details.shinyReleased, value: yesNo(species.flags.shinyReleased), source: "pogoapi:shiny_pokemon" },
    ...(species.flags.shinyChannels.length ? [{ label: m.details.shinyChannels, value: species.flags.shinyChannels.map((c) => m.details.channels[c]).join(", "), source: "pogoapi:shiny_pokemon" }] : []),
    { label: m.details.nesting, value: yesNo(species.flags.nesting), source: "pogoapi:nesting_pokemon" },
    { label: m.details.raidExclusive, value: yesNo(species.flags.raidExclusive), source: "pogoapi:raid_exclusive_pokemon" },
    { label: m.details.researchExclusive, value: yesNo(species.flags.researchExclusive), source: "pogoapi:research_task_exclusive_pokemon" },
    { label: m.details.photobombExclusive, value: yesNo(species.flags.photobombExclusive), source: "pogoapi:photobomb_exclusive_pokemon" },
    { label: m.details.regionalExclusive, value: species.flags.regionalExclusive ?? m.details.no, source: "curated-regionals" },
    { label: m.details.shadowAvailable, value: yesNo(species.flags.shadow), source: "pogoapi:shadow_pokemon" },
    { label: m.details.maxAvailable, value: yesNo(species.flags.dynamax), source: "game-master" },
    { label: m.details.gmaxAvailable, value: yesNo(species.flags.gigantamax), source: "game-master" },
    { label: m.details.tradable, value: yesNo(species.flags.tradable), source: "official-trading" },
  ];

  return (
    <div className="space-y-5">
      <Link href="/pokedex/" className="btn btn-ghost !min-h-9 !py-1 text-sm">{m.details.back}</Link>
      <section className="card overflow-hidden">
        <div className="grid gap-4 bg-gradient-to-bl from-violet-100 via-white to-amber-50 p-5 sm:grid-cols-[auto_1fr]">
          <div className="flex justify-center">
            <PokemonOnBackground variant={v} size={200} priority />
          </div>
          <div>
            <p className="text-sm font-bold text-ink-soft"><bdi>#{String(species.id).padStart(4, "0")}</bdi> · {m.details.gen} {species.gen}</p>
            <h1 className="text-3xl font-black sm:text-4xl">{species.name[lang]}</h1>
            {lang === "he" && <p className="ltr text-start text-ink-soft">{species.name.en}</p>}
            <div className="mt-2 flex flex-wrap gap-1">
              {species.types.map((t) => <Tag key={t} tone="sky">{m.types[t as keyof typeof m.types] ?? t}</Tag>)}
              {species.class !== "standard" && <Tag tone="sun">{m.attrs[species.class]}</Tag>}
              {species.baby && <Tag tone="leaf">baby</Tag>}
              {!species.released && <Tag tone="slate">{m.pokedex.unreleased}</Tag>}
            </div>
            {!species.released ? (
              <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{m.details.notReleasedNote}</p>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold">{m.details.speciesScore}:</span>
                <span className="ltr text-xl font-black">{speciesResult.score ?? "—"}</span>
                <TierBadge tier={speciesResult.tier} />
                <ConfidenceBadge confidence={speciesResult.confidence} />
              </div>
            )}
          </div>
        </div>
      </section>

      {species.forms.length > 1 && (
        <section className="card p-4">
          <h2 className="mb-3 text-lg font-black">{m.details.forms} <span className="ltr text-sm text-ink-soft">({species.forms.length})</span></h2>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
            {species.forms.map((f) => (
              <li key={f.id}>
                <button type="button" onClick={() => setV({ ...defaultVariant(species.id, f.id) })} aria-pressed={v.formId === f.id} className={`flex w-full flex-col items-center rounded-2xl p-2 text-center text-[11px] font-bold ${v.formId === f.id ? "bg-violet-100 ring-2 ring-violet-400" : "bg-violet-50/50 hover:bg-violet-50"}`}>
                  <PokemonImage species={species} form={f} size={56} sparkle={false} />
                  <span className="line-clamp-2">{f.kind === "normal" ? m.attrs.sizeNormal : f.name[lang]}</span>
                  <span className="mt-0.5 text-[10px] font-semibold text-ink-soft">{m.attrs[f.kind === "normal" ? "form" : f.kind]}{f.status === "unverified" ? ` · ${m.attrs.unverifiedTag}` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {species.released && (
        <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="card space-y-4 p-4">
            <h2 className="text-lg font-black">{m.details.features}</h2>
            <VariantConfigurator value={v} onChange={setV} />
            <SaveActions variant={v} showCompare />
          </div>
          <div className="card space-y-4 p-4">
            <h2 className="text-lg font-black">{m.details.rarity}</h2>
            <ScoreCard result={result} label={species.name[lang]} />
            <p className="text-sm font-semibold">{explainSingle(result, species.name[lang], lang)}</p>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold">{m.compare.details}<IconChevron className="transition group-open:rotate-180" /></summary>
              <div className="mt-2"><FactorDetails result={result} title={species.name[lang]} /></div>
            </details>
            <TradeNotices variant={v} />
          </div>
        </section>
      )}

      <section className="card p-4">
        <h2 className="mb-2 text-lg font-black">{m.details.availability}</h2>
        <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {facts.map((f) => {
            const s = src(f.source);
            return (
              <div key={f.label} className="flex items-baseline justify-between gap-3 border-b border-violet-50 py-1.5 text-sm">
                <dt className="font-semibold">{f.label}</dt>
                <dd className="text-end">
                  <span className="font-bold">{f.value}</span>
                  {s && <a href={s.url} target="_blank" rel="noopener noreferrer" className="ms-2 text-[10px] text-ink-soft underline ltr">{s.id} · {(s.sourceVersion ?? s.retrievedAt).slice(0, 16)}</a>}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
    </div>
  );
}
