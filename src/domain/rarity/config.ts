import type { ConfidenceLevel } from "../catalog/schema";

/**
 * Versioned scoring methodology. Every change to points, groups or thresholds
 * MUST bump `version` and be described in docs/RARITY_METHODOLOGY.md.
 *
 * Points are "rarity index points" — an ordinal model, NOT probabilities.
 * Factors are organised in groups; within a group only the strongest factor
 * counts (prevents double counting of overlapping evidence, e.g. "Legendary"
 * and "raid exclusive" both describe the same acquisition limitation).
 */
export const SCORING_VERSION = "1.1.0";
export const SCORING_EFFECTIVE_DATE = "2026-11-19";

export type FactorGroup =
  | "acquisition"
  | "distribution"
  | "form"
  | "shiny"
  | "trade"
  | "shadow"
  | "max"
  | "background"
  | "size"
  | "move";

export interface FactorDefinition {
  id: string;
  group: FactorGroup;
  points: number;
  /** Confidence of the *evidence type* backing this factor. */
  confidence: ConfidenceLevel;
  /** Source id (catalog.sources) or curated evidence id the factor relies on. */
  sourceId: string;
  /** Human-readable rule (English) – mirrored in the methodology doc. */
  rule: string;
}

export const FACTORS: Record<string, FactorDefinition> = {
  // --- Acquisition (species-level availability; exactly one applies) ---
  "ACQ.MYTHICAL": { id: "ACQ.MYTHICAL", group: "acquisition", points: 70, confidence: "high", sourceId: "game-master", rule: "Species is classified Mythical in the game master. Mythicals are distributed through limited research / events, typically one per account." },
  "ACQ.LEGENDARY": { id: "ACQ.LEGENDARY", group: "acquisition", points: 55, confidence: "high", sourceId: "game-master", rule: "Species is classified Legendary in the game master (obtained mainly via 5-star / Elite / Max raids for limited windows)." },
  "ACQ.ULTRA_BEAST": { id: "ACQ.ULTRA_BEAST", group: "acquisition", points: 55, confidence: "medium", sourceId: "pogoapi", rule: "Species is classified as an Ultra Beast (raid-limited distribution)." },
  "ACQ.PHOTOBOMB": { id: "ACQ.PHOTOBOMB", group: "acquisition", points: 45, confidence: "medium", sourceId: "pogoapi", rule: "Only obtainable through GO Snapshot photobombs." },
  "ACQ.RESEARCH": { id: "ACQ.RESEARCH", group: "acquisition", points: 45, confidence: "medium", sourceId: "pogoapi", rule: "Only obtainable through research tasks." },
  "ACQ.RAID": { id: "ACQ.RAID", group: "acquisition", points: 45, confidence: "medium", sourceId: "pogoapi", rule: "Only obtainable through raids." },
  "ACQ.BABY": { id: "ACQ.BABY", group: "acquisition", points: 25, confidence: "medium", sourceId: "pogoapi", rule: "Baby Pokémon – primarily hatched from eggs." },
  "ACQ.STANDARD": { id: "ACQ.STANDARD", group: "acquisition", points: 18, confidence: "medium", sourceId: "pogoapi", rule: "Standard species without a documented acquisition restriction." },
  "ACQ.NESTING": { id: "ACQ.NESTING", group: "acquisition", points: 8, confidence: "medium", sourceId: "pogoapi", rule: "Standard species that can nest (documented frequent spawner)." },

  // --- Distribution ---
  "DIST.REGIONAL": { id: "DIST.REGIONAL", group: "distribution", points: 20, confidence: "medium", sourceId: "curated-regionals", rule: "Regional exclusive – appears in the wild only in a specific part of the world." },

  // --- Form ---
  "FORM.COSTUME": { id: "FORM.COSTUME", group: "form", points: 15, confidence: "medium", sourceId: "pokemon-go-api", rule: "Costume / event form – distributed only during limited-time events." },

  // --- Shiny (rate category from community research; never presented as exact odds) ---
  "SHINY.FULL_ODDS": { id: "SHINY.FULL_ODDS", group: "shiny", points: 30, confidence: "medium", sourceId: "curated-shiny-rates", rule: "Shiny of a standard species: community research estimates the standard wild rate at roughly 1 in 500." },
  "SHINY.BOOSTED_ODDS": { id: "SHINY.BOOSTED_ODDS", group: "shiny", points: 15, confidence: "medium", sourceId: "curated-shiny-rates", rule: "Shiny of a raid/legendary-class Pokémon: community research estimates boosted rates (roughly 1 in 20 for legendary raids)." },
  "SHINY.MYTHICAL": { id: "SHINY.MYTHICAL", group: "shiny", points: 20, confidence: "medium", sourceId: "pogoapi", rule: "Shiny Mythical – shiny released, usually through one-time paid or event research." },

  // --- Trade ---
  "TRADE.LUCKY": { id: "TRADE.LUCKY", group: "trade", points: 10, confidence: "high", sourceId: "official-trading", rule: "Lucky Pokémon only result from trades (Lucky Trades)." },

  // --- Shadow ---
  "SHADOW.SHADOW": { id: "SHADOW.SHADOW", group: "shadow", points: 10, confidence: "medium", sourceId: "pogoapi", rule: "Shadow Pokémon are obtained only from Team GO Rocket encounters and cannot be traded." },
  "SHADOW.PURIFIED": { id: "SHADOW.PURIFIED", group: "shadow", points: 10, confidence: "medium", sourceId: "pogoapi", rule: "Purified Pokémon originate from Shadow Pokémon." },

  // --- Max ---
  "MAX.DYNAMAX": { id: "MAX.DYNAMAX", group: "max", points: 20, confidence: "medium", sourceId: "game-master", rule: "Dynamax-capable – caught only from Max Battles at Power Spots during rotations." },
  "MAX.GIGANTAMAX": { id: "MAX.GIGANTAMAX", group: "max", points: 35, confidence: "medium", sourceId: "game-master", rule: "Gigantamax-capable – caught only from Gigantamax Max Battles during limited windows." },

  // --- Background ---
  "BG.LOCATION": { id: "BG.LOCATION", group: "background", points: 20, confidence: "medium", sourceId: "game-master", rule: "Location background – only from attending a specific in-person event/location." },
  "BG.SPECIAL": { id: "BG.SPECIAL", group: "background", points: 12, confidence: "medium", sourceId: "game-master", rule: "Special background – only from a specific limited event." },

  // --- Size / moves ---
  "SIZE.EXTREME": { id: "SIZE.EXTREME", group: "size", points: 5, confidence: "low", sourceId: "game-master", rule: "XXL/XXS size class (size bounds defined in the game master; frequency not published)." },
  "MOVE.LEGACY": { id: "MOVE.LEGACY", group: "move", points: 5, confidence: "medium", sourceId: "game-master", rule: "Knows a legacy/exclusive move (obtainable only via events or Elite TMs)." },
};

export interface ComparisonThresholds {
  /** Score difference at or above which one Pokémon is "significantly" rarer. */
  significant: number;
  /** Score difference at or above which one Pokémon is "moderately" rarer. Below => about equal. */
  moderate: number;
  /** Multiplier applied to `moderate` when either side has low confidence (wider "about equal" band). */
  lowConfidenceWidening: number;
}

export const THRESHOLDS: ComparisonThresholds = {
  significant: 15,
  moderate: 5,
  lowConfidenceWidening: 2,
};

export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

/** Rarity tiers for rankings and badges (score-based, inclusive lower bounds). */
export const TIERS = [
  { id: "mythic", min: 85 },
  { id: "ultra", min: 70 },
  { id: "rare", min: 50 },
  { id: "uncommon", min: 30 },
  { id: "common", min: 0 },
] as const;
export type TierId = (typeof TIERS)[number]["id"];
