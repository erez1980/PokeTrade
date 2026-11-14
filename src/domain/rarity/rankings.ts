import type { CatalogIndex } from "../catalog/catalog-index";
import { attributeAvailability } from "../catalog/validate";
import { defaultVariant, variantKey, type VariantConfig } from "../catalog/variant";
import { scoreSpecies, scoreVariant, type ResultConfidence } from "./engine";
import { SCORING_VERSION, type TierId } from "./config";

export type RankingFilter =
  | "all"
  | "shiny"
  | "legendary"
  | "mythical"
  | "costume"
  | "background"
  | "regional"
  | "dynamax"
  | "gigantamax"
  | "event";

export interface RankingEntry {
  key: string;
  variant: VariantConfig;
  score: number | null;
  confidence: ResultConfidence;
  tier: TierId | null;
  /** Competition rank ("1224" ranking): ties share a rank. null = unranked. */
  rank: number | null;
  tied: boolean;
  tags: RankingFilter[];
  /** Top factor ids (for the short explanation). */
  topFactors: string[];
}

export interface Rankings {
  scoringVersion: string;
  catalogVersion: string;
  generatedAt: string;
  variants: RankingEntry[];
  species: RankingEntry[];
}

/**
 * Enumerates single-characteristic variants (plus their documented combinations)
 * for every released species. Combinations whose existence cannot be verified are
 * returned with score=null and end up in the "Unranked / insufficient data" list.
 */
export function enumerateVariants(idx: CatalogIndex): VariantConfig[] {
  const out: VariantConfig[] = [];
  for (const s of idx.releasedSpecies()) {
    for (const f of s.forms) {
      const base = defaultVariant(s.id, f.id);
      out.push(base);
      const avail = attributeAvailability(idx, base);
      if (!avail) continue;
      if (avail.shiny.status !== "impossible") out.push({ ...base, shiny: true });
      if (f.kind === "normal") {
        if (avail.shadow.status === "available") out.push({ ...base, shadowState: "shadow" });
        if (avail.dynamax.status === "available") out.push({ ...base, maxState: "dynamax" });
        if (avail.gigantamax.status === "available") out.push({ ...base, maxState: "gigantamax" });
      }
    }
    for (const bg of idx.catalog.backgrounds) {
      if (bg.verifiedSpecies.includes(s.id)) {
        out.push({ ...defaultVariant(s.id, idx.defaultForm(s).id), backgroundId: bg.id });
      }
    }
  }
  return out;
}

function tagsFor(idx: CatalogIndex, v: VariantConfig): RankingFilter[] {
  const s = idx.getSpecies(v.speciesId)!;
  const f = idx.getForm(v.formId)!.form;
  const tags: RankingFilter[] = ["all"];
  if (v.shiny) tags.push("shiny");
  if (s.class === "legendary") tags.push("legendary");
  if (s.class === "mythical") tags.push("mythical");
  if (f.kind === "costume") tags.push("costume", "event");
  if (f.kind === "regional") tags.push("regional");
  if (v.backgroundId) {
    tags.push("background");
    tags.push("event");
  }
  if (v.maxState === "dynamax") tags.push("dynamax");
  if (v.maxState === "gigantamax") tags.push("gigantamax");
  return tags;
}

function rankEntries(entries: RankingEntry[]): RankingEntry[] {
  const scored = entries
    .filter((e) => e.score !== null)
    .sort((a, b) => b.score! - a.score! || a.variant.speciesId - b.variant.speciesId || a.key.localeCompare(b.key));
  let prevScore: number | null = null;
  let prevRank = 0;
  scored.forEach((e, i) => {
    if (e.score !== prevScore) {
      prevRank = i + 1;
      prevScore = e.score;
    }
    e.rank = prevRank;
  });
  const counts = new Map<number, number>();
  for (const e of scored) counts.set(e.rank!, (counts.get(e.rank!) ?? 0) + 1);
  for (const e of scored) e.tied = (counts.get(e.rank!) ?? 0) > 1;
  const unranked = entries.filter((e) => e.score === null).sort((a, b) => a.variant.speciesId - b.variant.speciesId || a.key.localeCompare(b.key));
  return [...scored, ...unranked];
}

export function buildRankings(idx: CatalogIndex, generatedAt: string): Rankings {
  const variants = enumerateVariants(idx).map<RankingEntry>((v) => {
    const r = scoreVariant(idx, v);
    return {
      key: variantKey(v),
      variant: v,
      score: r.score,
      confidence: r.confidence,
      tier: r.tier,
      rank: null,
      tied: false,
      tags: tagsFor(idx, v),
      topFactors: r.factors.filter((f) => f.counted).sort((a, b) => b.factor.points - a.factor.points).map((f) => f.factor.id).slice(0, 3),
    };
  });
  const species = idx.releasedSpecies().map<RankingEntry>((s) => {
    const r = scoreSpecies(idx, s);
    const v = defaultVariant(s.id, idx.defaultForm(s).id);
    return {
      key: variantKey(v),
      variant: v,
      score: r.score,
      confidence: r.confidence,
      tier: r.tier,
      rank: null,
      tied: false,
      tags: tagsFor(idx, v),
      topFactors: r.factors.filter((f) => f.counted).sort((a, b) => b.factor.points - a.factor.points).map((f) => f.factor.id).slice(0, 3),
    };
  });
  return {
    scoringVersion: SCORING_VERSION,
    catalogVersion: idx.catalog.catalogVersion,
    generatedAt,
    variants: rankEntries(variants),
    species: rankEntries(species),
  };
}

/** Re-ranks a filtered subset (ranks are recomputed inside the filtered view). */
export function filterRankings(entries: RankingEntry[], filter: RankingFilter): RankingEntry[] {
  const subset = entries.filter((e) => e.tags.includes(filter)).map((e) => ({ ...e, rank: null, tied: false }));
  return rankEntries(subset);
}
