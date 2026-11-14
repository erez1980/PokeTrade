import type { CatalogIndex } from "./catalog-index";
import type { PokemonForm, PokemonSpecies } from "./schema";
import type { AttributeKey, VariantConfig } from "./variant";

/**
 * Attribute validation layer.
 *  - "available":  documented as obtainable for this species/form.
 *  - "impossible": cannot exist (rule-based or documented as never released).
 *  - "unverified": might exist, but our sources cannot confirm it. Never scored definitively.
 */
export type AvailabilityStatus = "available" | "impossible" | "unverified";

export type ReasonCode =
  | "ok"
  | "species_not_released"
  | "unknown_species"
  | "unknown_form"
  | "form_unverified"
  | "shiny_not_released"
  | "shiny_form_unverified"
  | "lucky_untradable"
  | "lucky_shadow"
  | "shadow_not_released"
  | "shadow_form_unverified"
  | "shadow_shiny_unverified"
  | "shadow_max_conflict"
  | "max_not_available"
  | "gmax_not_available"
  | "max_form_unverified"
  | "max_shiny_unverified"
  | "background_unknown"
  | "background_unverified"
  | "background_combo_unverified"
  | "size_not_available"
  | "legacy_none";

export interface AttributeAvailability {
  status: AvailabilityStatus;
  reason: ReasonCode;
}

export type AvailabilityMap = Record<AttributeKey, AttributeAvailability>;

const OK: AttributeAvailability = { status: "available", reason: "ok" };
const imp = (reason: ReasonCode): AttributeAvailability => ({ status: "impossible", reason });
const unv = (reason: ReasonCode): AttributeAvailability => ({ status: "unverified", reason });

function shinyAvailability(idx: CatalogIndex, s: PokemonSpecies, f: PokemonForm): AttributeAvailability {
  if (!s.flags.shinyReleased) return imp("shiny_not_released");
  if (f.shiny === "yes" || idx.isComboVerified(s.id, f.id, "shiny")) return OK;
  if (f.shiny === "no") return imp("shiny_not_released");
  return unv("shiny_form_unverified");
}

/**
 * Availability of each attribute *given the rest of the configuration*.
 * Used both to drive the UI (disable/annotate toggles) and to gate scoring.
 */
export function attributeAvailability(idx: CatalogIndex, v: VariantConfig): AvailabilityMap | null {
  const s = idx.getSpecies(v.speciesId);
  if (!s) return null;
  const formEntry = idx.getForm(v.formId);
  const f = formEntry && formEntry.species.id === s.id ? formEntry.form : undefined;
  if (!f) return null;

  const isNormalForm = f.kind === "normal";
  const map = {} as AvailabilityMap;

  map.form = !s.released ? imp("species_not_released") : f.status === "available" ? OK : unv("form_unverified");

  // Shiny
  let shiny = shinyAvailability(idx, s, f);
  if (shiny.status === "available" && v.shadowState !== "none" && !idx.isComboVerified(s.id, f.id, "shadow")) {
    // Shiny Shadow/Purified exist for some species only; our sources do not list which.
    shiny = unv("shadow_shiny_unverified");
  }
  if (shiny.status === "available" && v.maxState !== "none" && !idx.isComboVerified(s.id, f.id, v.maxState)) {
    shiny = unv("max_shiny_unverified");
  }
  map.shiny = shiny;

  // Lucky: only obtainable through trading.
  const tradable = s.flags.tradable;
  map.lucky = !tradable ? imp("lucky_untradable") : v.shadowState === "shadow" ? imp("lucky_shadow") : OK;

  // Shadow / Purified
  const shadowBase: AttributeAvailability = !s.flags.shadow
    ? imp("shadow_not_released")
    : !isNormalForm && !idx.isComboVerified(s.id, f.id, "shadow")
      ? unv("shadow_form_unverified")
      : v.maxState !== "none"
        ? imp("shadow_max_conflict")
        : OK;
  map.shadow = v.lucky && shadowBase.status === "available" ? imp("lucky_shadow") : shadowBase;
  map.purified = shadowBase.status === "available" || shadowBase.reason === "shadow_form_unverified"
    ? (!isNormalForm && !idx.isComboVerified(s.id, f.id, "purified") ? unv("shadow_form_unverified") : OK)
    : shadowBase;

  // Max
  const maxForm = isNormalForm || idx.isComboVerified(s.id, f.id, "dynamax");
  const conflictShadow = v.shadowState !== "none";
  map.dynamax = !s.flags.dynamax
    ? imp("max_not_available")
    : conflictShadow
      ? imp("shadow_max_conflict")
      : !maxForm
        ? unv("max_form_unverified")
        : OK;
  map.gigantamax = !s.flags.gigantamax
    ? imp("gmax_not_available")
    : conflictShadow
      ? imp("shadow_max_conflict")
      : !(isNormalForm || idx.isComboVerified(s.id, f.id, "gigantamax"))
        ? unv("max_form_unverified")
        : OK;

  // Background
  if (!v.backgroundId) {
    map.background = OK;
  } else {
    const bg = idx.getBackground(v.backgroundId);
    if (!bg) map.background = unv("background_unknown");
    else if (!bg.verifiedSpecies.includes(s.id) && !idx.isComboVerified(s.id, f.id, "background"))
      map.background = unv("background_unverified");
    else if (v.shiny || v.shadowState !== "none" || v.maxState !== "none" || f.kind === "costume")
      map.background = idx.isComboVerified(s.id, f.id, "background") ? OK : unv("background_combo_unverified");
    else map.background = OK;
  }

  map.size = s.flags.sizeVariants ? OK : imp("size_not_available");
  map.legacyMove = s.flags.eliteMoves.length > 0 ? OK : imp("legacy_none");

  return map;
}

export interface VariantValidation {
  status: AvailabilityStatus;
  /** Reasons for the attributes actually selected in the variant that are not "available". */
  problems: { attribute: AttributeKey; status: AvailabilityStatus; reason: ReasonCode }[];
}

/** Validation of the *selected* attributes of a variant. */
export function validateVariant(idx: CatalogIndex, v: VariantConfig): VariantValidation {
  const s = idx.getSpecies(v.speciesId);
  if (!s) return { status: "impossible", problems: [{ attribute: "form", status: "impossible", reason: "unknown_species" }] };
  const map = attributeAvailability(idx, v);
  if (!map) return { status: "impossible", problems: [{ attribute: "form", status: "impossible", reason: "unknown_form" }] };

  const selected: AttributeKey[] = ["form"];
  if (v.shiny) selected.push("shiny");
  if (v.lucky) selected.push("lucky");
  if (v.shadowState === "shadow") selected.push("shadow");
  if (v.shadowState === "purified") selected.push("purified");
  if (v.maxState === "dynamax") selected.push("dynamax");
  if (v.maxState === "gigantamax") selected.push("gigantamax");
  if (v.backgroundId) selected.push("background");
  if (v.size !== "normal") selected.push("size");
  if (v.legacyMove) selected.push("legacyMove");

  const problems = selected
    .map((attribute) => ({ attribute, ...map[attribute] }))
    .filter((p) => p.status !== "available");
  const status: AvailabilityStatus = problems.some((p) => p.status === "impossible")
    ? "impossible"
    : problems.length
      ? "unverified"
      : "available";
  return { status, problems };
}

/**
 * Normalizes a variant after a user toggles something: clears attributes that became impossible.
 * Unverified attributes are kept (the user may really own one) but will not be scored.
 */
export function sanitizeVariant(idx: CatalogIndex, v: VariantConfig): VariantConfig {
  const map = attributeAvailability(idx, v);
  if (!map) return v;
  const out = { ...v };
  if (out.shiny && map.shiny.status === "impossible") out.shiny = false;
  if (out.lucky && map.lucky.status === "impossible") out.lucky = false;
  if (out.shadowState === "shadow" && map.shadow.status === "impossible") out.shadowState = "none";
  if (out.shadowState === "purified" && map.purified.status === "impossible") out.shadowState = "none";
  if (out.maxState === "dynamax" && map.dynamax.status === "impossible") out.maxState = "none";
  if (out.maxState === "gigantamax" && map.gigantamax.status === "impossible") out.maxState = "none";
  if (out.size !== "normal" && map.size.status === "impossible") out.size = "normal";
  if (out.legacyMove && map.legacyMove.status === "impossible") out.legacyMove = false;
  return out;
}
