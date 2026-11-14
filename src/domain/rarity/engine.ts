import type { CatalogIndex } from "../catalog/catalog-index";
import type { ConfidenceLevel, PokemonForm, PokemonSpecies } from "../catalog/schema";
import { validateVariant, type VariantValidation } from "../catalog/validate";
import type { VariantConfig } from "../catalog/variant";
import {
  FACTORS,
  SCORE_MAX,
  SCORE_MIN,
  SCORING_VERSION,
  THRESHOLDS,
  TIERS,
  type ComparisonThresholds,
  type FactorDefinition,
  type TierId,
} from "./config";

export type ResultConfidence = ConfidenceLevel | "insufficient";

export interface AppliedFactor {
  factor: FactorDefinition;
  /** Facts from the catalog that triggered the factor (for "advanced details"). */
  facts: string[];
  /** Whether this factor counted (false = superseded by a stronger factor in the same group). */
  counted: boolean;
}

export interface RarityResult {
  scoringVersion: string;
  catalogVersion: string;
  variantStatus: VariantValidation["status"];
  validation: VariantValidation;
  /** null when evidence is insufficient (never a fabricated number). */
  score: number | null;
  confidence: ResultConfidence;
  tier: TierId | null;
  factors: AppliedFactor[];
}

const CONF_ORDER: Record<ConfidenceLevel, number> = { high: 3, medium: 2, low: 1 };

function minConfidence(levels: ConfidenceLevel[]): ConfidenceLevel {
  let best: ConfidenceLevel = "high";
  for (const l of levels) if (CONF_ORDER[l] < CONF_ORDER[best]) best = l;
  return best;
}

export function tierFor(score: number): TierId {
  for (const t of TIERS) if (score >= t.min) return t.id;
  return "common";
}

function acquisitionFactors(s: PokemonSpecies): AppliedFactor[] {
  const out: AppliedFactor[] = [];
  const add = (id: string, facts: string[]) => out.push({ factor: FACTORS[id]!, facts, counted: false });
  if (s.class === "mythical") add("ACQ.MYTHICAL", ["class=mythical"]);
  if (s.class === "legendary") add("ACQ.LEGENDARY", ["class=legendary"]);
  if (s.class === "ultra_beast") add("ACQ.ULTRA_BEAST", ["class=ultra_beast"]);
  if (s.flags.photobombExclusive) add("ACQ.PHOTOBOMB", ["photobombExclusive=true"]);
  if (s.flags.researchExclusive) add("ACQ.RESEARCH", ["researchExclusive=true"]);
  if (s.flags.raidExclusive) add("ACQ.RAID", ["raidExclusive=true"]);
  if (s.baby) add("ACQ.BABY", ["baby=true"]);
  if (out.length === 0) {
    if (s.flags.nesting) add("ACQ.NESTING", ["nesting=true"]);
    else add("ACQ.STANDARD", ["no documented acquisition restriction"]);
  }
  return out;
}

function hasAcquisitionEvidence(s: PokemonSpecies): boolean {
  // Standard species with neither shiny-channel data nor nest data: our sources say
  // little about how it is obtained -> confidence is lowered (not the score).
  return (
    s.class !== "standard" ||
    s.flags.nesting ||
    s.flags.shinyChannels.length > 0 ||
    s.flags.raidExclusive ||
    s.flags.researchExclusive ||
    s.flags.photobombExclusive ||
    s.baby
  );
}

/** Collects every factor that applies to a (valid) variant. */
export function collectFactors(idx: CatalogIndex, s: PokemonSpecies, f: PokemonForm, v: VariantConfig): AppliedFactor[] {
  const factors: AppliedFactor[] = acquisitionFactors(s);
  const add = (id: string, facts: string[]) => factors.push({ factor: FACTORS[id]!, facts, counted: false });

  // Regional exclusivity applies to the original form only (e.g. Galarian Mr. Mime is not region-locked).
  if (s.flags.regionalExclusive && f.kind !== "regional") add("DIST.REGIONAL", [`regionalExclusive=${s.flags.regionalExclusive}`]);
  if (f.kind === "costume") add("FORM.COSTUME", [`form=${f.id}`]);

  if (v.shiny) {
    if (s.class === "mythical") add("SHINY.MYTHICAL", ["shinyReleased=true", "class=mythical"]);
    else if (
      s.class !== "standard" ||
      s.flags.raidExclusive ||
      !s.flags.shinyChannels.some((c) => c === "wild" || c === "egg" || c === "photobomb")
    )
      add("SHINY.BOOSTED_ODDS", [`shinyChannels=${s.flags.shinyChannels.join(",") || "none-listed"}`]);
    else add("SHINY.FULL_ODDS", [`shinyChannels=${s.flags.shinyChannels.join(",")}`]);
  }
  if (v.lucky) add("TRADE.LUCKY", ["lucky=true"]);
  if (v.shadowState === "shadow") add("SHADOW.SHADOW", ["shadow=true"]);
  if (v.shadowState === "purified") add("SHADOW.PURIFIED", ["purified=true"]);
  if (v.maxState === "dynamax") add("MAX.DYNAMAX", ["dynamax=true"]);
  if (v.maxState === "gigantamax") add("MAX.GIGANTAMAX", ["gigantamax=true"]);
  if (v.backgroundId) {
    const bg = idx.getBackground(v.backgroundId);
    if (bg) add(bg.kind === "location" ? "BG.LOCATION" : "BG.SPECIAL", [`background=${bg.id}`]);
  }
  if (v.size !== "normal") add("SIZE.EXTREME", [`size=${v.size}`]);
  if (v.legacyMove) add("MOVE.LEGACY", [`eliteMoves=${s.flags.eliteMoves.join(",")}`]);

  // Within each group only the strongest factor counts (no double counting).
  const bestByGroup = new Map<string, AppliedFactor>();
  for (const af of factors) {
    const cur = bestByGroup.get(af.factor.group);
    if (!cur || af.factor.points > cur.factor.points) bestByGroup.set(af.factor.group, af);
  }
  for (const af of bestByGroup.values()) af.counted = true;
  return factors;
}

/** Deterministic rarity scoring of one exact variant. Pure function of (catalog, variant, version). */
export function scoreVariant(idx: CatalogIndex, v: VariantConfig): RarityResult {
  const validation = validateVariant(idx, v);
  const base = {
    scoringVersion: SCORING_VERSION,
    catalogVersion: idx.catalog.catalogVersion,
    variantStatus: validation.status,
    validation,
  };
  const s = idx.getSpecies(v.speciesId);
  const fe = idx.getForm(v.formId);
  if (validation.status !== "available" || !s || !fe || !s.released) {
    return { ...base, score: null, confidence: "insufficient", tier: null, factors: [] };
  }
  const factors = collectFactors(idx, s, fe.form, v);
  const counted = factors.filter((f) => f.counted);
  const raw = counted.reduce((sum, f) => sum + f.factor.points, 0);
  const score = Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(raw)));

  const levels = counted.map((f) => f.factor.confidence);
  if (!hasAcquisitionEvidence(s)) levels.push("low");
  const confidence = minConfidence(levels);

  return { ...base, score, confidence, tier: tierFor(score), factors };
}

export type ComparisonOutcome =
  | "a_much_rarer"
  | "a_rarer"
  | "equal"
  | "b_rarer"
  | "b_much_rarer"
  | "insufficient";

export interface ComparisonResult {
  a: RarityResult;
  b: RarityResult;
  outcome: ComparisonOutcome;
  /** Difference a - b (null when insufficient). */
  diff: number | null;
  /** Meter position of A in [0,1], derived from scores: a / (a + b). 0.5 when equal or both zero. */
  meterA: number | null;
}

export function compareResults(a: RarityResult, b: RarityResult, t: ComparisonThresholds = THRESHOLDS): ComparisonResult {
  if (a.score === null || b.score === null) {
    return { a, b, outcome: "insufficient", diff: null, meterA: null };
  }
  const diff = a.score - b.score;
  const low = a.confidence === "low" || b.confidence === "low";
  const moderate = low ? t.moderate * t.lowConfidenceWidening : t.moderate;
  const abs = Math.abs(diff);
  let outcome: ComparisonOutcome;
  if (abs < moderate) outcome = "equal";
  else if (abs >= t.significant) outcome = diff > 0 ? "a_much_rarer" : "b_much_rarer";
  else outcome = diff > 0 ? "a_rarer" : "b_rarer";
  const total = a.score + b.score;
  const meterA = total === 0 ? 0.5 : a.score / total;
  return { a, b, outcome, diff, meterA };
}

export function compareVariants(idx: CatalogIndex, a: VariantConfig, b: VariantConfig, t?: ComparisonThresholds): ComparisonResult {
  return compareResults(scoreVariant(idx, a), scoreVariant(idx, b), t);
}

/** Species-level aggregate: the rarity of the species itself (default form, no special characteristics). */
export function scoreSpecies(idx: CatalogIndex, s: PokemonSpecies): RarityResult {
  const f = idx.defaultForm(s);
  return scoreVariant(idx, {
    speciesId: s.id,
    formId: f.id,
    shiny: false,
    lucky: false,
    shadowState: "none",
    maxState: "none",
    backgroundId: null,
    size: "normal",
    legacyMove: false,
  });
}
