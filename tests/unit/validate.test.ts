import { describe, expect, it } from "vitest";
import { fixtureIndex, realIndex } from "./fixtures";
import { attributeAvailability, sanitizeVariant, validateVariant } from "@/domain/catalog/validate";
import { defaultVariant, parseVariantKey, variantKey, type VariantConfig } from "@/domain/catalog/variant";

const idx = fixtureIndex();
const v = (id: number, patch: Partial<VariantConfig> = {}, form?: string): VariantConfig => ({
  ...defaultVariant(id, form ?? idx.defaultForm(idx.getSpecies(id)!).id),
  ...patch,
});

describe("attribute validation", () => {
  it("rejects Lucky for untradable Mythicals but allows it for tradable ones", () => {
    expect(attributeAvailability(idx, v(5))!.lucky.status).toBe("impossible");
    expect(attributeAvailability(idx, v(10))!.lucky.status).toBe("available");
  });
  it("rejects Shadow + Lucky and Shadow + Max", () => {
    expect(validateVariant(idx, v(1, { shadowState: "shadow", lucky: true })).status).toBe("impossible");
    expect(validateVariant(idx, v(2, { shadowState: "shadow", maxState: "dynamax" })).status).toBe("impossible");
  });
  it("rejects Gigantamax / Dynamax / Shadow where not available", () => {
    expect(attributeAvailability(idx, v(1))!.gigantamax.status).toBe("impossible");
    expect(attributeAvailability(idx, v(1))!.dynamax.status).toBe("impossible");
    expect(attributeAvailability(idx, v(7))!.shadow.status).toBe("impossible");
    expect(attributeAvailability(idx, v(8))!.size.status).toBe("impossible");
  });
  it("rejects Shiny when the shiny was never released", () => {
    expect(attributeAvailability(idx, v(8))!.shiny.status).toBe("impossible");
  });
  it("marks Shiny costume, Shiny Max and Shiny Shadow as unverified unless curated", () => {
    expect(attributeAvailability(idx, v(3, {}, "COSTUMED_C_HOLIDAY_2016"))!.shiny.status).toBe("unverified");
    expect(attributeAvailability(idx, v(2, { maxState: "dynamax" }))!.shiny.status).toBe("unverified");
    expect(attributeAvailability(idx, v(1, { shadowState: "shadow" }))!.shiny.status).toBe("unverified");
    expect(attributeAvailability(idx, v(6, { maxState: "gigantamax" }))!.shiny.status).toBe("available");
  });
  it("accepts documented regional shiny", () => {
    expect(validateVariant(idx, v(3, { shiny: true }, "COSTUMED_ALOLA")).status).toBe("available");
  });
  it("rejects forms that belong to another species", () => {
    expect(validateVariant(idx, v(1, {}, "COSTUMED_ALOLA")).status).toBe("impossible");
  });
  it("sanitize clears impossible attributes but keeps unverified ones", () => {
    const s = sanitizeVariant(idx, v(1, { maxState: "gigantamax", shiny: true, shadowState: "shadow" }));
    expect(s.maxState).toBe("none");
    expect(s.shiny).toBe(true);
  });
  it("variant keys round-trip", () => {
    const x = v(6, { shiny: true, maxState: "gigantamax", backgroundId: "LC_TEST_SPECIAL_001", size: "xxl", legacyMove: true, lucky: true });
    expect(parseVariantKey(variantKey(x))).toEqual(x);
    expect(parseVariantKey("garbage")).toBeNull();
  });
});

describe("real catalog integrity", () => {
  const real = realIndex();
  it("has a complete released catalog, not a sample", () => {
    expect(real.species.length).toBeGreaterThanOrEqual(1000);
    expect(real.releasedSpecies().length).toBeGreaterThanOrEqual(900);
  });
  it("has unique species/form ids and a normal form for every species", () => {
    const forms = real.species.flatMap((s) => s.forms.map((f) => f.id));
    expect(new Set(forms).size).toBe(forms.length);
    expect(new Set(real.species.map((s) => s.id)).size).toBe(real.species.length);
    for (const s of real.species) expect(s.forms.some((f) => f.kind === "normal")).toBe(true);
  });
  it("every Gigantamax species is also Max capable and Mythicals are untradable unless curated", () => {
    for (const s of real.species) {
      if (s.flags.gigantamax) expect(s.flags.dynamax).toBe(true);
      if (s.class === "mythical") expect(s.flags.tradable).toBe(real.isTradableMythical(s.id));
    }
  });
  it("special forms can be selected (regional, costume)", () => {
    expect(real.getForm("VULPIX_ALOLA")?.form.kind).toBe("regional");
    expect(real.getSpecies(25)!.forms.filter((f) => f.kind === "costume").length).toBeGreaterThan(10);
  });
});

describe("curated research evidence", () => {
  const real = realIndex();
  it("every verified background link and curated form Shiny status points to a sourced evidence record", () => {
    let links = 0;
    for (const b of real.catalog.backgrounds) {
      if (!b.verifiedSpecies.length) continue;
      links += b.verifiedSpecies.length;
      expect(b.evidenceIds?.length).toBeGreaterThan(0);
      for (const id of b.evidenceIds!) expect(real.getEvidence(id)?.url).toMatch(/^https:\/\//);
      for (const sid of b.verifiedSpecies) expect(real.getSpecies(sid)?.released).toBe(true);
    }
    expect(links).toBeGreaterThan(100);
    for (const s of real.species) for (const f of s.forms) if (f.shinyEvidenceId) expect(real.getEvidence(f.shinyEvidenceId)?.url).toMatch(/^https:\/\//);
  });
  it("researched facts unlock real scores (e.g. Santa-hat Pikachu Shiny, Rayquaza with the GO Fest 2023 London background)", () => {
    const santa = { ...defaultVariant(25, "PIKACHU_C_HOLIDAY_2016"), shiny: true };
    expect(validateVariant(real, santa).status).toBe("available");
    const ray = { ...defaultVariant(384, "RAYQUAZA_NORMAL"), backgroundId: "LC_2023_LONDON_GOFEST_001" };
    expect(validateVariant(real, ray).status).toBe("available");
  });
});
