import { z } from "zod";

/**
 * Normalized catalog schema. The catalog is produced by the ingestion pipeline
 * (scripts/pipeline) and consumed by the UI and the rarity engine.
 * A new Pokémon becomes available simply by appearing in a new catalog snapshot.
 */

export const LocalizedText = z.object({ en: z.string().min(1), he: z.string().min(1) });
export type LocalizedText = z.infer<typeof LocalizedText>;

export const ConfidenceLevel = z.enum(["high", "medium", "low"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;

export const SourceRef = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  license: z.string(),
  retrievedAt: z.string(),
  /** Content hash of the raw snapshot used for this catalog build. */
  sha256: z.string().optional(),
  /** Source's own "last modified" / version marker if exposed. */
  sourceVersion: z.string().optional(),
  notes: z.string().optional(),
});
export type SourceRef = z.infer<typeof SourceRef>;

export const SpeciesClass = z.enum(["standard", "legendary", "mythical", "ultra_beast"]);
export type SpeciesClass = z.infer<typeof SpeciesClass>;

export const FormKind = z.enum(["normal", "regional", "costume", "special"]);
export type FormKind = z.infer<typeof FormKind>;

export const Tri = z.enum(["yes", "no", "unknown"]);
export type Tri = z.infer<typeof Tri>;

export const PokemonForm = z.object({
  /** Stable form id, e.g. "PIKACHU_NORMAL", "VULPIX_ALOLA", "PIKACHU_C_HOLIDAY_2016". */
  id: z.string().regex(/^[A-Z0-9_]+$/),
  name: LocalizedText,
  kind: FormKind,
  region: z.enum(["alola", "galar", "hisui", "paldea"]).optional(),
  /** "available": evidence the form exists in Pokémon GO; "unverified": referenced but release not confirmed. */
  status: z.enum(["available", "unverified"]),
  /** Asset key used to build image URLs (pokemon-go-api/assets naming). */
  asset: z.string().optional(),
  /** Whether a Shiny version of this exact form is documented as released. */
  shiny: Tri,
  /** Evidence record backing the Shiny status of this form (curated research). */
  shinyEvidenceId: z.string().optional(),
  /** Event tag, for costumes ("HOLIDAY_2016") when known. */
  eventTag: z.string().optional(),
});
export type PokemonForm = z.infer<typeof PokemonForm>;

export const ShinyChannel = z.enum(["wild", "raid", "egg", "research", "evolution", "photobomb"]);
export type ShinyChannel = z.infer<typeof ShinyChannel>;

export const PokemonSpecies = z.object({
  id: z.number().int().positive(),
  key: z.string().regex(/^[A-Z0-9_]+$/),
  name: LocalizedText,
  /** Additional searchable aliases (Hebrew spellings, alternative transliterations). */
  aliases: z.array(z.string()),
  gen: z.number().int().min(1).max(20),
  types: z.array(z.string()).min(1).max(2),
  class: SpeciesClass,
  released: z.boolean(),
  baby: z.boolean(),
  family: z.number().int(),
  forms: z.array(PokemonForm).min(1),
  flags: z.object({
    shinyReleased: z.boolean(),
    shinyChannels: z.array(ShinyChannel),
    shadow: z.boolean(),
    nesting: z.boolean(),
    raidExclusive: z.boolean(),
    researchExclusive: z.boolean(),
    photobombExclusive: z.boolean(),
    /** Regional exclusive note (curated, source-attributed) or null. */
    regionalExclusive: z.string().nullable(),
    dynamax: z.boolean(),
    gigantamax: z.boolean(),
    eliteMoves: z.array(z.string()),
    sizeVariants: z.boolean(),
    tradable: z.boolean(),
  }),
});
export type PokemonSpecies = z.infer<typeof PokemonSpecies>;

export const PokemonBackground = z.object({
  id: z.string().regex(/^[A-Z0-9_]+$/),
  name: LocalizedText,
  kind: z.enum(["location", "special"]),
  /** Species ids on which this background has been verified (curated). Empty = not verified for any species. */
  verifiedSpecies: z.array(z.number().int()),
  /** The background applied to every Pokémon caught at the event (curated); species list is then non-exhaustive. */
  allCaught: z.boolean().optional(),
  /** Game asset name of the background picture (PokeMiners pogo_assets/Images/LocationCards). */
  image: z.string().regex(/^[A-Za-z0-9_\-]+$/).optional(),
  year: z.number().int().optional(),
  /** Event dates (curated), e.g. "2024-06-14..2024-06-16". */
  dates: z.string().optional(),
  evidenceIds: z.array(z.string()).optional(),
  source: z.string(),
});
export type PokemonBackground = z.infer<typeof PokemonBackground>;

export const EvidenceRecord = z.object({
  id: z.string(),
  description: LocalizedText,
  sourceId: z.string(),
  url: z.string().url().optional(),
  confidence: ConfidenceLevel,
  /** Additional pages that state the same fact (cross-checks). */
  alsoSeenIn: z.array(z.string().url()).optional(),
  /** ISO date range the evidence describes, or the "as of" date for snapshot data. */
  period: z.object({ from: z.string().optional(), to: z.string().optional(), asOf: z.string() }),
});
export type EvidenceRecord = z.infer<typeof EvidenceRecord>;

/** A combination of attributes that has been individually verified by a curator. */
export const VerifiedCombo = z.object({
  speciesId: z.number().int(),
  formId: z.string().optional(),
  attributes: z.array(z.enum(["shiny", "shadow", "purified", "dynamax", "gigantamax", "background"])).min(1),
  evidenceId: z.string(),
});
export type VerifiedCombo = z.infer<typeof VerifiedCombo>;

export const Catalog = z.object({
  schemaVersion: z.literal(1),
  catalogVersion: z.string(),
  generatedAt: z.string(),
  sources: z.array(SourceRef),
  evidence: z.array(EvidenceRecord),
  species: z.array(PokemonSpecies),
  backgrounds: z.array(PokemonBackground),
  verifiedCombos: z.array(VerifiedCombo),
  tradableMythicals: z.array(z.number().int()),
});
export type Catalog = z.infer<typeof Catalog>;
