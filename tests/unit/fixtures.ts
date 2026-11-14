import { readFileSync } from "node:fs";
import path from "node:path";
import { Catalog, type PokemonSpecies } from "@/domain/catalog/schema";
import { CatalogIndex } from "@/domain/catalog/catalog-index";

/** The real, published catalog snapshot. */
export function realIndex(): CatalogIndex {
  const json = JSON.parse(readFileSync(path.join(__dirname, "../../public/data/catalog.json"), "utf8"));
  return new CatalogIndex(Catalog.parse(json));
}

type SpeciesInput = Partial<Omit<PokemonSpecies, "flags">> & { id: number; key: string; flags?: Partial<PokemonSpecies["flags"]> };

function sp(i: SpeciesInput): PokemonSpecies {
  return {
    name: { en: i.key, he: i.key },
    aliases: [],
    gen: 1,
    types: ["normal"],
    class: "standard",
    released: true,
    baby: false,
    family: i.id,
    forms: [{ id: `${i.key}_NORMAL`, name: { en: "Normal", he: "רגיל" }, kind: "normal", status: "available", shiny: i.flags?.shinyReleased === false ? "no" : "yes" }],
    ...i,
    flags: {
      shinyReleased: true,
      shinyChannels: ["wild"],
      shadow: false,
      nesting: false,
      raidExclusive: false,
      researchExclusive: false,
      photobombExclusive: false,
      regionalExclusive: null,
      dynamax: false,
      gigantamax: false,
      eliteMoves: [],
      sizeVariants: true,
      tradable: true,
      ...i.flags,
    },
  };
}

/**
 * Curated test dataset: common, legendary, mythical, shiny, costume, regional form,
 * Dynamax, Gigantamax, background, unknown/incompletely documented, unreleased.
 */
export function fixtureIndex(): CatalogIndex {
  const species: PokemonSpecies[] = [
    sp({ id: 1, key: "COMMON", flags: { nesting: true, shadow: true } }),
    sp({ id: 2, key: "PLAIN", flags: { shadow: true, dynamax: true } }),
    sp({
      id: 3,
      key: "COSTUMED",
      forms: [
        { id: "COSTUMED_NORMAL", name: { en: "Normal", he: "רגיל" }, kind: "normal", status: "available", shiny: "yes" },
        { id: "COSTUMED_C_HOLIDAY_2016", name: { en: "Holiday 2016", he: "חג 2016" }, kind: "costume", status: "available", shiny: "unknown", eventTag: "HOLIDAY_2016" },
        { id: "COSTUMED_ALOLA", name: { en: "Alola", he: "אלולה" }, kind: "regional", region: "alola", status: "available", shiny: "yes" },
        { id: "COSTUMED_HISUIAN", name: { en: "Hisuian", he: "היסוי" }, kind: "regional", region: "hisui", status: "unverified", shiny: "unknown" },
      ],
    }),
    sp({ id: 4, key: "LEGEND", class: "legendary", flags: { raidExclusive: true, shinyChannels: ["raid"], shadow: true } }),
    sp({ id: 5, key: "MYTHIC", class: "mythical", flags: { researchExclusive: true, shinyChannels: ["research"], tradable: false } }),
    sp({ id: 6, key: "GIGA", flags: { dynamax: true, gigantamax: true, shinyChannels: ["raid"] } }),
    sp({ id: 7, key: "REGIONAL", flags: { regionalExclusive: "Europe" } }),
    sp({ id: 8, key: "UNKNOWN", flags: { shinyReleased: false, shinyChannels: [], sizeVariants: false } }),
    sp({ id: 9, key: "UNRELEASED", released: false, flags: { shinyReleased: false, shinyChannels: [] } }),
    sp({ id: 10, key: "MELTANLIKE", class: "mythical", flags: { tradable: true, shinyChannels: ["research"] } }),
  ];
  const catalog = Catalog.parse({
    schemaVersion: 1,
    catalogVersion: "test.1",
    generatedAt: "2026-01-01T00:00:00.000Z",
    sources: [{ id: "game-master", name: "gm", url: "https://example.com/gm", license: "test", retrievedAt: "2026-01-01" }],
    evidence: [{ id: "EV.TEST", description: { en: "t", he: "t" }, sourceId: "game-master", confidence: "high", period: { asOf: "2026-01-01" } }],
    species,
    backgrounds: [
      { id: "LC_TEST_CITY_GOFEST_001", name: { en: "GO Fest City", he: "GO Fest" }, kind: "location", verifiedSpecies: [2], source: "game-master" },
      { id: "LC_TEST_SPECIAL_001", name: { en: "Special", he: "מיוחד" }, kind: "special", verifiedSpecies: [], source: "game-master" },
    ],
    verifiedCombos: [{ speciesId: 6, attributes: ["shiny", "gigantamax"], evidenceId: "EV.TEST" }],
    tradableMythicals: [10],
  });
  return new CatalogIndex(catalog);
}
