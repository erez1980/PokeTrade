import { describe, expect, it } from "vitest";
import { fixtureIndex, realIndex } from "./fixtures";
import { defaultVariant, variantKey, type VariantConfig } from "@/domain/catalog/variant";
import { compareResults, compareVariants, scoreSpecies, scoreVariant } from "@/domain/rarity/engine";
import { buildRankings, filterRankings } from "@/domain/rarity/rankings";
import { explainComparison, explainSingle, OUTCOME_HEADLINES } from "@/domain/rarity/explain";
import { FACTORS, THRESHOLDS } from "@/domain/rarity/config";

const idx = fixtureIndex();
const v = (id: number, patch: Partial<VariantConfig> = {}, form?: string): VariantConfig => ({
  ...defaultVariant(id, form ?? idx.defaultForm(idx.getSpecies(id)!).id),
  ...patch,
});

describe("rarity engine", () => {
  it("is deterministic for identical inputs", () => {
    const a = scoreVariant(idx, v(4, { shiny: true }));
    const b = scoreVariant(idx, v(4, { shiny: true }));
    expect(a).toEqual(b);
  });

  it("identical variants compare as equal with a centred meter", () => {
    const c = compareVariants(idx, v(2), v(2));
    expect(c.outcome).toBe("equal");
    expect(c.diff).toBe(0);
    expect(c.meterA).toBe(0.5);
  });

  it("comparison is antisymmetric when the sides are swapped", () => {
    const ab = compareVariants(idx, v(5), v(1));
    const ba = compareVariants(idx, v(1), v(5));
    expect(ab.outcome).toBe("a_much_rarer");
    expect(ba.outcome).toBe("b_much_rarer");
    expect(ab.diff).toBe(-ba.diff!);
    expect(ab.meterA! + ba.meterA!).toBeCloseTo(1);
  });

  it("meter position is derived only from the numeric scores", () => {
    const c = compareVariants(idx, v(4), v(3, {}, "COSTUMED_C_HOLIDAY_2016"));
    expect(c.meterA).toBeCloseTo(c.a.score! / (c.a.score! + c.b.score!));
  });

  it("never fabricates a score for unverified combinations", () => {
    const costumeShiny = scoreVariant(idx, v(3, { shiny: true }, "COSTUMED_C_HOLIDAY_2016"));
    expect(costumeShiny.score).toBeNull();
    expect(costumeShiny.confidence).toBe("insufficient");
    const unverifiedForm = scoreVariant(idx, v(3, {}, "COSTUMED_HISUIAN"));
    expect(unverifiedForm.score).toBeNull();
    const unverifiedBg = scoreVariant(idx, v(1, { backgroundId: "LC_TEST_SPECIAL_001" }));
    expect(unverifiedBg.score).toBeNull();
  });

  it("returns insufficient (not low) for unreleased species and impossible combinations", () => {
    expect(scoreVariant(idx, v(9)).score).toBeNull();
    const imp = scoreVariant(idx, v(5, { lucky: true })); // untradable mythical can't be Lucky
    expect(imp.variantStatus).toBe("impossible");
    expect(imp.score).toBeNull();
    const c = compareVariants(idx, v(9), v(1));
    expect(c.outcome).toBe("insufficient");
    expect(c.meterA).toBeNull();
  });

  it("missing evidence lowers confidence, it does not make a Pokémon 'common'", () => {
    const r = scoreVariant(idx, v(8));
    expect(r.score).not.toBeNull();
    expect(r.confidence).toBe("low");
  });

  it("does not double count overlapping factors (legendary + raid exclusive)", () => {
    const r = scoreVariant(idx, v(4));
    const counted = r.factors.filter((f) => f.counted && f.factor.group === "acquisition");
    expect(counted).toHaveLength(1);
    expect(r.score).toBe(FACTORS["ACQ.LEGENDARY"]!.points);
  });

  it("does not assume every Shiny beats every Legendary", () => {
    const commonShiny = scoreVariant(idx, v(1, { shiny: true }));
    const legend = scoreVariant(idx, v(4));
    expect(commonShiny.score!).toBeLessThan(legend.score!);
    // ...while a full-odds shiny of a non-nesting species is rarer than its normal form
    expect(scoreVariant(idx, v(2, { shiny: true })).score!).toBeGreaterThan(scoreVariant(idx, v(2)).score!);
  });

  it("uses boosted (smaller) shiny bonus for raid-only shinies", () => {
    const giga = scoreVariant(idx, v(6, { shiny: true }));
    expect(giga.factors.some((f) => f.factor.id === "SHINY.BOOSTED_ODDS" && f.counted)).toBe(true);
  });

  it("scores verified combos and verified backgrounds", () => {
    expect(scoreVariant(idx, v(6, { shiny: true, maxState: "gigantamax" })).score).not.toBeNull();
    const bg = scoreVariant(idx, v(2, { backgroundId: "LC_TEST_CITY_GOFEST_001" }));
    expect(bg.score).toBe(scoreVariant(idx, v(2)).score! + FACTORS["BG.LOCATION"]!.points);
  });

  it("regional exclusivity applies to the original form only", () => {
    expect(scoreVariant(idx, v(7)).factors.some((f) => f.factor.id === "DIST.REGIONAL")).toBe(true);
  });

  it("scores are clamped to 0..100", () => {
    const r = scoreVariant(idx, v(10, { shiny: true, lucky: true, size: "xxl", legacyMove: false }));
    expect(r.score!).toBeLessThanOrEqual(100);
    expect(r.score!).toBeGreaterThanOrEqual(0);
  });

  it("applies configurable thresholds and widens the 'equal' band for low confidence", () => {
    const base = scoreVariant(idx, v(2));
    const mk = (score: number, confidence: "high" | "low") => ({ ...base, score, confidence });
    expect(compareResults(mk(50, "high"), mk(44, "high")).outcome).toBe("a_rarer");
    expect(compareResults(mk(50, "low"), mk(44, "high")).outcome).toBe("equal");
    expect(compareResults(mk(50, "high"), mk(50 - THRESHOLDS.significant, "high")).outcome).toBe("a_much_rarer");
    expect(compareResults(mk(50, "high"), mk(47, "high"), { significant: 2, moderate: 1, lowConfidenceWidening: 1 }).outcome).toBe("a_much_rarer");
  });

  it("explains results in Hebrew and uses the exact insufficient-data text", () => {
    const c = compareVariants(idx, v(5), v(1));
    expect(explainComparison(c, "מיתי", "רגיל", "he")).toContain("נחשב נדיר יותר כי");
    expect(OUTCOME_HEADLINES[c.outcome].he).toBe("הפוקימון שלך נדיר בהרבה!");
    expect(explainSingle(scoreVariant(idx, v(9)), "x", "he")).toBe("אין מספיק מידע כדי לקבוע את רמת הנדירות בצורה אמינה.");
    expect(OUTCOME_HEADLINES.insufficient.he).toBe("אי אפשר לקבוע בוודאות מי יותר נדיר.");
    expect(OUTCOME_HEADLINES.equal.he).toBe("שני הפוקימונים בערך באותה רמת נדירות!");
  });
});

describe("rankings", () => {
  const r = buildRankings(idx, "2026-01-01");
  it("use the same scoring engine as comparisons", () => {
    for (const e of r.variants) expect(e.score).toBe(scoreVariant(idx, e.variant).score);
    for (const e of r.species) expect(e.score).toBe(scoreSpecies(idx, idx.getSpecies(e.variant.speciesId)!).score);
  });
  it("give ties the same rank and put insufficient data in an unranked section", () => {
    const ranked = r.variants.filter((e) => e.rank !== null);
    for (let i = 1; i < ranked.length; i++) {
      const a = ranked[i - 1]!;
      const b = ranked[i]!;
      expect(b.score!).toBeLessThanOrEqual(a.score!);
      if (a.score === b.score) expect(b.rank).toBe(a.rank);
      else expect(b.rank).toBe(i + 1);
    }
    const unranked = r.variants.filter((e) => e.rank === null);
    expect(unranked.length).toBeGreaterThan(0);
    expect(unranked.every((e) => e.score === null)).toBe(true);
    expect(r.variants.some((e) => e.variant.speciesId === 9)).toBe(false);
  });
  it("filters re-rank within the filtered view", () => {
    const shiny = filterRankings(r.variants, "shiny");
    expect(shiny.every((e) => e.variant.shiny)).toBe(true);
    expect(shiny.find((e) => e.rank !== null)?.rank).toBe(1);
    expect(filterRankings(r.variants, "gigantamax").every((e) => e.variant.maxState === "gigantamax")).toBe(true);
  });
  it("variant keys are unique", () => {
    expect(new Set(r.variants.map((e) => e.key)).size).toBe(r.variants.length);
  });
});

describe("rarity engine on the real catalog", () => {
  const real = realIndex();
  it("scores every released species (never throws) and every score is within range", () => {
    for (const s of real.releasedSpecies()) {
      const res = scoreSpecies(real, s);
      expect(res.score === null || (res.score >= 0 && res.score <= 100)).toBe(true);
    }
  });
  it("keeps sane orderings for well-known cases", () => {
    const sc = (id: number, p: Partial<VariantConfig> = {}) => scoreVariant(real, { ...defaultVariant(id, real.defaultForm(real.getSpecies(id)!).id), ...p }).score!;
    expect(sc(151)).toBeGreaterThan(sc(16)); // Mew > Pidgey
    expect(sc(150)).toBeGreaterThan(sc(25)); // Mewtwo > Pikachu
    expect(sc(6, { maxState: "gigantamax" })).toBeGreaterThan(sc(6)); // G-Max Charizard > Charizard
    expect(variantKey(defaultVariant(25, "PIKACHU_NORMAL"))).toBe("25|PIKACHU_NORMAL|||||||");
  });
});
