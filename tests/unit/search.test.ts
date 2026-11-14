import { describe, expect, it } from "vitest";
import { realIndex } from "./fixtures";
import { SearchIndex, isConfident } from "@/domain/search/search";
import { phoneticKey } from "@/domain/search/phonetic";
import { normalizeHebrew } from "@/domain/search/normalize";
import { transliterateToHebrew } from "@/domain/search/transliterate";

const idx = realIndex();
const si = new SearchIndex(idx);
const top = (q: string) => si.search(q)[0]?.species.name.en;

describe("search", () => {
  it.each([
    ["מיוטו", "Mewtwo"], ["מיו טו", "Mewtwo"], ["Mewtwo", "Mewtwo"], ["150", "Mewtwo"], ["#150", "Mewtwo"],
    ["פיקאצ'ו", "Pikachu"], ["פיקאצו", "Pikachu"], ["פיקאצ׳ו", "Pikachu"],
    ["רייקוואזה", "Rayquaza"], ["ראיקוואזה", "Rayquaza"],
    ["צ'רמנדר", "Charmander"], ["צרמנדר", "Charmander"], ["סנורלקס", "Snorlax"], ["לוקריו", "Lucario"],
    ["pikachoo", "Pikachu"], ["mewtoo", "Mewtwo"], ["charzard", "Charizard"], ["dragonit", "Dragonite"],
    ["eevee", "Eevee"], ["איבי", "Eevee"], ["ho-oh", "Ho-Oh"], ["הו או", "Ho-Oh"], ["pika", "Pikachu"],
  ])("%s -> %s", (q, expected) => {
    expect(top(q)).toBe(expected);
  });

  it("finds every released species by English name and by Pokédex number", () => {
    for (const s of idx.releasedSpecies()) {
      expect(si.search(String(s.id))[0]?.species.id).toBe(s.id);
      const hits = si.search(s.name.en, { limit: 3 });
      expect(hits.map((h) => h.species.id)).toContain(s.id);
    }
  });

  it("finds every released species by its Hebrew display name", () => {
    let misses = 0;
    for (const s of idx.releasedSpecies()) if (!si.search(s.name.he, { limit: 3 }).some((h) => h.species.id === s.id)) misses++;
    expect(misses).toBe(0);
  });

  it("resolves regional form words", () => {
    const h = si.search("וולפיקס אלולה")[0]!;
    expect(h.species.name.en).toBe("Vulpix");
    expect(h.form?.id).toBe("VULPIX_ALOLA");
    expect(si.search("alolan vulpix")[0]?.form?.id).toBe("VULPIX_ALOLA");
  });

  it("returns nothing for gibberish and does not claim confidence on ambiguity", () => {
    expect(si.search("zzzzqqqq")).toHaveLength(0);
    expect(isConfident(si.search("מיו"))).toBe(false);
  });

  it("hides unreleased species unless asked", () => {
    const unreleased = idx.species.find((s) => !s.released)!;
    expect(si.search(String(unreleased.id))).toHaveLength(0);
    expect(si.search(String(unreleased.id), { includeUnreleased: true })[0]?.species.id).toBe(unreleased.id);
  });

  it("phonetic keys match Hebrew and English spellings", () => {
    expect(phoneticKey("רייקוואזה")).toBe(phoneticKey("Rayquaza"));
    expect(phoneticKey("פיקאצ'ו")).toBe(phoneticKey("Pikachu"));
    expect(phoneticKey("צ'רמנדר")).toBe(phoneticKey("Charmander"));
    expect(normalizeHebrew("פִּיקָאצ׳וּ")).toBe("פיקאצ'ו");
  });

  it("transliterates any English name to Hebrew letters", () => {
    for (const s of idx.species) expect(transliterateToHebrew(s.name.en)).toMatch(/[א-ת]/);
  });
});
